ALTER TABLE assessment.question_groups
    ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE assessment.questions
    ADD COLUMN IF NOT EXISTS created_by INTEGER;

