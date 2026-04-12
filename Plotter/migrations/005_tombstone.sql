-- Migration 005 — TOMBSTONE
--
-- This migration was removed during an early schema consolidation.
-- Its content was merged into 007_create_auth_tables.sql before the
-- repository was made public.  The sequence gap is intentional.
--
-- DO NOT renumber subsequent migrations — existing databases that ran
-- migrations 001–004 then jumped to 007 are already in the correct state.
-- This file exists solely so the gap is documented and the migration
-- runner does not log a confusing warning about a missing sequence entry.

SELECT 1; -- no-op; marks this version as applied
