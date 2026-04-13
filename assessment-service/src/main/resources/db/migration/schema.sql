-- ============================================
-- UNIFIED ASSESSMENT SYSTEM (COPY DESIGN)
-- ============================================

CREATE SCHEMA IF NOT EXISTS assessment;
SET search_path TO assessment;

-- ENUMS

CREATE TYPE assessment_type AS ENUM ('TEST', 'EXAM', 'QUIZ', 'ASSIGNMENT');

CREATE TYPE visibility AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

CREATE TYPE jlpt_level AS ENUM ('N5', 'N4', 'N3', 'N2', 'N1');

CREATE TYPE assessment_section_type AS ENUM ('VOCAB', 'GRAMMAR', 'READING', 'LISTENING');

CREATE TYPE question_type AS ENUM ('VOCAB', 'KANJI', 'GRAMMAR', 'READING', 'LISTENING');

CREATE TYPE question_group_type AS ENUM ('READING_SHORT', 'READING_MEDIUM', 'READING_LONG', 'LISTENING');

CREATE TYPE difficulty AS ENUM ('EASY', 'MEDIUM', 'HARD');

CREATE TYPE progress_status AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

CREATE TYPE attempt_status AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

-- ASSESSMENTS

CREATE TABLE IF NOT EXISTS Assessments (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type assessment_type NOT NULL,
    level jlpt_level,

    created_by INTEGER NOT NULL,

    visibility visibility DEFAULT 'PRIVATE' NOT NULL,

    lesson_id INTEGER,
    class_id BIGINT,
    start_at TIMESTAMP,
    due_at TIMESTAMP,
    lock_after_due BOOLEAN DEFAULT FALSE,
    max_attempts INTEGER,

    score_profile_id BIGINT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessment_class ON assessments(class_id);
CREATE INDEX IF NOT EXISTS idx_assessment_lesson ON assessments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assessment_type_level ON assessments(type, level);
CREATE INDEX IF NOT EXISTS idx_assessments_score_profile_id ON assessments(score_profile_id);

-- AUDIT LOG

CREATE TABLE IF NOT EXISTS assessment_logs (
    id BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT REFERENCES assessments(id) ON DELETE CASCADE,

    action VARCHAR(50),
    field_name VARCHAR(100),

    old_value TEXT,
    new_value TEXT,

    metadata JSONB,
    change_summary VARCHAR(255),

    updated_by INTEGER,
    updated_by_name VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STRUCTURE

CREATE TABLE IF NOT EXISTS sections (
    id BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT REFERENCES assessments(id) ON DELETE CASCADE,

    title VARCHAR(255),
    time_limit_sec INTEGER,
    type assessment_section_type,
    "order" INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
    id BIGSERIAL PRIMARY KEY,
    section_id BIGINT REFERENCES sections(id) ON DELETE CASCADE,

    name VARCHAR(255),
    score_per_question DECIMAL(10,2),
    "order" INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ASSESSMENT COPY TABLES 

-- Question copy

CREATE TABLE IF NOT EXISTS assessment_questions (
    id BIGSERIAL PRIMARY KEY,

    original_question_id BIGINT,

    type question_type,
    level jlpt_level,
    difficulty difficulty,

    stem TEXT,
    passage TEXT,
    explanation TEXT,

    media_url VARCHAR(500),
    audio_url VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Options copy

CREATE TABLE IF NOT EXISTS assessment_options (
    id BIGSERIAL PRIMARY KEY,

    question_id BIGINT REFERENCES assessment_questions(id) ON DELETE CASCADE,

    content TEXT,
    is_correct BOOLEAN,
    "order" INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group copy

CREATE TABLE IF NOT EXISTS assessment_question_groups (
    id BIGSERIAL PRIMARY KEY,

    original_group_id BIGINT,

    type question_group_type,
    level jlpt_level,
    difficulty difficulty,

    stem TEXT,
    passage TEXT,
    explanation TEXT,

    media_url VARCHAR(500),
    audio_url VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group ↔ Question mapping

CREATE TABLE IF NOT EXISTS assessment_group_questions (
    group_id BIGINT REFERENCES assessment_question_groups(id) ON DELETE CASCADE,
    question_id BIGINT REFERENCES assessment_questions(id) ON DELETE CASCADE,

    "order" INTEGER,

    PRIMARY KEY (group_id, question_id)
);

-- Item ↔ Question

CREATE TABLE IF NOT EXISTS item_assessment_questions (
    item_id BIGINT REFERENCES items(id) ON DELETE CASCADE,
    question_id BIGINT REFERENCES assessment_questions(id) ON DELETE CASCADE,

    "order" INTEGER,
    score DECIMAL(10,2),

    PRIMARY KEY (item_id, question_id)
);

-- Item ↔ Group

CREATE TABLE IF NOT EXISTS item_assessment_groups (
    item_id BIGINT REFERENCES items(id) ON DELETE CASCADE,
    group_id BIGINT REFERENCES assessment_question_groups(id) ON DELETE CASCADE,

    "order" INTEGER,
    score DECIMAL(10,2),

    PRIMARY KEY (item_id, group_id)
);

-- PROGRESS

CREATE TABLE IF NOT EXISTS progress (
    id BIGSERIAL PRIMARY KEY,

    assessment_id BIGINT REFERENCES assessments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,

    assignment_id BIGINT REFERENCES assessments(id) ON DELETE SET NULL,

    current_attempt_id BIGINT,

    current_section INTEGER,
    current_question INTEGER,

    time_spent_sec INTEGER DEFAULT 0,
    remaining_sec INTEGER,

    is_submitted BOOLEAN DEFAULT FALSE,

    status progress_status DEFAULT 'IN_PROGRESS',
    completed_at TIMESTAMP,

    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (assessment_id, user_id)
);

-- ANSWER PROGRESS

CREATE TABLE IF NOT EXISTS answer_progress (
    id BIGSERIAL PRIMARY KEY,

    progress_id BIGINT REFERENCES progress(id) ON DELETE CASCADE,
    question_id BIGINT REFERENCES assessment_questions(id),

    selected_option_id BIGINT,
    time_spent_sec INTEGER DEFAULT 0,
    is_flagged BOOLEAN DEFAULT FALSE,

    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (progress_id, question_id)
);

-- ATTEMPTS

CREATE TABLE IF NOT EXISTS attempts (
    id BIGSERIAL PRIMARY KEY,

    assessment_id BIGINT REFERENCES assessments(id),
    user_id INTEGER NOT NULL,
    progress_id BIGINT REFERENCES progress(id) ON DELETE SET NULL,

    attempt_no INTEGER,
    status attempt_status DEFAULT 'IN_PROGRESS',

    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,

    score DOUBLE PRECISION,
    earned_score DOUBLE PRECISION,
    level_suggestion VARCHAR(10),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS answers (
    id BIGSERIAL PRIMARY KEY,

    attempt_id BIGINT REFERENCES attempts(id) ON DELETE CASCADE,
    question_id BIGINT REFERENCES assessment_questions(id),

    selected_option_id BIGINT,
    is_correct BOOLEAN,

    time_spent_sec INTEGER,
    explanation TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ANSWERS (USING COPY DATA)



CREATE INDEX IF NOT EXISTS idx_progress_assignment ON progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_answer_progress_progress ON answer_progress(progress_id);
CREATE INDEX IF NOT EXISTS idx_answer_progress_question ON answer_progress(question_id);

-- QUESTION BANK (SOURCE)

CREATE TABLE IF NOT EXISTS questions (
    id BIGSERIAL PRIMARY KEY,

    type question_type,
    level jlpt_level,
    difficulty difficulty,

    stem TEXT NOT NULL,
    passage TEXT,
    explanation TEXT,

    media_id BIGINT,
    media_url VARCHAR(500),
    audio_url VARCHAR(500),
    reading_length VARCHAR(20),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS options (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT REFERENCES questions(id) ON DELETE CASCADE,

    media_id BIGINT,
    media_url VARCHAR(500),

    content TEXT,
    is_correct BOOLEAN,
    "order" INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS question_groups (
    id BIGSERIAL PRIMARY KEY,

    type question_group_type,
    level jlpt_level,
    difficulty difficulty,

    stem TEXT,
    passage TEXT,
    explanation TEXT,

    media_url VARCHAR(500),
    audio_url VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS question_group_questions (
    question_id BIGINT REFERENCES questions(id) ON DELETE CASCADE,
    group_id BIGINT REFERENCES question_groups(id) ON DELETE CASCADE,

    "order" INTEGER,
    score DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (question_id, group_id)
);


CREATE TABLE IF NOT EXISTS score_profiles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    level VARCHAR(10),
    max_total INTEGER,
    min_total_pass INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS score_profile_sections (
    id BIGSERIAL PRIMARY KEY,
    profile_id BIGINT NOT NULL REFERENCES score_profiles(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    max_score INTEGER NOT NULL,
    weight DECIMAL(5,2),
    min_pass INTEGER
);

ALTER TABLE assessments
    ADD CONSTRAINT fk_assessments_score_profile
        FOREIGN KEY (score_profile_id)
        REFERENCES score_profiles(id)
        ON DELETE RESTRICT;

-- INDEXES

CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_attempt_user ON attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_level ON questions(level);
CREATE INDEX IF NOT EXISTS idx_options_question ON options(question_id);