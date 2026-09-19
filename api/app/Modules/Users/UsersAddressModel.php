<?php

namespace App\Modules\Users;

use App\Core\Database\Model;
use App\Core\Logger;
class UsersAddressModel extends Model
{
    protected string $table = 'addresses';
    protected bool $timestamps = false;
    protected array $fillable = [
        'user_id',
        'address',
        'city',
        'title',
        'province',
        'postal_code',
        'receiver',
        'phone',
        'is_default'	    
        ];
    public function getByUserId(int $userId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table} WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }
    
public function belongsToUser(int $addressId, int $userId): bool
    {
        // ساده‌ترین و مطمئن‌ترین روش
        $stmt = $this->pdo->prepare("
            SELECT id FROM {$this->table}
            WHERE id = ? AND user_id = ?
            LIMIT 1
        ");
        $stmt->execute([$addressId, $userId]);
        $result = $stmt->fetch();
        
        // لاگ برای دیباگ (اختیاری)
        if (!$result) {
            Logger::debug('address_not_belong_to_user', [
                'address_id' => $addressId,
                'user_id' => $userId
            ]);
        }
        
        return (bool) $result;
    }
    
    public function countByUserId(int $userId): int
    {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM {$this->table} WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        return (int) $stmt->fetchColumn();
    }

    public function clearDefaultForUser(int $userId, ?int $exceptId = null): void
    {
        if ($exceptId !== null) {
            $stmt = $this->pdo->prepare("
                UPDATE {$this->table} SET is_default = 0
                WHERE user_id = ? AND id != ?
            ");
            $stmt->execute([$userId, $exceptId]);
            return;
        }

        $stmt = $this->pdo->prepare("
            UPDATE {$this->table} SET is_default = 0 WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
    }
    public function deleteAddress($aid, $uid): void
    {
        $stmt = $this->pdo->prepare("DELETE FROM `addresses` WHERE id = ? AND user_id = ?");
        $stmt->execute([$aid , $uid]);
        return;
        
    }
}
