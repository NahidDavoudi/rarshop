-- Run this only after selecting the production database.
-- The three variant tables were already created by the previous script.
-- This file does not query information_schema and does not modify existing rows.

-- First run this read-only check:
SHOW COLUMNS FROM product_variants LIKE 'combo_key';

-- If the result above is empty, run this statement:
ALTER TABLE product_variants
  ADD COLUMN combo_key VARCHAR(255) NOT NULL DEFAULT '' AFTER title;

-- Verify the column after the ALTER:
SHOW COLUMNS FROM product_variants LIKE 'combo_key';
