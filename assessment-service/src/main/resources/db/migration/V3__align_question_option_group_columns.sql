ALTER TABLE assessment.options
    ADD COLUMN IF NOT EXISTS media_id BIGINT;

ALTER TABLE assessment.options
    ADD COLUMN IF NOT EXISTS media_url VARCHAR(500);

ALTER TABLE assessment.questions
    ADD COLUMN IF NOT EXISTS media_id BIGINT;

ALTER TABLE assessment.questions
    ADD COLUMN IF NOT EXISTS reading_length VARCHAR(20);

ALTER TABLE assessment.question_groups
    ADD COLUMN IF NOT EXISTS media_id BIGINT;

ALTER TABLE assessment.question_groups
    ADD COLUMN IF NOT EXISTS "order" INTEGER;
