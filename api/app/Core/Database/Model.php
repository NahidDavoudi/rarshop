<?php
namespace App\Core\Database;

use PDO;
use PDOException;

abstract class Model
{
    protected PDO $pdo;
    protected string $table;
    protected string $primaryKey = 'id';
    protected array $fillable = [];
    protected array $hidden = [];
    protected bool $timestamps = true;
    protected string $createdAt = 'created_at';
    protected string $updatedAt = 'updated_at';

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public function getTable(): string
    {
        return $this->table;
    }

    protected function assertColumn(string $column): string
    {
        if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $column)) {
            throw new \InvalidArgumentException('نام ستون نامعتبر است.');
        }
        return $column;
    }

    public function find(int|string $id): ?array
    {
        $sql = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = :id LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function findBy(string $column, mixed $value): ?array
    {
        $column = $this->assertColumn($column);
        $sql = "SELECT * FROM {$this->table} WHERE {$column} = :value LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['value' => $value]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    public function all(array $orderBy = []): array
    {
        $sql = "SELECT * FROM {$this->table}";

        if (!empty($orderBy)) {
            $orderClauses = [];
            foreach ($orderBy as $column => $direction) {
                $column = $this->assertColumn($column);
                $direction = strtoupper((string) $direction) === 'DESC' ? 'DESC' : 'ASC';
                $orderClauses[] = "{$column} {$direction}";
            }
            $sql .= " ORDER BY " . implode(', ', $orderClauses);
        }

        $stmt = $this->pdo->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function paginate(int $page = 1, int $perPage = 15, array $conditions = [], array $orderBy = []): array
    {
        $page = max(1, (int) $page);
        $perPage = max(1, min(100, (int) $perPage));
        $offset = ($page - 1) * $perPage;

        $where = '';
        $params = [];
        if (!empty($conditions)) {
            $whereClauses = [];
            foreach ($conditions as $column => $value) {
                $column = $this->assertColumn($column);
                $whereClauses[] = "{$column} = :{$column}";
                $params[$column] = $value;
            }
            $where = 'WHERE ' . implode(' AND ', $whereClauses);
        }

        $countSql = "SELECT COUNT(*) FROM {$this->table} {$where}";
        $countStmt = $this->pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $sql = "SELECT * FROM {$this->table} {$where}";

        if (!empty($orderBy)) {
            $orderClauses = [];
            foreach ($orderBy as $column => $direction) {
                $column = $this->assertColumn($column);
                $direction = strtoupper((string) $direction) === 'DESC' ? 'DESC' : 'ASC';
                $orderClauses[] = "{$column} {$direction}";
            }
            $sql .= " ORDER BY " . implode(', ', $orderClauses);
        }

        $sql .= " LIMIT :limit OFFSET :offset";
        $params['limit'] = $perPage;
        $params['offset'] = $offset;

        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $key => $value) {
            $type = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
            $stmt->bindValue($key, $value, $type);
        }

        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => (int)ceil($total / $perPage)
        ];
    }

    public function create(array $data)
    {
        $data = $this->filterFillable($data);
        if ($this->timestamps) {
            $data[$this->createdAt] = date('Y-m-d H:i:s');
            $data[$this->updatedAt] = date('Y-m-d H:i:s');
        }
        $columns = implode(', ', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));
        $sql = "INSERT INTO {$this->table} ({$columns}) VALUES ({$placeholders})";
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($data);
        } catch (PDOException $e) {
            if ($e->getCode() == '23000' && strpos($e->getMessage(), '1062 Duplicate entry') !== false) {
                preg_match("/for key '([^']+)'/", $e->getMessage(), $matches);
                $key = $matches[1] ?? null;
                if ($key && (stripos($key, 'phone') !== false)) {
                    throw new \Exception('شماره تلفن یا نام کاربری تکراری است و قبلا ثبت شده است.');
                } else {
                    throw new \Exception('رکورد با این مقدار از قبل وجود دارد.');
                }
            }
            throw $e;
        }

        return (int)$this->pdo->lastInsertId();
    }

    public function update(int|string $id, array $data): bool
    {
        $data = $this->filterFillable($data);

        if ($this->timestamps) {
            $data[$this->updatedAt] = date('Y-m-d H:i:s');
        }

        $setClauses = [];
        foreach ($data as $column => $value) {
            $this->assertColumn($column);
            $setClauses[] = "{$column} = :{$column}";
        }

        $data['id'] = $id;
        $sql = "UPDATE {$this->table} SET " . implode(', ', $setClauses) .
            " WHERE {$this->primaryKey} = :id";

        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($data);
    }

    public function delete(int|string $id): bool
    {
        $sql = "DELETE FROM {$this->table} WHERE {$this->primaryKey} = :id";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    public function softDelete(int|string $id): bool
    {
        return $this->update($id, ['deleted_at' => date('Y-m-d H:i:s')]);
    }

    public function exists(string $column, mixed $value, ?int $excludeId = null): bool
    {
        $column = $this->assertColumn($column);
        $sql = "SELECT COUNT(*) FROM {$this->table} WHERE {$column} = :value";
        $params = ['value' => $value];

        if ($excludeId) {
            $sql .= " AND {$this->primaryKey} != :exclude_id";
            $params['exclude_id'] = (int) $excludeId;
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return (bool)$stmt->fetchColumn();
    }

    public function count(array $conditions = []): int
    {
        $where = '';
        $params = [];

        if (!empty($conditions)) {
            $whereClauses = [];
            foreach ($conditions as $column => $value) {
                $column = $this->assertColumn($column);
                $whereClauses[] = "{$column} = :{$column}";
                $params[$column] = $value;
            }
            $where = 'WHERE ' . implode(' AND ', $whereClauses);
        }

        $sql = "SELECT COUNT(*) FROM {$this->table} {$where}";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return (int)$stmt->fetchColumn();
    }

    protected function filterFillable(array $data): array
    {
        if (empty($this->fillable)) {
            return $data;
        }
        return array_intersect_key($data, array_flip($this->fillable));
    }
}
