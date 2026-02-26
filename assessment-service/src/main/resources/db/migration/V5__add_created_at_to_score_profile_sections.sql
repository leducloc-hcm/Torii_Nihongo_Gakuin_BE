-- V5: Add created_at column to score_profile_sections table
-- This migration adds the created_at column if it doesn't exist

SET search_path TO assessment;

-- Add created_at column to score_profile_sections if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'assessment'
        AND table_name = 'score_profile_sections'
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE assessment.score_profile_sections ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

