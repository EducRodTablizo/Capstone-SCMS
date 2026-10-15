-- Syllabus Compliance Monitoring System (SCMS) - Schema Initialization
-- Polytechnic University of the Philippines - Quezon City Campus (PUPQC)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES TABLE (Strictly Two Roles)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (role_code, description) VALUES
    ('ACADEMIC_HEAD', 'Campus Academic Head with global program oversight and single-level approval authority'),
    ('FACULTY_STAFF', 'Faculty Staff member with assigned subject syllabus submission responsibilities')
ON CONFLICT (role_code) DO NOTHING;

-- 2. USERS TABLE (SCMS Local User Accounts)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    fms_faculty_id VARCHAR(100),
    college VARCHAR(150),
    unit VARCHAR(150),
    role_id UUID NOT NULL REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PROGRAMS TABLE
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TERM CALENDARS TABLE
CREATE TABLE IF NOT EXISTS term_calendars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year VARCHAR(50) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (academic_year, semester)
);

-- 5. REQUIREMENT DEFINITIONS TABLE
CREATE TABLE IF NOT EXISTS requirement_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(id),
    term_calendar_id UUID NOT NULL REFERENCES term_calendars(id),
    requirement_type VARCHAR(100) DEFAULT 'Syllabus',
    title VARCHAR(255) NOT NULL,
    deadline_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, CLOSED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. SUBMISSIONS TABLE (State Machine & Direct Compliance)
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID NOT NULL REFERENCES requirement_definitions(id),
    faculty_id UUID NOT NULL REFERENCES users(id),
    subject_code VARCHAR(50) NOT NULL,
    subject_title VARCHAR(255) NOT NULL,
    current_status VARCHAR(50) DEFAULT 'NOT_SUBMITTED', -- NOT_SUBMITTED, SUBMITTED, UNDER_REVIEW, RETURNED, RESUBMITTED, APPROVED
    is_overdue BOOLEAN DEFAULT FALSE,
    mongo_file_id VARCHAR(100),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. REVIEW DECISIONS TABLE (Single Reviewer: Academic Head)
CREATE TABLE IF NOT EXISTS review_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id),
    academic_head_id UUID NOT NULL REFERENCES users(id),
    decision VARCHAR(50) NOT NULL, -- APPROVED, RETURNED
    comments TEXT,
    decided_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. AUDIT LOGS TABLE (Append-Only Immutable Log)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID REFERENCES users(id),
    action_type VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID,
    client_ip INET,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Constraint preventing UPDATE and DELETE on audit_logs
CREATE OR REPLACE RULE no_update_audit AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_audit AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
