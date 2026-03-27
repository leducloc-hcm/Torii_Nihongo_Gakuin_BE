CREATE TABLE IF NOT EXISTS assessment.score_profiles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    level VARCHAR(10),
    max_total INTEGER,
    min_total_pass INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment.score_profile_sections (
    id BIGSERIAL PRIMARY KEY,
    profile_id BIGINT NOT NULL REFERENCES assessment.score_profiles(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    max_score INTEGER NOT NULL,
    weight DECIMAL(5,2),
    min_pass INTEGER,
    default_time_sec INTEGER
);
