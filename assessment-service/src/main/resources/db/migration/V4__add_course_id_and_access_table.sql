-- Add optional course_id to assessments so assessment-service can gate access by course enrollment
ALTER TABLE assessment.assessments
    ADD COLUMN IF NOT EXISTS course_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_assessments_course_id
    ON assessment.assessments(course_id);

-- Track which users have access to which course's assessments
CREATE TABLE IF NOT EXISTS assessment.user_course_access (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    unlocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_course_access_user_course
    ON assessment.user_course_access(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_user_course_access_user_id
    ON assessment.user_course_access(user_id);

CREATE INDEX IF NOT EXISTS idx_user_course_access_course_id
    ON assessment.user_course_access(course_id);

ALTER TABLE assessment.progress
    ADD COLUMN IF NOT EXISTS assignment_id BIGINT;

ALTER TABLE assessment.progress
    ADD COLUMN IF NOT EXISTS current_attempt_id BIGINT;

ALTER TABLE assessment.progress
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'IN_PROGRESS';

ALTER TABLE assessment.progress
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE assessment.progress
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
