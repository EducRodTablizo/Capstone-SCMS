-- Migration: Align submissions status check constraint, add fields, and create submission_versions table
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_check;

ALTER TABLE submissions ADD CONSTRAINT submissions_status_check 
    CHECK (status IN ('Not Submitted', 'Submitted', 'Under Review', 'Returned', 'Resubmitted', 'Approved', 'Overdue', 'Unassigned'));

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS substitute_id VARCHAR(100);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS fms_assignment_version INT DEFAULT 1;

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
