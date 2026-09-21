<?php
namespace App\Core\Auth;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Core\Env;

class Auth {
    private static string $algorithm = 'HS256';

    private static ?object $currentUser = null;

    public static function setCurrentUser(object $user): void {
        self::$currentUser = $user;
    }

    private static function getRefreshSecretKey(): string {
        return Env::get('REFRESH_SECRET');
    }

    private static function getSecretKey(): string
    {
        return Env::get('JWT_SECRET');
    }

    private static function newJti(): string
    {
        return bin2hex(random_bytes(32));
    }

    public static function generateToken(array $payload, int $expireInSeconds = 86400): string {
        $issuedAt = time();
        $jti = self::newJti();
        $tokenPayload = [
            'iat'  => $issuedAt,
            'exp'  => $issuedAt + $expireInSeconds,
            'jti'  => $jti,
            'data' => $payload,
        ];
        return JWT::encode($tokenPayload, self::getSecretKey(), self::$algorithm);
    }

    public static function verifyToken(?string $token, bool $isRefresh = false): ?object {
        if (empty($token)) {
            throw new \InvalidArgumentException('توکن احراز هویت ارسال نشده است');
        }
        $secret = $isRefresh ? self::getRefreshSecretKey() : self::getSecretKey();
        $decoded = JWT::decode($token, new Key($secret, self::$algorithm));

        if (isset($decoded->jti) && TokenBlacklist::isBlacklisted($decoded->jti)) {
            throw new \RuntimeException('توکن باطل شده است', 401);
        }

        $data = $decoded->data ?? null;
        if ($data !== null) {
            if (isset($data->user_id)) {
                $data->user_id = (int) $data->user_id;
            }
            if (isset($data->role)) {
                $data->role = (string) $data->role;
            }
        }

        return $decoded;
    }

    public static function generateRefreshToken(int $userId, array $payload): array
    {
        $jti = self::newJti();
        $issuedAt = time();
        $expiresAt = $issuedAt + 2592000;

        $tokenPayload = [
            'iat'  => $issuedAt,
            'exp'  => $expiresAt,
            'data' => $payload,
            'jti'  => $jti,
            'sub'  => $userId,
        ];

        $refreshToken = JWT::encode($tokenPayload, self::getRefreshSecretKey(), self::$algorithm);

        $db = \App\Core\Database\Database::getInstance()->getConnection();
        $stmt = $db->prepare("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([
            $userId,
            hash('sha256', $jti),
            date('Y-m-d H:i:s', $expiresAt),
        ]);

        return [
            'token'      => $refreshToken,
            'expires_in' => 2592000,
        ];
    }

    public static function rotateRefreshToken(string $refreshToken): ?array {
        try {
            $decoded = self::verifyToken($refreshToken, true);
        } catch (\Throwable) {
            return null;
        }
        if (!$decoded) return null;

        $userId = $decoded->sub ?? null;
        $jti    = $decoded->jti ?? null;
        if (!$userId || !$jti) return null;

        $db = \App\Core\Database\Database::getInstance()->getConnection();

        $stmt = $db->prepare("SELECT id FROM refresh_tokens WHERE token_hash = ? AND expires_at > NOW()");
        $stmt->execute([hash('sha256', $jti)]);
        $existing = $stmt->fetch();

        if (!$existing) {
            $db->prepare("DELETE FROM refresh_tokens WHERE user_id = ?")->execute([$userId]);
            return null;
        }

        TokenBlacklist::add($jti, (int) $userId, 'refresh', (int) $decoded->exp, 'rotation');
        $db->prepare("DELETE FROM refresh_tokens WHERE id = ?")->execute([$existing['id']]);

        $payload = (array) ($decoded->data ?? []);
        $role = $payload['role'] ?? 'user';
        $accessTtl = $role === 'admin' ? 3600 : 900;

        $accessToken = self::generateToken($payload, $accessTtl);
        $refresh = self::generateRefreshToken((int) $userId, $payload);

        return [
            'token'         => $accessToken,
            'refresh_token' => $refresh['token'],
            'token_type'    => 'Bearer',
            'expires_in'    => $accessTtl,
        ];
    }

    public static function user(): ?object {
        return self::$currentUser;
    }

    public static function id(): ?int {
        return self::$currentUser->user_id ?? null;
    }

    public static function role(): ?string {
        return self::$currentUser->role ?? null;
    }

    public static function check(): bool {
        return self::$currentUser !== null;
    }

    public static function hasRole(string|array $roles): bool {
        if (!self::$currentUser || !isset(self::$currentUser->role)) {
            return false;
        }
        if (is_string($roles)) {
            return self::$currentUser->role === $roles;
        }
        return in_array(self::$currentUser->role, $roles);
    }

    public static function revokeRefreshToken(string $refreshToken): void {
        try {
            $decoded = self::verifyToken($refreshToken, true);
        } catch (\Throwable) {
            return;
        }
        if ($decoded && isset($decoded->jti)) {
            $db = \App\Core\Database\Database::getInstance()->getConnection();
            $stmt = $db->prepare("DELETE FROM refresh_tokens WHERE token_hash = ?");
            $stmt->execute([hash('sha256', $decoded->jti)]);
            TokenBlacklist::add(
                $decoded->jti,
                (int) ($decoded->sub ?? 0),
                'refresh',
                (int) ($decoded->exp ?? time()),
                'logout'
            );
        }
    }

    public static function revokeAccessToken(string $accessToken): void
    {
        try {
            $decoded = self::verifyToken($accessToken, false);
        } catch (\Throwable) {
            return;
        }
        if ($decoded && isset($decoded->jti)) {
            TokenBlacklist::add(
                $decoded->jti,
                (int) ($decoded->data->user_id ?? 0),
                'access',
                (int) ($decoded->exp ?? time()),
                'logout'
            );
        }
    }

    public static function revokeAllUserTokens(int $userId): void {
        $db = \App\Core\Database\Database::getInstance()->getConnection();
        $db->prepare("DELETE FROM refresh_tokens WHERE user_id = ?")->execute([$userId]);
    }
}
