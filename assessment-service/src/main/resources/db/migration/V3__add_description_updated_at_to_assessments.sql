ALTER TABLE assessment.assessments
    ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE assessment.assessments
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
