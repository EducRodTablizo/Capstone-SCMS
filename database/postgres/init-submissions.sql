-- SMS Submissions & Review Database (Complete Schema for PostgreSQL Migration)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fms_message_id VARCHAR(255),
    assignment_id VARCHAR(255) UNIQUE,
    assignment_version INT DEFAULT 1,
    requirement_id UUID NOT NULL,
    academic_term_id VARCHAR(100),
    course_id VARCHAR(255),
    block_section_id VARCHAR(255),
    faculty_id VARCHAR(100) NOT NULL,
    substitute_id VARCHAR(100),
    course_code VARCHAR(50) NOT NULL,
    section_label VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Not Submitted' CHECK (status IN ('Not Submitted', 'Submitted', 'Under Review', 'Returned', 'Resubmitted', 'Approved', 'Overdue', 'Unassigned')),
    schedule JSONB,
    file_id VARCHAR(100),
    file_name VARCHAR(255),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS fms_message_id VARCHAR(255);

CREATE TABLE IF NOT EXISTS submission_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    version_label VARCHAR(20) NOT NULL,
    file_id VARCHAR(100),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    submitted_by VARCHAR(100) NOT NULL,
    submitted_by_name VARCHAR(255),
    status_at_version VARCHAR(30) NOT NULL,
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_submission_version UNIQUE (submission_id, version_number)
);

CREATE TABLE IF NOT EXISTS review_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    reviewer_id VARCHAR(100) NOT NULL,
    reviewer_name VARCHAR(255) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('Approved', 'Returned')),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS signatories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewed_by_name VARCHAR(255),
    recommending_name VARCHAR(255),
    approving_name VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_sub_faculty ON submissions(faculty_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_versions_sub_id ON submission_versions(submission_id);
CREATE INDEX IF NOT EXISTS idx_reviews_sub_id ON review_decisions(submission_id);

INSERT INTO signatories (reviewed_by_name, recommending_name, approving_name)
VALUES ('Dr. Maria Santos', 'Assoc. Prof. Demetrio C. Quirino, Jr., PECE', 'Assoc. Prof. Anna Ruby P. Gapasin, PhD')
ON CONFLICT DO NOTHING;
