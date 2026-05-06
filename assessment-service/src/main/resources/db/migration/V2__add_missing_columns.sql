-- Add all remaining missing columns discovered after V1

-- question_groups: missing audio_url
ALTER TABLE assessment.question_groups
    ADD COLUMN IF NOT EXISTS audio_url VARCHAR(500);

-- questions: missing created_by, reading_length, audio_url
ALTER TABLE assessment.questions
    ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE assessment.questions
    ADD COLUMN IF NOT EXISTS reading_length VARCHAR(20);
ALTER TABLE assessment.questions
    ADD COLUMN IF NOT EXISTS audio_url VARCHAR(500);

-- assessment_questions: missing audio_url
ALTER TABLE assessment.assessment_questions
    ADD COLUMN IF NOT EXISTS audio_url VARCHAR(500);

-- assessment_question_groups: missing audio_url
ALTER TABLE assessment.assessment_question_groups
    ADD COLUMN IF NOT EXISTS audio_url VARCHAR(500);

-- score_profiles: missing created_by
ALTER TABLE assessment.score_profiles
    ADD COLUMN IF NOT EXISTS created_by INTEGER;
