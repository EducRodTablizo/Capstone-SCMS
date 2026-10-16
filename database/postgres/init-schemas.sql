-- Syllabus Compliance Monitoring System (SCMS) - Schema Initialization
-- Polytechnic University of the Philippines - Quezon City Campus (PUPQC)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES TABLE (Strictly Two Roles: Academic Head & Faculty Staff)
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

-- 3. PROGRAMS TABLE (Academic Programs under PUPQC)
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO programs (code, name, description) VALUES
    ('BSIT', 'Bachelor of Science in Information Technology', 'College of Computer and Information Sciences'),
    ('BSBA-HRM', 'Bachelor of Science in Business Administration Major in Human Resource Management', 'College of Business Administration'),
    ('BSBA-MM', 'Bachelor of Science in Business Administration Major in Marketing Management', 'College of Business Administration'),
    ('BSENTREP', 'Bachelor of Science in Entrepreneurship', 'College of Business Administration'),
    ('DOMT', 'Diploma in Office Management Technology', 'College of Communication')
ON CONFLICT (code) DO NOTHING;

-- 3b. SUBJECT MASTER CATALOG (ACAS Single Source of Truth for Academic Courses)
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(id),
    course_code VARCHAR(50) UNIQUE NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    credit_units INTEGER DEFAULT 3,
    pre_requisites VARCHAR(255),
    co_requisites VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO courses (program_id, course_code, course_title, credit_units, pre_requisites, description)
SELECT id, 'INTE 401', 'INFORMATION ASSURANCE AND SECURITY 2', 3, 'INTE 302', 'Exploration of operational, technical, and managerial pillars of information security (DevSecOps, Cloud Security, Digital Forensics, GRC)'
FROM programs WHERE code = 'BSIT'
ON CONFLICT (course_code) DO NOTHING;

-- 4. TERM CALENDARS TABLE (Official Campus Academic Terms)
CREATE TABLE IF NOT EXISTS term_calendars (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year VARCHAR(50) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (academic_year, semester)
);

INSERT INTO term_calendars (academic_year, semester, start_date, end_date, is_active) VALUES
    ('A.Y. 2026-2027', '1st Semester', '2026-09-01', '2027-01-31', TRUE),
    ('A.Y. 2026-2027', '2nd Semester', '2027-02-15', '2027-06-30', FALSE)
ON CONFLICT (academic_year, semester) DO NOTHING;

-- 5. REQUIREMENT DEFINITIONS TABLE (Sprint 2: SCMS-004, SCMS-005)
CREATE TABLE IF NOT EXISTS requirement_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(id),
    term_calendar_id UUID NOT NULL REFERENCES term_calendars(id),
    requirement_type VARCHAR(100) DEFAULT 'Syllabus',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    deadline_at TIMESTAMP WITH TIME ZONE, -- Can be null during DRAFT, mandatory when PUBLISHED
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

-- 8. AUDIT LOGS TABLE (Sprint 2: SCMS-014 Append-Only Immutable Log)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID REFERENCES users(id),
    actor_name VARCHAR(150),
    actor_role VARCHAR(50),
    action_type VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID,
    previous_value JSONB,
    new_value JSONB,
    details JSONB,
    client_ip VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Database-Level Enforcement of Append-Only (AC 2 of SCMS-014)
-- Reject all UPDATE and DELETE operations on audit_logs
CREATE OR REPLACE FUNCTION reject_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SCMS Security Violation: audit_logs table is append-only. Modification or deletion is strictly rejected.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_audit_update ON audit_logs;
CREATE TRIGGER trg_protect_audit_update
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION reject_audit_modification();
