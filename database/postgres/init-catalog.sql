-- SMS Academic Catalog Database (SSOT)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Phased out')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO programs (id, code, name, description, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'BSIT', 'Bachelor of Science in Information Technology', 'College of Computer and Information Sciences', 'Active'),
    ('22222222-2222-2222-2222-222222222222', 'BSBA-HRM', 'Bachelor of Science in Business Administration Major in Human Resource Management', 'College of Business Administration', 'Active'),
    ('33333333-3333-3333-3333-333333333333', 'BSBA-MM', 'Bachelor of Science in Business Administration Major in Marketing Management', 'College of Business Administration', 'Active'),
    ('44444444-4444-4444-4444-444444444444', 'BSENTREP', 'Bachelor of Science in Entrepreneurship', 'College of Business Administration', 'Active'),
    ('55555555-5555-5555-5555-555555555555', 'DOMT', 'Diploma in Office Management Technology', 'College of Communication', 'Phased out')
ON CONFLICT (code) DO UPDATE SET status = EXCLUDED.status;

-- Course Master Table (SMS-022)
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_code VARCHAR(50) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    credit_units NUMERIC(3,1) NOT NULL DEFAULT 3.0,
    lecture_hours NUMERIC(3,1) NOT NULL DEFAULT 3.0,
    lab_hours NUMERIC(3,1) NOT NULL DEFAULT 0.0,
    description TEXT,
    prerequisites TEXT[],
    co_requisites TEXT[],
    requires_lab BOOLEAN DEFAULT FALSE,
    lab_type VARCHAR(100),
    special_software TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Draft', 'Active', 'Revised', 'Retired')),
    replacement_course_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (course_code, version)
);
