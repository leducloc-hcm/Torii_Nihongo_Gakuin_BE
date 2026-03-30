ALTER TABLE assessment.attempts
    ADD COLUMN IF NOT EXISTS level_suggestion VARCHAR(10);
