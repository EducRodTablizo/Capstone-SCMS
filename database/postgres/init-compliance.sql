-- Syllabus Compliance Monitoring System (SCMS) - Compliance Service Database
-- Service: apps/compliance-monitoring-service (Port 3005)
-- Database: sms_compliance (Port 5439)
-- Responsibilities: Live Compliance Aggregation, Periodic Snapshots, Overdue Cron Jobs, AACCUP/CHED Exports

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPLIANCE SNAPSHOTS (AUD-012, AUD-015: Historical & Periodic Compliance Rate Snapshots)
CREATE TABLE IF NOT EXISTS compliance_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_code VARCHAR(100) UNIQUE NOT NULL,
    term_id VARCHAR(50) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    program_code VARCHAR(50),
    snapshot_type VARCHAR(50) NOT NULL CHECK (snapshot_type IN ('DAILY', 'WEEKLY', 'MIDTERM_CUTOFF', 'FINAL_CUTOFF', 'ON_DEMAND')),
    total_expected_submissions INTEGER NOT NULL DEFAULT 0,
    total_submitted INTEGER NOT NULL DEFAULT 0,
    total_approved INTEGER NOT NULL DEFAULT 0,
    total_returned INTEGER NOT NULL DEFAULT 0,
    total_overdue INTEGER NOT NULL DEFAULT 0,
    compliance_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    status_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    triggered_by_user_id VARCHAR(100) NOT NULL DEFAULT 'SYSTEM_CRON',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. COMPLIANCE EXPORTS (SMS-037: Official PDF/CSV Accreditation Summary Exports)
CREATE TABLE IF NOT EXISTS compliance_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    export_reference_no VARCHAR(100) UNIQUE NOT NULL,
    term_id VARCHAR(50) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    program_code VARCHAR(50),
    export_format VARCHAR(10) NOT NULL CHECK (export_format IN ('PDF', 'CSV')),
    export_purpose VARCHAR(100) NOT NULL DEFAULT 'AACCUP_CHED_ACCREDITATION',
    generated_by_user_id VARCHAR(100) NOT NULL,
    generated_by_name VARCHAR(150) NOT NULL,
    compliance_rate_recorded NUMERIC(5, 2) NOT NULL,
    file_storage_path VARCHAR(255),
    payload_summary JSONB DEFAULT '{}'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. OVERDUE TRACKING JOBS (SMS-006: Scheduled Automated Overdue Calculation Runs)
CREATE TABLE IF NOT EXISTS overdue_tracking_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_run_id VARCHAR(100) NOT NULL,
    term_id VARCHAR(50) NOT NULL,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    items_scanned INTEGER NOT NULL DEFAULT 0,
    items_flagged_overdue INTEGER NOT NULL DEFAULT 0,
    execution_duration_ms INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PARTIAL')),
    error_message TEXT
);

-- 4. Initial Baseline Seed Data (PUPQC Term 1 Baseline)
INSERT INTO compliance_snapshots (
    snapshot_code, term_id, academic_year, semester, program_code, snapshot_type,
    total_expected_submissions, total_submitted, total_approved, total_returned, total_overdue,
    compliance_percentage, status_breakdown, triggered_by_user_id, notes
) VALUES (
    'SNAP-2026-1T-BASELINE', '2026-1T', '2026-2027', 'First Semester', 'BSIT', 'ON_DEMAND',
    10, 0, 0, 0, 0,
    0.00, '{"unassigned": 2, "not_submitted": 8, "submitted": 0, "under_review": 0, "returned": 0, "resubmitted": 0, "approved": 0, "overdue": 0}'::jsonb,
    'SYSTEM_INIT', 'Baseline initial snapshot for Academic Year 2026-2027 Term 1'
) ON CONFLICT (snapshot_code) DO NOTHING;
