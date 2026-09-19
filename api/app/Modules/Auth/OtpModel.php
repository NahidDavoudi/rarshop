<?php

namespace App\Modules\Auth;

use App\Core\Database\Model;

class OtpModel extends Model
{
    protected string $table = 'otp_codes';
    protected array $fillable = [
        'phone',
        'code',
        'purpose',
        'attempts',
        'max_attempts',
        'expires_at',
        'verified_at',
        'created_at',
    ];
    protected bool $timestamps = false;

    public function countRecentRequests(string $phone, int $minutes = 10): int
    {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM {$this->table}
            WHERE phone = ?
              AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
        ");
        $stmt->execute([$phone, $minutes]);

        return (int) $stmt->fetchColumn();
    }

    public function invalidatePending(string $phone, string $purpose): void
    {
        $stmt = $this->pdo->prepare("
            DELETE FROM {$this->table}
            WHERE phone = ?
              AND purpose = ?
              AND verified_at IS NULL
        ");
        $stmt->execute([$phone, $purpose]);
    }

    public function createOtp(string $phone, string $code, string $purpose, int $ttlSeconds = 120): int
    {
        return (int) $this->create([
            'phone'        => $phone,
            'code'         => $code,
            'purpose'      => $purpose,
            'attempts'     => 0,
            'max_attempts' => 5,
            'expires_at'   => date('Y-m-d H:i:s', time() + $ttlSeconds),
            'created_at'   => date('Y-m-d H:i:s'),
        ]);
    }

    public function findActiveOtp(string $phone, string $purpose): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE phone = ?
              AND purpose = ?
              AND verified_at IS NULL
              AND expires_at > NOW()
            ORDER BY id DESC
            LIMIT 1
        ");
        $stmt->execute([$phone, $purpose]);
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    public function incrementAttempts(int $id): void
    {
        $stmt = $this->pdo->prepare("
            UPDATE {$this->table}
            SET attempts = attempts + 1
            WHERE id = ?
        ");
        $stmt->execute([$id]);
    }

    public function markVerified(int $id): void
    {
        $stmt = $this->pdo->prepare("
            UPDATE {$this->table}
            SET verified_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$id]);
    }
}
