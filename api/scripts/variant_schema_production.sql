-- RAR Shop: additive variant schema for an existing production database.
--
-- SAFETY:
--   1. Select the production database before running this file.
--   2. Take a verified backup first.
--   3. This file does not DROP, TRUNCATE, DELETE, or UPDATE data.
--   4. This file only creates missing tables and adds product_variants.combo_key
--      when that column is missing.
--   5. Do not run the data migration or phase-3 unique index until the dry-run
--      report has been reviewed. See migrate_variant_axes.php.
--
-- This script intentionally does NOT add active_combo_key or the unique active
-- combo index. Existing production data may contain duplicate/partial legacy
-- combinations; those must be audited before adding that constraint.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- Preflight: these must already exist. This SELECT is intentionally read-only.
SELECT DATABASE() AS selected_database,
       COUNT(*) AS required_base_tables
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN ('products', 'product_variants');

CREATE TABLE IF NOT EXISTS product_variant_axes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  input_type ENUM('text', 'swatch') NOT NULL DEFAULT 'text',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pva_product_slug (product_id, slug),
  KEY idx_pva_product (product_id, sort_order),
  KEY idx_pva_active (is_active),
  CONSTRAINT fk_pva_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_axis_values (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  axis_id BIGINT UNSIGNED NOT NULL,
  value VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  swatch_hex CHAR(7) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pav_axis_slug (axis_id, slug),
  UNIQUE KEY uq_pav_id_axis (id, axis_id),
  KEY idx_pav_axis (axis_id, sort_order),
  KEY idx_pav_active (is_active),
  CONSTRAINT fk_pav_axis
    FOREIGN KEY (axis_id) REFERENCES product_variant_axes (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variant_links (
  variant_id BIGINT UNSIGNED NOT NULL,
  axis_id BIGINT UNSIGNED NOT NULL,
  axis_value_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (variant_id, axis_id),
  KEY idx_pvl_value_axis (axis_value_id, axis_id),
  KEY idx_pvl_axis (axis_id),
  CONSTRAINT fk_pvl_variant
    FOREIGN KEY (variant_id) REFERENCES product_variants (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pvl_axis
    FOREIGN KEY (axis_id) REFERENCES product_variant_axes (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pvl_value_axis
    FOREIGN KEY (axis_value_id, axis_id)
    REFERENCES product_axis_values (id, axis_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- MySQL has no portable ALTER TABLE ... ADD COLUMN IF NOT EXISTS across the
-- versions commonly used by this project, so use a metadata check.
SET @add_combo_key_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE product_variants ADD COLUMN combo_key VARCHAR(255) NOT NULL DEFAULT '''' AFTER title',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'product_variants'
    AND column_name = 'combo_key'
);
PREPARE add_combo_key_stmt FROM @add_combo_key_sql;
EXECUTE add_combo_key_stmt;
DEALLOCATE PREPARE add_combo_key_stmt;

-- Postflight: read-only checks. Expected result: all three tables exist and
-- combo_key exists. Existing row counts are displayed for manual verification.
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'products',
    'product_variants',
    'product_variant_axes',
    'product_axis_values',
    'product_variant_links'
  )
ORDER BY table_name;

SELECT table_name, column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'product_variants'
  AND column_name = 'combo_key';
