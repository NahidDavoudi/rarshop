<?php

namespace App\Modules\Auth;

use App\Core\Database\Database;

class LoginRateLimiter
{
    private const MAX_ATTEMPTS = 5;
    private const DECAY_SECONDS = 900;

    public function tooManyAttempts(string $scope, string $phone): bool
    {
        $this->purgeExpired();

        $stmt = Database::getInstance()->getConnection()->prepare(
            'SELECT attempts FROM login_attempts WHERE attempt_key = ? AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute([$this->key($scope, $phone)]);
        $row = $stmt->fetch();

        return $row && (int) $row['attempts'] >= self::MAX_ATTEMPTS;
    }

    public function hit(string $scope, string $phone): void
    {
        $this->purgeExpired();

        $key = $this->key($scope, $phone);
        $db = Database::getInstance()->getConnection();

        $stmt = $db->prepare(
            'SELECT id, attempts FROM login_attempts WHERE attempt_key = ? AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute([$key]);
        $row = $stmt->fetch();

        if ($row) {
            $update = $db->prepare('UPDATE login_attempts SET attempts = attempts + 1 WHERE id = ?');
            $update->execute([(int) $row['id']]);
            return;
        }

        $insert = $db->prepare(
            'INSERT INTO login_attempts (attempt_key, attempts, expires_at) VALUES (?, 1, DATE_ADD(NOW(), INTERVAL ? SECOND))'
        );
        $insert->execute([$key, self::DECAY_SECONDS]);
    }

    public function clear(string $scope, string $phone): void
    {
        $stmt = Database::getInstance()->getConnection()->prepare(
            'DELETE FROM login_attempts WHERE attempt_key = ?'
        );
        $stmt->execute([$this->key($scope, $phone)]);
    }

    private function key(string $scope, string $phone): string
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        return hash('sha256', $scope . '|' . $phone . '|' . $ip);
    }

    private function purgeExpired(): void
    {
        Database::getInstance()->getConnection()->exec('DELETE FROM login_attempts WHERE expires_at <= NOW()');
    }
}
