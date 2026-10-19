-- SMS Submissions & Review Database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID NOT NULL,
    faculty_id VARCHAR(100) NOT NULL,
    course_code VARCHAR(50) NOT NULL,
    section_label VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Not Submitted' CHECK (status IN ('Not Submitted', 'Submitted', 'Under Review', 'Returned', 'Resubmitted', 'Approved', 'Unassigned')),
    file_id VARCHAR(100),
    file_name VARCHAR(255),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id),
    reviewer_name VARCHAR(255) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('Approved', 'Returned')),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
