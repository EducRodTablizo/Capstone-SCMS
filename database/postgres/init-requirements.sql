-- SMS Requirements & Deadlines Database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE TABLE IF NOT EXISTS calendar_snapshots (
    sync_id VARCHAR(100) PRIMARY KEY,
    term_code VARCHAR(20) NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial requirement definition for BSIT Term 1
INSERT INTO requirements (id, program_code, term_code, requirement_type, name, description, status) VALUES
    ('req-1111-1111-1111-1111-111111111111', 'BSIT', '2026-1S', 'OBTL_SYLLABUS', 'PUPQC Outcomes-Based Teaching & Learning Syllabus', 'Official OBTL Syllabus template compliant with CHED CMO 25 s. 2015', 'PUBLISHED')
ON CONFLICT (id) DO NOTHING;
