-- ============================================================
-- SPRINT 3 DATABASE SCHEMA: Academic Terms & Calendar SSOT
-- Target: sms_requirements (Port 5436)
-- User Stories: SMS-018, SMS-032, SMS-033, SMS-005
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Academic Terms Table (SMS-018)
CREATE TABLE IF NOT EXISTS academic_terms (
    term_code VARCHAR(20) PRIMARY KEY,
    academic_year VARCHAR(20) NOT NULL,
    semester_number INT NOT NULL,
    semester_label VARCHAR(50) NOT NULL,
    display_label VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    submission_window_start TIMESTAMPTZ,
    submission_window_end TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Active', 'Closed', 'Archived')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed default active term matching CCMS fixture
INSERT INTO academic_terms (
    term_code, academic_year, semester_number, semester_label, display_label, 
    start_date, end_date, submission_window_start, submission_window_end, status
) VALUES (
    '2026-1S', '2026-2027', 1, '1ST_SEMESTER', 'A.Y. 2026-2027 1st Semester',
    '2026-09-01', '2027-01-30', '2026-10-01 00:00:00+08', '2026-10-31 23:59:59+08', 'Active'
) ON CONFLICT (term_code) DO UPDATE SET
    submission_window_start = EXCLUDED.submission_window_start,
    submission_window_end = EXCLUDED.submission_window_end,
    status = EXCLUDED.status;

-- 2. Calendar Snapshots Raw Audit Table (SMS-032)
CREATE TABLE IF NOT EXISTS calendar_snapshots (
    sync_id VARCHAR(100) PRIMARY KEY,
    term_code VARCHAR(20) NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Normalized Calendar Events Table for fast deadline pushout (SMS-032 & SMS-033)
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(100) NOT NULL,
    sync_id VARCHAR(100) NOT NULL,
    term_code VARCHAR(20) NOT NULL REFERENCES academic_terms(term_code) ON DELETE CASCADE,
    date DATE NOT NULL,
    name VARCHAR(255) NOT NULL,
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN ('REGULAR_HOLIDAY', 'SPECIAL_NON_WORKING', 'SUSPENSION', 'ACADEMIC_EVENT')),
    applies_to VARCHAR(50) NOT NULL CHECK (applies_to IN ('CLASSES', 'WORK', 'BOTH')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_calendar_event UNIQUE (term_code, date, name)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(term_code, date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(entry_type, applies_to);

-- Seed baseline holidays from CCMS fixture
INSERT INTO calendar_events (event_id, sync_id, term_code, date, name, entry_type, applies_to)
VALUES
    ('hol-2026-1030', 'ccms-seed-001', '2026-10-30', 'Barangay and SK Elections', 'SPECIAL_NON_WORKING', 'BOTH'),
    ('hol-2026-1101', 'ccms-seed-001', '2026-11-01', 'All Saints Day', 'SPECIAL_NON_WORKING', 'BOTH'),
    ('hol-2026-1130', 'ccms-seed-001', '2026-11-30', 'Bonifacio Day', 'REGULAR_HOLIDAY', 'BOTH'),
    ('hol-2026-1208', 'ccms-seed-001', '2026-12-08', 'Feast of the Immaculate Conception', 'SPECIAL_NON_WORKING', 'BOTH'),
    ('hol-2026-1225', 'ccms-seed-001', '2026-12-25', 'Christmas Day', 'REGULAR_HOLIDAY', 'BOTH'),
    ('hol-2026-1230', 'ccms-seed-001', '2026-12-30', 'Rizal Day', 'REGULAR_HOLIDAY', 'BOTH')
ON CONFLICT (term_code, date, name) DO NOTHING;
