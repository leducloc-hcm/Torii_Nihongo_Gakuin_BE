-- Create assessment schema
CREATE SCHEMA IF NOT EXISTS assessment;

-- Set search path
SET search_path TO assessment;

-- Assessment Paper/Test
CREATE TABLE IF NOT EXISTS assessment.assessments (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    level VARCHAR(10) NOT NULL, -- N5, N4, N3, N2, N1
    type VARCHAR(20) NOT NULL, -- TEST, EXAM
    visibility VARCHAR(20) DEFAULT 'PRIVATE', -- PRIVATE, UNLISTED, PUBLIC
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score_profile_id BIGINT,
    blueprint_id BIGINT,
    blueprint_snapshot JSONB,
    seed BIGINT,
    version INTEGER DEFAULT 1,
    generator_version VARCHAR(50),
    generator_meta JSONB
);

-- Assessment Sections
CREATE TABLE IF NOT EXISTS assessment.sections (
    id BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT NOT NULL REFERENCES assessment.assessments(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    time_limit_sec INTEGER,
    type VARCHAR(20) NOT NULL -- VOCAB, GRAMMAR, READING, LISTENING
);

-- Assessment Items
CREATE TABLE IF NOT EXISTS assessment.items (
    id BIGSERIAL PRIMARY KEY,
    section_id BIGINT NOT NULL REFERENCES assessment.sections(id) ON DELETE CASCADE,
    name VARCHAR(255),
    score_per_question DECIMAL(10,2),
    "order" INTEGER DEFAULT 0
);

-- Questions (shared with learning service, but referenced here)
-- Note: Questions table should be in learning schema or a shared schema
-- This is a reference table that may need to be accessed across schemas

-- Assessment Item Questions (junction table)
CREATE TABLE IF NOT EXISTS assessment.item_questions (
    item_id BIGINT NOT NULL REFERENCES assessment.items(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL, -- References learning.questions
    "order" INTEGER,
    score DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, question_id)
);

-- Assessment Item Groups (for reading/listening groups)
CREATE TABLE IF NOT EXISTS assessment.item_groups (
    item_id BIGINT NOT NULL REFERENCES assessment.items(id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL, -- References learning.question_groups
    "order" INTEGER,
    score DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, group_id)
);

-- Assessment Attempts
CREATE TABLE IF NOT EXISTS assessment.attempts (
    id BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT NOT NULL REFERENCES assessment.assessments(id),
    user_id INTEGER NOT NULL,
    progress_id BIGINT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    score DOUBLE PRECISION,
    level_suggestion VARCHAR(10), -- N5, N4, N3, N2, N1
    earned_score DOUBLE PRECISION
);

-- Assessment Answers
CREATE TABLE IF NOT EXISTS assessment.answers (
    id BIGSERIAL PRIMARY KEY,
    attempt_id BIGINT NOT NULL REFERENCES assessment.attempts(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL,
    selected_option_id BIGINT,
    is_correct BOOLEAN,
    time_spent_sec INTEGER,
    explanation TEXT
);

-- Assessment Progress
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

-- Assessment Answer Progress (for in-progress attempts)
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

-- Assessment Assignments
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
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, SUBMITTED, EXPIRED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Score Profiles
CREATE TABLE IF NOT EXISTS assessment.score_profiles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    level VARCHAR(10), -- N5, N4, N3, N2, N1
    max_total INTEGER,
    min_total_pass INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Score Profile Sections
CREATE TABLE IF NOT EXISTS assessment.score_profile_sections (
    id BIGSERIAL PRIMARY KEY,
    profile_id BIGINT NOT NULL REFERENCES assessment.score_profiles(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- VOCAB, GRAMMAR, READING, LISTENING
    title VARCHAR(255) NOT NULL,
    max_score INTEGER NOT NULL,
    weight DECIMAL(5,2),
    min_pass INTEGER,
    default_time_sec INTEGER
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessment.assessments(created_by);
CREATE INDEX IF NOT EXISTS idx_sections_assessment_id ON assessment.sections(assessment_id);
CREATE INDEX IF NOT EXISTS idx_items_section_id ON assessment.items(section_id);
CREATE INDEX IF NOT EXISTS idx_attempts_assessment_id ON assessment.attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON assessment.attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_attempt_id ON assessment.answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_progress_assessment_id ON assessment.progress(assessment_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON assessment.progress(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assessment_id ON assessment.assignments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_to_id ON assessment.assignments(assigned_to_id);

