-- V4: Add missing columns to score profile tables
-- This migration adds missing columns if they don't exist

SET search_path TO assessment;

-- Add notes column to score_profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'assessment'
        AND table_name = 'score_profiles'
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE assessment.score_profiles ADD COLUMN notes TEXT;
    END IF;
END $$;

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


