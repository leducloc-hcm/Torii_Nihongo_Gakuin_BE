-- V2: Create Questions, Options, QuestionGroups, QuestionGroupQuestions tables
-- These tables are for the Question Bank functionality

SET search_path TO assessment;

-- Questions table
CREATE TABLE IF NOT EXISTS assessment.questions (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(255),
    version INTEGER DEFAULT 1,
    type VARCHAR(20) NOT NULL, -- VOCAB, KANJI, GRAMMAR, SYNONYM, ORDER, READING, LISTENING
    level VARCHAR(10) NOT NULL, -- N5, N4, N3, N2, N1
    difficulty VARCHAR(10) DEFAULT 'MEDIUM', -- EASY, MEDIUM, HARD
    stem VARCHAR(2000) NOT NULL,
    passage TEXT,
    media_id BIGINT,
    explanation VARCHAR(2000),
    reading_length VARCHAR(10), -- SHORT, MEDIUM, LONG
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(uuid, version)
);

-- Create indexes for questions
CREATE INDEX IF NOT EXISTS idx_questions_uuid ON assessment.questions(uuid);
CREATE INDEX IF NOT EXISTS idx_questions_type ON assessment.questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_level ON assessment.questions(level);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON assessment.questions(difficulty);

-- Options table
CREATE TABLE IF NOT EXISTS assessment.options (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES assessment.questions(id) ON DELETE CASCADE,
    content VARCHAR(1000),
    media_id BIGINT,
    is_correct BOOLEAN DEFAULT FALSE,
    "order" INTEGER DEFAULT 0
);

-- Create index for options
CREATE INDEX IF NOT EXISTS idx_options_question_id ON assessment.options(question_id);

-- Question Groups table
CREATE TABLE IF NOT EXISTS assessment.question_groups (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(255),
    version INTEGER DEFAULT 1,
    type VARCHAR(20) NOT NULL, -- VOCAB, KANJI, GRAMMAR, CLOZE, READING_SHORT, READING_MEDIUM, READING_LONG, LISTENING
    title VARCHAR(500),
    passage TEXT,
    media_id BIGINT,
    "order" INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(uuid, version)
);

-- Create indexes for question_groups
CREATE INDEX IF NOT EXISTS idx_question_groups_uuid ON assessment.question_groups(uuid);
CREATE INDEX IF NOT EXISTS idx_question_groups_type ON assessment.question_groups(type);

-- Question Group Questions (junction table)
CREATE TABLE IF NOT EXISTS assessment.question_group_questions (
    question_id BIGINT NOT NULL REFERENCES assessment.questions(id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL REFERENCES assessment.question_groups(id) ON DELETE CASCADE,
    "order" INTEGER,
    score DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (question_id, group_id)
);

-- Create indexes for question_group_questions
CREATE INDEX IF NOT EXISTS idx_qgq_group_id ON assessment.question_group_questions(group_id);
CREATE INDEX IF NOT EXISTS idx_qgq_question_id ON assessment.question_group_questions(question_id);

