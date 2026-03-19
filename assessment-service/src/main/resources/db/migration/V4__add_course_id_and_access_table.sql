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

