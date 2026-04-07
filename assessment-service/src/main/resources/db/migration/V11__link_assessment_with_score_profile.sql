ALTER TABLE assessment.assessments
ADD COLUMN IF NOT EXISTS score_profile_id BIGINT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM assessment.assessments
        WHERE score_profile_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot enforce mandatory score_profile_id: assessments with NULL score_profile_id exist';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'assessment'
          AND table_name = 'assessments'
          AND constraint_name = 'fk_assessments_score_profile'
    ) THEN
        ALTER TABLE assessment.assessments
        DROP CONSTRAINT fk_assessments_score_profile;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'assessment'
          AND table_name = 'assessments'
          AND constraint_name = 'fk_assessments_score_profile'
    ) THEN
        ALTER TABLE assessment.assessments
        ADD CONSTRAINT fk_assessments_score_profile
        FOREIGN KEY (score_profile_id)
        REFERENCES assessment.score_profiles(id)
        ON DELETE RESTRICT;
    END IF;

    ALTER TABLE assessment.assessments
    ALTER COLUMN score_profile_id SET NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_assessments_score_profile_id
ON assessment.assessments(score_profile_id);
