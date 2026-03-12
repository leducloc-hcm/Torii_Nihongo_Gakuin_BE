ALTER TABLE assessment.question_groups
    ADD COLUMN IF NOT EXISTS media_url VARCHAR(500);

ALTER TABLE assessment.question_groups
    ADD COLUMN IF NOT EXISTS audio_url VARCHAR(500);
