<?php

namespace App\Modules\Users;
use App\Core\Database\Model;

class UsersModel extends Model
{
    protected string $table = 'users';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'name',
        'phone',
        'password_hash',
        'role',
        'is_active',
    ];
    protected array $hidden = ['password_hash'];
    protected bool $timestamps = true;

    public function create(array $data): int
    {
        if (isset($data['password'])) {
            $data['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
            unset($data['password']);
        }
        return parent::create($data);
    }

    public function update(int|string $id, array $data): bool
    {
        if (isset($data['password'])) {
            $data['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
            unset($data['password']);
        }
        return parent::update($id, $data);
    }

    public function findByPhone(string $phone): ?array
    {
        return $this->findBy('phone', $phone);
    }

    public function findByEmail(string $email): ?array
    {
        return $this->findBy('email', $email);
    }

    public function phoneExists(string $phone, ?int $excludeId = null): bool
    {
        return $this->exists('phone', $phone, $excludeId);
    }

    public function getActiveUsers(): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM {$this->table} WHERE is_active = 1 ORDER BY created_at DESC"
        );
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getAdmins(): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM {$this->table} WHERE role = 'admin' AND is_active = 1"
        );
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function deactivate(int $id): bool
    {
        return parent::update($id, ['is_active' => 0]);
    }

    public function activate(int $id): bool
    {
        return parent::update($id, ['is_active' => 1]);
    }
}
