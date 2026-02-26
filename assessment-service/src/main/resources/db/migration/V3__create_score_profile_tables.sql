-- V3: Create Score Profile tables
-- These tables manage scoring configurations for assessments

SET search_path TO assessment;

-- Score Profiles table
CREATE TABLE IF NOT EXISTS assessment.score_profiles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    level VARCHAR(10), -- N5, N4, N3, N2, N1
    max_total INTEGER,
    min_total_pass INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Score Profile Sections table
CREATE TABLE IF NOT EXISTS assessment.score_profile_sections (
    id BIGSERIAL PRIMARY KEY,
    profile_id BIGINT NOT NULL REFERENCES assessment.score_profiles(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- VOCAB, GRAMMAR, READING, LISTENING
    title VARCHAR(255) NOT NULL,
    max_score INTEGER NOT NULL,
    weight DECIMAL(5,2),
    min_pass INTEGER,
    default_time_sec INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_score_profiles_name ON assessment.score_profiles(name);
CREATE INDEX IF NOT EXISTS idx_score_profiles_level ON assessment.score_profiles(level);
CREATE INDEX IF NOT EXISTS idx_score_profile_sections_profile_id ON assessment.score_profile_sections(profile_id);

-- Add foreign key to assessments table
ALTER TABLE assessment.assessments 
    ADD CONSTRAINT fk_assessments_score_profile 
    FOREIGN KEY (score_profile_id) 
    REFERENCES assessment.score_profiles(id) 
    ON DELETE SET NULL;
