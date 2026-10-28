-- SMS Requirements & Calendar Database (Complete Schema)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Academic Terms (SMS-018)
CREATE TABLE IF NOT EXISTS academic_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_code VARCHAR(20) UNIQUE NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    semester_number INT NOT NULL,
    semester_label VARCHAR(30) NOT NULL,
    display_label VARCHAR(100),
    start_date DATE,
    end_date DATE,
    submission_window_start TIMESTAMP WITH TIME ZONE,
    submission_window_end TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ACTIVE', 'CLOSED', 'ARCHIVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Requirements (SMS-004, SMS-005)
CREATE TABLE IF NOT EXISTS requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID,
    program_code VARCHAR(50),
    term_code VARCHAR(20) NOT NULL,
    requirement_type VARCHAR(100) NOT NULL DEFAULT 'OBTL_SYLLABUS',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    deadline_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Calendar Snapshots (SMS-032 CCMS Push)
CREATE TABLE IF NOT EXISTS calendar_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_id VARCHAR(100) UNIQUE NOT NULL,
    term_code VARCHAR(20) NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_req_term ON requirements(term_code);
CREATE INDEX IF NOT EXISTS idx_req_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_term_status ON academic_terms(status);

-- Seed initial active term
INSERT INTO academic_terms (term_code, academic_year, semester_number, semester_label, display_label, start_date, end_date, submission_window_start, submission_window_end, status)
VALUES ('2026-1S', '2026-2027', 1, '1ST_SEMESTER', 'A.Y. 2026-2027 First Semester', '2026-09-01', '2027-01-31', '2026-09-01', '2026-12-15', 'ACTIVE')
ON CONFLICT (term_code) DO NOTHING;

-- Seed initial requirement definition for BSIT Term 1
INSERT INTO requirements (program_code, term_code, requirement_type, name, description, status) VALUES
    ('BSIT', '2026-1S', 'OBTL_SYLLABUS', 'PUPQC Outcomes-Based Teaching & Learning Syllabus', 'Official OBTL Syllabus template compliant with CHED CMO 25 s. 2015', 'PUBLISHED')
ON CONFLICT DO NOTHING;