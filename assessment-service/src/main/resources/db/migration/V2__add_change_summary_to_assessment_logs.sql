ALTER TABLE assessment.assessment_logs
    ADD COLUMN IF NOT EXISTS change_summary VARCHAR(255);
