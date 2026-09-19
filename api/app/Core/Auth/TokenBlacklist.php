<?php

namespace App\Core\Auth;

use App\Core\Database\Database;

class TokenBlacklist
{
    public static function add(string $jti, int $userId, string $tokenType, int $expiresAt, ?string $reason = null): void
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            'INSERT INTO token_blacklist (jti_hash, user_id, token_type, reason, expires_at)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)'
        );
        $stmt->execute([
            hash('sha256', $jti),
            $userId ?: null,
            $tokenType,
            $reason,
            date('Y-m-d H:i:s', $expiresAt),
        ]);
    }

    public static function isBlacklisted(string $jti): bool
    {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            'SELECT id FROM token_blacklist WHERE jti_hash = ? AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute([hash('sha256', $jti)]);

        return (bool) $stmt->fetch();
    }

    public static function purgeExpired(): void
    {
        Database::getInstance()->getConnection()
            ->exec('DELETE FROM token_blacklist WHERE expires_at <= NOW()');
    }
}
