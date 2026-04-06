-- Migration: Make marker_id nullable in sfafs table
-- Created: 2026-01-05
-- Purpose: Allow SFAF records without markers (e.g., Pool Assignments)

-- Drop the NOT NULL constraint on marker_id if it exists
ALTER TABLE sfafs ALTER COLUMN marker_id DROP NOT NULL;
