-- V23: Fix missing columns in sections + create user_course_access table

-- 1. Add missing columns to sections
ALTER TABLE assessment.sections
    ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

ALTER TABLE assessment.sections
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE assessment.sections
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Create user_course_access table
CREATE TABLE IF NOT EXISTS assessment.user_course_access (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    unlocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_course_access_user_course
    ON assessment.user_course_access(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_user_course_access_user_id
    ON assessment.user_course_access(user_id);

CREATE INDEX IF NOT EXISTS idx_user_course_access_course_id
    ON assessment.user_course_access(course_id);
