ALTER TABLE assessment.question_group_questions
    ADD COLUMN IF NOT EXISTS score DOUBLE PRECISION;

ALTER TABLE assessment.question_group_questions
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
