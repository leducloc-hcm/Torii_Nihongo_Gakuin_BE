-- ============================================
-- Assessment Service - Complete Schema
-- Consolidated migration (V1-V6 merged)
-- ============================================

-- Create assessment schema
CREATE SCHEMA IF NOT EXISTS assessment;

SET search_path TO assessment;

-- ============================================
-- Score Profiles (created first for FK reference)
-- ============================================
CREATE TABLE IF NOT EXISTS assessment.score_profiles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    level VARCHAR(10),
    max_total INTEGER,
    min_total_pass INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment.score_profile_sections (
    id BIGSERIAL PRIMARY KEY,
    profile_id BIGINT NOT NULL REFERENCES assessment.score_profiles(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    max_score INTEGER NOT NULL,
    weight DECIMAL(5,2),
    min_pass INTEGER,
    default_time_sec INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_score_profiles_name ON assessment.score_profiles(name);
CREATE INDEX IF NOT EXISTS idx_score_profiles_level ON assessment.score_profiles(level);
CREATE INDEX IF NOT EXISTS idx_score_profile_sections_profile_id ON assessment.score_profile_sections(profile_id);

-- ============================================
-- Assessments
-- ============================================
CREATE TABLE IF NOT EXISTS assessment.assessments (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    level VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL,
    visibility VARCHAR(20) DEFAULT 'PRIVATE',
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score_profile_id BIGINT REFERENCES assessment.score_profiles(id) ON DELETE SET NULL,
    blueprint_id BIGINT,
    blueprint_snapshot JSONB,
    seed BIGINT,
    version INTEGER DEFAULT 1,
    generator_version VARCHAR(50),
    generator_meta JSONB
);

CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessment.assessments(created_by);

-- ============================================
-- Sections & Items
-- ============================================
CREATE TABLE IF NOT EXISTS assessment.sections (
    id BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT NOT NULL REFERENCES assessment.assessments(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    time_limit_sec INTEGER,
    type VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment.items (
    id BIGSERIAL PRIMARY KEY,
    section_id BIGINT NOT NULL REFERENCES assessment.sections(id) ON DELETE CASCADE,
    name VARCHAR(255),
    score_per_question DECIMAL(10,2),
    "order" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assessment.item_questions (
    item_id BIGINT NOT NULL REFERENCES assessment.items(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL,
    "order" INTEGER,
    score DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, question_id)
);

CREATE TABLE IF NOT EXISTS assessment.item_groups (
    item_id BIGINT NOT NULL REFERENCES assessment.items(id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL,
    "order" INTEGER,
    score DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_sections_assessment_id ON assessment.sections(assessment_id);
CREATE INDEX IF NOT EXISTS idx_items_section_id ON assessment.items(section_id);

-- ============================================
-- Attempts & Answers
-- ============================================
CREATE TABLE IF NOT EXISTS assessment.attempts (
    id BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT NOT NULL REFERENCES assessment.assessments(id),
    user_id INTEGER NOT NULL,
    progress_id BIGINT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    score DOUBLE PRECISION,
    level_suggestion VARCHAR(10),
    earned_score DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS assessment.answers (
    id BIGSERIAL PRIMARY KEY,
    attempt_id BIGINT NOT NULL REFERENCES assessment.attempts(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL,
    selected_option_id BIGINT,
    is_correct BOOLEAN,
    time_spent_sec INTEGER,
    explanation TEXT
);

CREATE INDEX IF NOT EXISTS idx_attempts_assessment_id ON assessment.attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON assessment.attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_attempt_id ON assessment.answers(attempt_id);

-- ============================================
-- Progress & Answer Progress
-- ============================================
CREATE TABLE IF NOT EXISTS assessment.progress (
    id BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT NOT NULL REFERENCES assessment.assessments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    assignment_id BIGINT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_section INTEGER,
    current_question INTEGER,
    time_spent_sec INTEGER DEFAULT 0,
    is_submitted BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    remaining_sec INTEGER
);

CREATE TABLE IF NOT EXISTS assessment.answer_progress (
    id BIGSERIAL PRIMARY KEY,
    progress_id BIGINT NOT NULL REFERENCES assessment.progress(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL,
    selected_option_id BIGINT,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_spent_sec INTEGER DEFAULT 0,
    is_flagged BOOLEAN DEFAULT FALSE,
    UNIQUE(progress_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_assessment_id ON assessment.progress(assessment_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON assessment.progress(user_id);

-- ============================================
-- Assignments
-- ============================================
CREATE TABLE IF NOT EXISTS assessment.assignments (
    id BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT NOT NULL REFERENCES assessment.assessments(id) ON DELETE CASCADE,
    assigned_by_id INTEGER NOT NULL,
    assigned_to_id INTEGER,
    class_id BIGINT,
    note TEXT,
    start_at TIMESTAMP,
    due_at TIMESTAMP,
    lock_after_due BOOLEAN DEFAULT FALSE,
    max_attempts INTEGER,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assignments_assessment_id ON assessment.assignments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_to_id ON assessment.assignments(assigned_to_id);

-- ============================================
-- Question Bank
-- ============================================
CREATE TABLE IF NOT EXISTS assessment.questions (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(255),
    version INTEGER DEFAULT 1,
    type VARCHAR(20) NOT NULL,
    level VARCHAR(10) NOT NULL,
    difficulty VARCHAR(10) DEFAULT 'MEDIUM',
    stem VARCHAR(2000) NOT NULL,
    passage TEXT,
    media_id BIGINT,
    media_url VARCHAR(500),
    explanation VARCHAR(2000),
    reading_length VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(uuid, version)
);

CREATE TABLE IF NOT EXISTS assessment.options (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES assessment.questions(id) ON DELETE CASCADE,
    content VARCHAR(1000),
    media_id BIGINT,
    media_url VARCHAR(500),
    is_correct BOOLEAN DEFAULT FALSE,
    "order" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assessment.question_groups (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(255),
    version INTEGER DEFAULT 1,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(500),
    passage TEXT,
    media_id BIGINT,
    media_url VARCHAR(500),
    audio_url VARCHAR(500),
    "order" INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(uuid, version)
);

CREATE TABLE IF NOT EXISTS assessment.question_group_questions (
    question_id BIGINT NOT NULL REFERENCES assessment.questions(id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL REFERENCES assessment.question_groups(id) ON DELETE CASCADE,
    "order" INTEGER,
    score DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (question_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_questions_uuid ON assessment.questions(uuid);
CREATE INDEX IF NOT EXISTS idx_questions_type ON assessment.questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_level ON assessment.questions(level);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON assessment.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_media_url ON assessment.questions(media_url) WHERE media_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_options_question_id ON assessment.options(question_id);
CREATE INDEX IF NOT EXISTS idx_question_groups_uuid ON assessment.question_groups(uuid);
CREATE INDEX IF NOT EXISTS idx_question_groups_type ON assessment.question_groups(type);
CREATE INDEX IF NOT EXISTS idx_qgq_group_id ON assessment.question_group_questions(group_id);
CREATE INDEX IF NOT EXISTS idx_qgq_question_id ON assessment.question_group_questions(question_id);

