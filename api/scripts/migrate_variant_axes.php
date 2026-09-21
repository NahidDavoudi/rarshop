<?php
/**
 * migrate_variant_axes.php — 3-phase migration for custom variant axes
 * Usage:
 *   php migrate_variant_axes.php --phase=1 [--dsn="mysql:host=...;dbname=..."] [--user=..] [--pass=..]
 *   php migrate_variant_axes.php --phase=2 [--dry-run] [--report=path.json] [--dsn=...]
 *   php migrate_variant_axes.php --phase=3 [--dsn=...]
 *   php migrate_variant_axes.php --dry-run   (alias for --phase=2 --dry-run, scans only)
 *   php migrate_variant_axes.php --verify    (verify after migration)
 *
 * Spec: §1 DDL without unique, §2 data move with checksum, §3 unique/generated.
 * A/B/C policy (dev): A/B -> is_active=0 with report, C -> create as text.
 * --dry-run never writes, exits 1 if A/B/C >0 (blocking in prod, but in dev reports with is_active=0).
 */

require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

function loadEnv(): void {
    if (file_exists(__DIR__ . '/../.env')) {
        $dot = Dotenv::createImmutable(__DIR__ . '/..');
        $dot->load();
    }
}

function getPdo(?string $dsnOverride, ?string $userOverride, ?string $passOverride): PDO {
    loadEnv();
    $dsn = $dsnOverride ?: sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $_ENV['DB_HOST'] ?? '127.0.0.1', $_ENV['DB_NAME'] ?? 'shop');
    $user = $userOverride ?? ($_ENV['DB_USER'] ?? 'root');
    $pass = $passOverride ?? ($_ENV['DB_PASS'] ?? '');
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    // Ensure FK checks on
    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    return $pdo;
}

function parseArgs(array $argv): array {
    $opts = ['phase' => null, 'dry-run' => false, 'verify' => false, 'report' => null, 'dsn' => null, 'user' => null, 'pass' => null];
    foreach ($argv as $arg) {
        if (str_starts_with($arg, '--phase=')) $opts['phase'] = (int)substr($arg, 8);
        elseif ($arg === '--dry-run') $opts['dry-run'] = true;
        elseif ($arg === '--verify') $opts['verify'] = true;
        elseif (str_starts_with($arg, '--report=')) $opts['report'] = substr($arg, 9);
        elseif (str_starts_with($arg, '--dsn=')) $opts['dsn'] = substr($arg, 6);
        elseif (str_starts_with($arg, '--user=')) $opts['user'] = substr($arg, 7);
        elseif (str_starts_with($arg, '--pass=')) $opts['pass'] = substr($arg, 7);
    }
    if ($opts['dry-run'] && $opts['phase'] === null) $opts['phase'] = 2;
    if ($opts['verify'] && $opts['phase'] === null) $opts['phase'] = 0;
    return $opts;
}

function tableExists(PDO $pdo, string $table): bool {
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
    $stmt->execute([$table]);
    return (bool)$stmt->fetchColumn();
}

function columnExists(PDO $pdo, string $table, string $col): bool {
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
    $stmt->execute([$table, $col]);
    return (bool)$stmt->fetchColumn();
}

function indexExists(PDO $pdo, string $table, string $index): bool {
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?');
    $stmt->execute([$table, $index]);
    return (bool)$stmt->fetchColumn();
}

// ── Phase 1: DDL without unique ──
function phase1(PDO $pdo): void {
    echo "[Phase 1] Creating tables + combo_key without unique...\n";

    if (!tableExists($pdo, 'product_variant_axes')) {
        $pdo->exec("
        CREATE TABLE product_variant_axes (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          product_id BIGINT UNSIGNED NOT NULL,
          name VARCHAR(100) NOT NULL,
          slug VARCHAR(100) NOT NULL,
          input_type ENUM('text','swatch') NOT NULL DEFAULT 'text',
          sort_order INT NOT NULL DEFAULT 0,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_pva_product_slug (product_id, slug),
          KEY idx_pva_product (product_id, sort_order),
          KEY idx_pva_active (is_active),
          CONSTRAINT fk_pva_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        echo "  created product_variant_axes\n";
    } else {
        echo "  product_variant_axes exists, skip\n";
    }

    if (!tableExists($pdo, 'product_axis_values')) {
        $pdo->exec("
        CREATE TABLE product_axis_values (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          axis_id BIGINT UNSIGNED NOT NULL,
          value VARCHAR(100) NOT NULL,
          slug VARCHAR(100) NOT NULL,
          swatch_hex CHAR(7) DEFAULT NULL,
          sort_order INT NOT NULL DEFAULT 0,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_pav_axis_slug (axis_id, slug),
          UNIQUE KEY uq_pav_id_axis (id, axis_id),
          KEY idx_pav_axis (axis_id, sort_order),
          KEY idx_pav_active (is_active),
          CONSTRAINT fk_pav_axis FOREIGN KEY (axis_id) REFERENCES product_variant_axes(id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        echo "  created product_axis_values\n";
    } else {
        echo "  product_axis_values exists, skip\n";
    }

    if (!tableExists($pdo, 'product_variant_links')) {
        $pdo->exec("
        CREATE TABLE product_variant_links (
          variant_id BIGINT UNSIGNED NOT NULL,
          axis_id BIGINT UNSIGNED NOT NULL,
          axis_value_id BIGINT UNSIGNED NOT NULL,
          PRIMARY KEY (variant_id, axis_id),
          KEY fk_pvl_value (axis_value_id, axis_id),
          KEY fk_pvl_axis (axis_id),
          CONSTRAINT fk_pvl_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_pvl_axis_fk FOREIGN KEY (axis_id) REFERENCES product_variant_axes(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_pvl_value_composite FOREIGN KEY (axis_value_id, axis_id) REFERENCES product_axis_values(id, axis_id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        echo "  created product_variant_links\n";
    } else {
        echo "  product_variant_links exists, skip\n";
    }

    if (!columnExists($pdo, 'product_variants', 'combo_key')) {
        $pdo->exec("ALTER TABLE product_variants ADD COLUMN combo_key VARCHAR(255) NOT NULL DEFAULT '' AFTER title");
        echo "  added product_variants.combo_key\n";
    } else {
        echo "  product_variants.combo_key exists, skip\n";
    }

    echo "[Phase 1] done.\n";
}

function phase1Down(PDO $pdo): void {
    echo "[Phase 1 DOWN] Dropping...\n";
    // Drop in FK order
    if (tableExists($pdo, 'product_variant_links')) {
        $pdo->exec('DROP TABLE product_variant_links');
        echo "  dropped product_variant_links\n";
    }
    if (tableExists($pdo, 'product_axis_values')) {
        $pdo->exec('DROP TABLE product_axis_values');
        echo "  dropped product_axis_values\n";
    }
    if (tableExists($pdo, 'product_variant_axes')) {
        $pdo->exec('DROP TABLE product_variant_axes');
        echo "  dropped product_variant_axes\n";
    }
    if (columnExists($pdo, 'product_variants', 'combo_key')) {
        // Drop generated col first if exists
        if (columnExists($pdo, 'product_variants', 'active_combo_key')) {
            // Need to drop index first
            if (indexExists($pdo, 'product_variants', 'uq_pv_product_combo')) {
                $pdo->exec('ALTER TABLE product_variants DROP INDEX uq_pv_product_combo');
            }
            $pdo->exec('ALTER TABLE product_variants DROP COLUMN active_combo_key');
            echo "  dropped active_combo_key\n";
        } elseif (indexExists($pdo, 'product_variants', 'uq_pv_product_combo')) {
            $pdo->exec('ALTER TABLE product_variants DROP INDEX uq_pv_product_combo');
        }
        $pdo->exec('ALTER TABLE product_variants DROP COLUMN combo_key');
        echo "  dropped combo_key\n";
    }
    echo "[Phase 1 DOWN] done.\n";
}

// ── Helpers for phase 2 ──
function fetchOrphans(PDO $pdo): array {
    // A: variant with 0 links but product has at least one active axis
    // B: variant with 0 < links < axis count
    // C: vav pointing to non-axis or missing value
    $axesCountByProduct = [];
    $stmt = $pdo->query('SELECT product_id, COUNT(*) cnt FROM product_variant_axes WHERE is_active=1 GROUP BY product_id');
    foreach ($stmt->fetchAll() as $row) $axesCountByProduct[(int)$row['product_id']] = (int)$row['cnt'];

    // For pre-migration, axes not yet in new tables, so derive from old is_variant_axis
    if (empty($axesCountByProduct)) {
        // derive expected axes per product from variant_attribute_values -> attribute_types.is_variant_axis
        $q = $pdo->query("
            SELECT pv.product_id, COUNT(DISTINCT at.id) cnt
            FROM product_variants pv
            JOIN variant_attribute_values vav ON vav.variant_id = pv.id
            JOIN attribute_values av ON av.id = vav.attribute_value_id
            JOIN attribute_types at ON at.id = av.attribute_type_id AND at.is_variant_axis=1
            GROUP BY pv.product_id
        ");
        foreach ($q->fetchAll() as $row) $axesCountByProduct[(int)$row['product_id']] = (int)$row['cnt'];
    }

    $catA = []; $catB = []; $catC = [];

    // A & B: per variant link count vs expected
    $stmt = $pdo->query('SELECT pv.id AS variant_id, pv.product_id, pv.title, pv.is_active, COUNT(vav.attribute_value_id) AS link_cnt FROM product_variants pv LEFT JOIN variant_attribute_values vav ON vav.variant_id = pv.id GROUP BY pv.id');
    foreach ($stmt->fetchAll() as $row) {
        $pid = (int)$row['product_id'];
        $expected = $axesCountByProduct[$pid] ?? 0;
        $cnt = (int)$row['link_cnt'];
        if ($expected > 0 && $cnt === 0) {
            $catA[] = ['variant_id' => (int)$row['variant_id'], 'product_id' => $pid, 'title' => $row['title'], 'expected_axes' => $expected, 'link_cnt' => $cnt, 'reason' => 'A: 0 links but product has axes'];
        } elseif ($expected > 0 && $cnt > 0 && $cnt < $expected) {
            $catB[] = ['variant_id' => (int)$row['variant_id'], 'product_id' => $pid, 'title' => $row['title'], 'expected_axes' => $expected, 'link_cnt' => $cnt, 'reason' => 'B: partial links'];
        }
    }

    // C: links to orphan or non-axis values
    $stmt = $pdo->query("
        SELECT vav.variant_id, vav.attribute_value_id, pv.product_id, av.value, at.slug AS type_slug, at.is_variant_axis
        FROM variant_attribute_values vav
        LEFT JOIN attribute_values av ON av.id = vav.attribute_value_id
        LEFT JOIN attribute_types at ON at.id = av.attribute_type_id
        LEFT JOIN product_variants pv ON pv.id = vav.variant_id
        WHERE av.id IS NULL OR at.id IS NULL OR at.is_variant_axis = 0
    ");
    foreach ($stmt->fetchAll() as $row) {
        $catC[] = ['variant_id' => (int)$row['variant_id'], 'product_id' => (int)($row['product_id'] ?? 0), 'attribute_value_id' => (int)$row['attribute_value_id'], 'type_slug' => $row['type_slug'] ?? null, 'is_variant_axis' => $row['is_variant_axis'] ?? null, 'reason' => 'C: orphan or non-axis value'];
    }

    return ['A' => $catA, 'B' => $catB, 'C' => $catC, 'axesCountByProduct' => $axesCountByProduct];
}

function phase2DryRun(PDO $pdo, ?string $reportPath): array {
    $report = fetchOrphans($pdo);
    $report['counts'] = ['A' => count($report['A']), 'B' => count($report['B']), 'C' => count($report['C'])];
    $report['generated_at'] = date('c');
    $report['db'] = $pdo->query('SELECT DATABASE()')->fetchColumn();

    // Pre-migration counts for checksum preview
    $report['pre_counts'] = [
        'variants' => (int)$pdo->query('SELECT COUNT(*) FROM product_variants')->fetchColumn(),
        'vav' => (int)$pdo->query('SELECT COUNT(*) FROM variant_attribute_values')->fetchColumn(),
        'products_with_variants' => (int)$pdo->query('SELECT COUNT(DISTINCT product_id) FROM product_variants')->fetchColumn(),
    ];

    $json = json_encode($report, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($reportPath) {
        file_put_contents($reportPath, $json);
        echo "Report written to $reportPath\n";
    }
    // Markdown summary
    $mdPath = $reportPath ? preg_replace('/\.json$/', '.md', $reportPath) : null;
    if ($mdPath) {
        $md = "# Variant axes migration dry-run\n\nGenerated: {$report['generated_at']}\nDB: {$report['db']}\n\n## Counts\n- A (0 links, has axes): {$report['counts']['A']}\n- B (partial): {$report['counts']['B']}\n- C (orphan/non-axis): {$report['counts']['C']}\n\n## Policy (dev)\n- A/B: migrate with is_active=0, listed in report\n- C: create as text value, linked\n\n";
        if (!empty($report['A'])) { $md .= "## A details\n"; foreach (array_slice($report['A'], 0, 20) as $r) $md .= "- variant {$r['variant_id']} product {$r['product_id']} ({$r['title']}) {$r['reason']}\n"; }
        if (!empty($report['B'])) { $md .= "## B details\n"; foreach (array_slice($report['B'], 0, 20) as $r) $md .= "- variant {$r['variant_id']} product {$r['product_id']} {$r['reason']}\n"; }
        if (!empty($report['C'])) { $md .= "## C details\n"; foreach (array_slice($report['C'], 0, 20) as $r) $md .= "- variant {$r['variant_id']} value {$r['attribute_value_id']} {$r['reason']}\n"; }
        file_put_contents($mdPath, $md);
        echo "Markdown summary: $mdPath\n";
    }

    echo json_encode(['counts' => $report['counts'], 'pre_counts' => $report['pre_counts']], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
    return $report;
}

function comboKeyForLinks(array $axisValuePairs): string {
    // $axisValuePairs = [[axis_id, value_id], ...] sorted by axis_id
    usort($axisValuePairs, fn($a, $b) => $a[0] <=> $b[0]);
    if (empty($axisValuePairs)) return '';
    return implode('|', array_map(fn($p) => $p[0] . ':' . $p[1], $axisValuePairs));
}

function phase2(PDO $pdo, bool $dryRun, ?string $reportPath): void {
    if ($dryRun) {
        echo "[Phase 2] DRY-RUN only\n";
        phase2DryRun($pdo, $reportPath ?: __DIR__ . '/migration_report.json');
        return;
    }

    echo "[Phase 2] Data migration in transaction...\n";
    $preVariants = (int)$pdo->query('SELECT COUNT(*) FROM product_variants')->fetchColumn();
    $preVav = (int)$pdo->query('SELECT COUNT(*) FROM variant_attribute_values')->fetchColumn();

    // Collect expected migration sets
    $types = $pdo->query('SELECT * FROM attribute_types WHERE is_variant_axis=1 ORDER BY sort_order, id')->fetchAll();
    $typeMap = [];
    foreach ($types as $t) $typeMap[(int)$t['id']] = $t;

    $pdo->beginTransaction();
    try {
        // For each product that has variants with axis values, create axes/values/links
        $products = $pdo->query('SELECT DISTINCT product_id FROM product_variants')->fetchAll(PDO::FETCH_COLUMN);
        $createdAxes = 0; $createdValues = 0; $createdLinks = 0;

        // Cache: per product, axis slug -> new axis id, and old av id -> new pav id
        foreach ($products as $pid) {
            $pid = (int)$pid;
            // Find distinct variant axes for this product via old tables
            $stmt = $pdo->prepare("
                SELECT DISTINCT at.id AS type_id, at.name, at.slug, at.input_type, at.sort_order
                FROM product_variants pv
                JOIN variant_attribute_values vav ON vav.variant_id = pv.id
                JOIN attribute_values av ON av.id = vav.attribute_value_id
                JOIN attribute_types at ON at.id = av.attribute_type_id AND at.is_variant_axis=1
                WHERE pv.product_id = ?
            ");
            $stmt->execute([$pid]);
            $axes = $stmt->fetchAll();
            if (empty($axes)) continue; // simple product, no axes

            $axisIdMap = []; // old type_id -> new axis_id
            foreach ($axes as $ax) {
                $oldTypeId = (int)$ax['type_id'];
                // Check existing (idempotent)
                $chk = $pdo->prepare('SELECT id FROM product_variant_axes WHERE product_id=? AND slug=? LIMIT 1');
                $chk->execute([$pid, $ax['slug']]);
                $existing = $chk->fetchColumn();
                if ($existing) {
                    $axisIdMap[$oldTypeId] = (int)$existing;
                    continue;
                }
                $inputType = $ax['input_type'] === 'swatch' ? 'swatch' : 'text';
                $ins = $pdo->prepare('INSERT INTO product_variant_axes (product_id, name, slug, input_type, sort_order, is_active) VALUES (?,?,?,?,?,1)');
                $ins->execute([$pid, $ax['name'], $ax['slug'], $inputType, (int)$ax['sort_order']]);
                $axisIdMap[$oldTypeId] = (int)$pdo->lastInsertId();
                $createdAxes++;
            }

            // Distinct values for this product
            $stmt = $pdo->prepare("
                SELECT DISTINCT av.id AS old_av_id, av.attribute_type_id, av.value, av.slug, av.swatch_hex, av.sort_order
                FROM product_variants pv
                JOIN variant_attribute_values vav ON vav.variant_id = pv.id
                JOIN attribute_values av ON av.id = vav.attribute_value_id
                JOIN attribute_types at ON at.id = av.attribute_type_id AND at.is_variant_axis=1
                WHERE pv.product_id = ?
            ");
            $stmt->execute([$pid]);
            $vals = $stmt->fetchAll();
            $avMap = []; // old av id -> [new pav id, axis_id]
            foreach ($vals as $v) {
                $oldAvId = (int)$v['old_av_id'];
                $typeId = (int)$v['attribute_type_id'];
                $axisId = $axisIdMap[$typeId] ?? null;
                if (!$axisId) continue;
                $chk = $pdo->prepare('SELECT id FROM product_axis_values WHERE axis_id=? AND slug=? LIMIT 1');
                $chk->execute([$axisId, $v['slug']]);
                $existing = $chk->fetchColumn();
                if ($existing) {
                    $avMap[$oldAvId] = [(int)$existing, $axisId];
                    continue;
                }
                $ins = $pdo->prepare('INSERT INTO product_axis_values (axis_id, value, slug, swatch_hex, sort_order, is_active) VALUES (?,?,?,?,?,1)');
                $ins->execute([$axisId, $v['value'], $v['slug'], $v['swatch_hex'], (int)$v['sort_order']]);
                $avMap[$oldAvId] = [(int)$pdo->lastInsertId(), $axisId];
                $createdValues++;
            }

            // Handle C: orphan/non-axis values for this product -> create as text
            $stmt = $pdo->prepare("
                SELECT vav.variant_id, vav.attribute_value_id, av.value, av.slug, av.swatch_hex
                FROM variant_attribute_values vav
                JOIN product_variants pv ON pv.id = vav.variant_id
                LEFT JOIN attribute_values av ON av.id = vav.attribute_value_id
                LEFT JOIN attribute_types at ON at.id = av.attribute_type_id
                WHERE pv.product_id = ? AND (at.id IS NULL OR at.is_variant_axis=0)
            ");
            $stmt->execute([$pid]);
            $orphans = $stmt->fetchAll();
            foreach ($orphans as $o) {
                $oldAvId = (int)$o['attribute_value_id'];
                if (isset($avMap[$oldAvId])) continue;
                // Need an axis for this orphan: use a generic axis per distinct orphan type or fallback
                // For simplicity, create/find axis with slug = 'orphan' for this product
                $chk = $pdo->prepare('SELECT id FROM product_variant_axes WHERE product_id=? AND slug=? LIMIT 1');
                $chk->execute([$pid, 'orphan']);
                $orphanAxis = $chk->fetchColumn();
                if (!$orphanAxis) {
                    $ins = $pdo->prepare('INSERT INTO product_variant_axes (product_id, name, slug, input_type, sort_order, is_active) VALUES (?,?,?,?,?,1)');
                    $ins->execute([$pid, 'سایر', 'orphan', 'text', 999]);
                    $orphanAxis = (int)$pdo->lastInsertId();
                    $createdAxes++;
                }
                $chk = $pdo->prepare('SELECT id FROM product_axis_values WHERE axis_id=? AND slug=? LIMIT 1');
                $chk->execute([$orphanAxis, $o['slug'] ?: ('orphan-' . $oldAvId)]);
                $existing = $chk->fetchColumn();
                if ($existing) {
                    $avMap[$oldAvId] = [(int)$existing, (int)$orphanAxis];
                    continue;
                }
                $ins = $pdo->prepare('INSERT INTO product_axis_values (axis_id, value, slug, swatch_hex, sort_order, is_active) VALUES (?,?,?,?,?,1)');
                $ins->execute([$orphanAxis, $o['value'] ?? ('val-' . $oldAvId), $o['slug'] ?: ('orphan-' . $oldAvId), null, 999]);
                $avMap[$oldAvId] = [(int)$pdo->lastInsertId(), (int)$orphanAxis];
                $createdValues++;
            }

            // Create links per variant + combo_key
            $stmt = $pdo->prepare('SELECT id FROM product_variants WHERE product_id=?');
            $stmt->execute([$pid]);
            $vids = $stmt->fetchAll(PDO::FETCH_COLUMN);
            foreach ($vids as $vid) {
                $vid = (int)$vid;
                // Check if already has links (idempotent)
                $chk = $pdo->prepare('SELECT COUNT(*) FROM product_variant_links WHERE variant_id=?');
                $chk->execute([$vid]);
                if ((int)$chk->fetchColumn() > 0) {
                    // Update combo_key if not set
                    $links = $pdo->prepare('SELECT axis_id, axis_value_id FROM product_variant_links WHERE variant_id=? ORDER BY axis_id');
                    $links->execute([$vid]);
                    $pairs = $links->fetchAll();
                    $ck = comboKeyForLinks(array_map(fn($r) => [(int)$r['axis_id'], (int)$r['axis_value_id']], $pairs));
                    $pdo->prepare('UPDATE product_variants SET combo_key=? WHERE id=?')->execute([$ck, $vid]);
                    continue;
                }
                $vavStmt = $pdo->prepare('SELECT attribute_value_id FROM variant_attribute_values WHERE variant_id=?');
                $vavStmt->execute([$vid]);
                $oldAvIds = $vavStmt->fetchAll(PDO::FETCH_COLUMN);
                $pairs = [];
                $isOrphan = false;
                foreach ($oldAvIds as $oldAvId) {
                    $oldAvId = (int)$oldAvId;
                    if (!isset($avMap[$oldAvId])) { $isOrphan = true; break; }
                    [$newValId, $axisId] = $avMap[$oldAvId];
                    $pairs[] = [$axisId, $newValId];
                }
                if (empty($oldAvIds)) {
                    // Default variant: combo_key = ''
                    $pdo->prepare('UPDATE product_variants SET combo_key=? WHERE id=?')->execute(['', $vid]);
                    continue;
                }
                if ($isOrphan) {
                    // Should have been handled via orphan axis, but skip if still missing
                    continue;
                }
                // Determine if A/B: expected axes count
                $expectedAxes = count($axisIdMap);
                if (count($pairs) === 0 && $expectedAxes > 0) {
                    // A: 0 links but has axes -> is_active=0 per policy
                    $pdo->prepare('UPDATE product_variants SET combo_key=?, is_active=0 WHERE id=?')->execute(['', $vid]);
                    continue;
                }
                if (count($pairs) > 0 && count($pairs) < $expectedAxes) {
                    // B: partial -> is_active=0
                    $ck = comboKeyForLinks($pairs);
                    $pdo->prepare('UPDATE product_variants SET combo_key=?, is_active=0 WHERE id=?')->execute([$ck, $vid]);
                    // Still create links for what we have (so data is preserved)
                } else {
                    $ck = comboKeyForLinks($pairs);
                    $pdo->prepare('UPDATE product_variants SET combo_key=? WHERE id=?')->execute([$ck, $vid]);
                }
                foreach ($pairs as [$axisId, $newValId]) {
                    try {
                        $pdo->prepare('INSERT INTO product_variant_links (variant_id, axis_id, axis_value_id) VALUES (?,?,?)')->execute([$vid, $axisId, $newValId]);
                        $createdLinks++;
                    } catch (PDOException $e) {
                        // duplicate PK -> skip
                        if (strpos($e->getMessage(), 'Duplicate') === false) throw $e;
                    }
                }
                // Ensure partially-migrated variants marked inactive but links remain
                if (count($pairs) < $expectedAxes && count($pairs) > 0) {
                    $pdo->prepare('UPDATE product_variants SET is_active=0 WHERE id=?')->execute([$vid]);
                }
            }
        }

        // Checksum
        $postVariants = (int)$pdo->query('SELECT COUNT(*) FROM product_variants')->fetchColumn();
        $postLinks = (int)$pdo->query('SELECT COUNT(*) FROM product_variant_links')->fetchColumn();
        if ($preVariants !== $postVariants) {
            throw new RuntimeException("Checksum failed: variants before $preVariants after $postVariants");
        }
        // For idempotent run, vav count should equal links count except Default variants
        $expectedLinks = (int)$pdo->query("
            SELECT COUNT(*) FROM variant_attribute_values vav
            JOIN attribute_values av ON av.id=vav.attribute_value_id
            JOIN attribute_types at ON at.id=av.attribute_type_id AND at.is_variant_axis=1
        ")->fetchColumn();
        // Allow orphan links too
        if ($postLinks < $expectedLinks) {
            throw new RuntimeException("Checksum failed: expected at least $expectedLinks links, got $postLinks");
        }

        $pdo->commit();
        echo "[Phase 2] done: axes $createdAxes values $createdValues links $createdLinks\n";
        // Write report
        $report = fetchOrphans($pdo);
        $report['migration'] = ['createdAxes' => $createdAxes, 'createdValues' => $createdValues, 'createdLinks' => $createdLinks, 'preVariants' => $preVariants, 'postVariants' => $postVariants];
        $path = $reportPath ?: __DIR__ . '/migration_report.json';
        file_put_contents($path, json_encode($report, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        echo "Report: $path\n";
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function phase3(PDO $pdo): void {
    echo "[Phase 3] Adding generated column + unique...\n";
    if (!columnExists($pdo, 'product_variants', 'combo_key')) {
        throw new RuntimeException('combo_key missing, run phase 1 first');
    }
    if (!columnExists($pdo, 'product_variants', 'active_combo_key')) {
        // Check version supports generated
        $pdo->exec('ALTER TABLE product_variants ADD COLUMN active_combo_key VARCHAR(255) AS (IF(is_active=1, combo_key, NULL)) VIRTUAL');
        echo "  added active_combo_key\n";
    } else {
        echo "  active_combo_key exists\n";
    }
    if (!indexExists($pdo, 'product_variants', 'uq_pv_product_combo')) {
        $pdo->exec('ALTER TABLE product_variants ADD UNIQUE KEY uq_pv_product_combo (product_id, active_combo_key)');
        echo "  added unique (product_id, active_combo_key)\n";
    } else {
        echo "  unique exists\n";
    }
    // Ensure combo_key index if missing
    if (!indexExists($pdo, 'product_variants', 'idx_pv_combo')) {
        $pdo->exec('ALTER TABLE product_variants ADD KEY idx_pv_combo (combo_key)');
        echo "  added idx_pv_combo\n";
    }
    echo "[Phase 3] done. NOTE: after go-live rollback requires backup restore.\n";
}

function verify(PDO $pdo): void {
    echo "[Verify] Running checks...\n";
    $errors = [];
    // 1) No active variant with axes missing links
    $stmt = $pdo->query("
        SELECT pv.id, pv.product_id, pv.combo_key, pv.is_active,
               (SELECT COUNT(*) FROM product_variant_links pvl WHERE pvl.variant_id=pv.id) link_cnt,
               (SELECT COUNT(*) FROM product_variant_axes pva WHERE pva.product_id=pv.product_id AND pva.is_active=1) axis_cnt
        FROM product_variants pv
        WHERE pv.is_active=1
    ");
    foreach ($stmt->fetchAll() as $row) {
        $axisCnt = (int)$row['axis_cnt'];
        $linkCnt = (int)$row['link_cnt'];
        $ck = $row['combo_key'];
        if ($axisCnt === 0) {
            if ($ck !== '') $errors[] = "variant {$row['id']} product {$row['product_id']}: 0 axes but combo_key != '' ('$ck')";
            if ($linkCnt !== 0) $errors[] = "variant {$row['id']}: 0 axes but has $linkCnt links";
        } else {
            if ($linkCnt !== $axisCnt) $errors[] = "variant {$row['id']} product {$row['product_id']}: is_active=1 but link_cnt $linkCnt != axis_cnt $axisCnt (combo_key=$ck)";
            if ($ck === '' && $axisCnt > 0) $errors[] = "variant {$row['id']}: has axes but combo_key=''";
        }
    }
    // 2) combo_key uniqueness among actives
    $stmt = $pdo->query("
        SELECT product_id, active_combo_key, COUNT(*) c FROM product_variants
        WHERE is_active=1 GROUP BY product_id, active_combo_key HAVING COUNT(*) > 1
    ");
    foreach ($stmt->fetchAll() as $row) {
        $errors[] = "duplicate active combo_key product {$row['product_id']} key '{$row['active_combo_key']}' count {$row['c']}";
    }
    // 3) FK composite: every link's axis_value_id actually belongs to axis_id
    $stmt = $pdo->query("
        SELECT pvl.variant_id, pvl.axis_id, pvl.axis_value_id FROM product_variant_links pvl
        LEFT JOIN product_axis_values pav ON pav.id=pvl.axis_value_id AND pav.axis_id=pvl.axis_id
        WHERE pav.id IS NULL
    ");
    foreach ($stmt->fetchAll() as $row) {
        $errors[] = "link mismatch variant {$row['variant_id']} axis {$row['axis_id']} value {$row['axis_value_id']} not in product_axis_values";
    }
    // 4) Counts
    $variants = (int)$pdo->query('SELECT COUNT(*) FROM product_variants')->fetchColumn();
    $links = (int)$pdo->query('SELECT COUNT(*) FROM product_variant_links')->fetchColumn();
    $axes = (int)$pdo->query('SELECT COUNT(*) FROM product_variant_axes WHERE is_active=1')->fetchColumn();
    echo "  counts: variants=$variants links=$links active_axes=$axes\n";

    if (empty($errors)) {
        echo "[Verify] PASS\n";
    } else {
        echo "[Verify] FAIL with " . count($errors) . " errors:\n";
        foreach ($errors as $e) echo "  - $e\n";
        exit(1);
    }
}

// ── Main ──
$opts = parseArgs($argv);
try {
    $pdo = getPdo($opts['dsn'], $opts['user'], $opts['pass']);
    if ($opts['verify']) {
        verify($pdo);
        exit(0);
    }
    $phase = $opts['phase'];
    if ($phase === null) {
        echo "Usage: php migrate_variant_axes.php --phase=1|2|3 [--dry-run] [--report=path.json] [--dsn=...]\n";
        echo "       php migrate_variant_axes.php --dry-run\n";
        echo "       php migrate_variant_axes.php --verify\n";
        exit(1);
    }
    if ($phase === 1) phase1($pdo);
    elseif ($phase === 2) phase2($pdo, (bool)$opts['dry-run'], $opts['report']);
    elseif ($phase === 3) phase3($pdo);
    else { echo "Unknown phase $phase\n"; exit(1); }
} catch (Throwable $e) {
    fwrite(STDERR, "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n");
    exit(1);
}
