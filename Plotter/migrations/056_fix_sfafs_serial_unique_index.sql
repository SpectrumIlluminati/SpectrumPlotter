-- 056_fix_sfafs_serial_unique_index.sql
--
-- The partial unique index on sfafs(field102) WHERE field102 IS NOT NULL
-- prevents ON CONFLICT (field102) DO UPDATE from working — PostgreSQL requires
-- the ON CONFLICT target to exactly match the index definition including its
-- WHERE predicate, or be a non-partial unique index.
--
-- Replace the partial index with a full unique index so ON CONFLICT (field102)
-- works without needing to repeat the WHERE clause everywhere.
-- field102 is the Agency Serial Number and is always required for import,
-- so the NOT NULL guard is enforced at the application layer instead.

DROP INDEX IF EXISTS idx_sfafs_serial_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sfafs_serial_unique
    ON sfafs(field102);
