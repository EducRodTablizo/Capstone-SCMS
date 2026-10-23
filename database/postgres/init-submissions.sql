-- SMS Submissions & Review Database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID NOT NULL,
    faculty_id VARCHAR(100) NOT NULL,
    substitute_id VARCHAR(100),
    fms_assignment_version INT DEFAULT 1,
    course_code VARCHAR(50) NOT NULL,
    section_label VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Not Submitted' CHECK (status IN ('Not Submitted', 'Submitted', 'Under Review', 'Returned', 'Resubmitted', 'Approved', 'Overdue', 'Unassigned')),
    file_id VARCHAR(100),
    file_name VARCHAR(255),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submission_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    reviewer_name VARCHAR(255) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('Approved', 'Returned')),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
