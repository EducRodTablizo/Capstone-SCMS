-- SMS Academic Catalog Database (SSOT)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Programs Table (SMS-021)
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Phased out')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial programs
INSERT INTO programs (id, code, name, description, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'BSIT', 'Bachelor of Science in Information Technology', 'College of Computer and Information Sciences', 'Active'),
    ('22222222-2222-2222-2222-222222222222', 'BSBA-HRM', 'Bachelor of Science in Business Administration Major in Human Resource Management', 'College of Business Administration', 'Active'),
    ('33333333-3333-3333-3333-333333333333', 'BSBA-MM', 'Bachelor of Science in Business Administration Major in Marketing Management', 'College of Business Administration', 'Active'),
    ('44444444-4444-4444-4444-444444444444', 'BSENTREP', 'Bachelor of Science in Entrepreneurship', 'College of Business Administration', 'Active'),
    ('55555555-5555-5555-5555-555555555555', 'DOMT', 'Diploma in Office Management Technology', 'College of Communication', 'Phased out')
ON CONFLICT (code) DO UPDATE SET status = EXCLUDED.status;

-- 2. Course Master Table (SMS-022)
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_code VARCHAR(50) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    credit_units NUMERIC(3,1) NOT NULL DEFAULT 3.0,
    lecture_hours NUMERIC(3,1) NOT NULL DEFAULT 3.0,
    lab_hours NUMERIC(3,1) NOT NULL DEFAULT 0.0,
    contact_hours NUMERIC(3,1) NOT NULL DEFAULT 3.0,
    description TEXT,
    prerequisites TEXT[],
    co_requisites TEXT[],
    requires_lab BOOLEAN DEFAULT FALSE,
    lab_type VARCHAR(100),
    special_software TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Draft', 'Active', 'Revised', 'Retired')),
    root_course_id UUID,
    replacement_course_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (course_code, version)
);

-- Ensure columns exist if table was previously created
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'contact_hours') THEN
        ALTER TABLE courses ADD COLUMN contact_hours NUMERIC(3,1) NOT NULL DEFAULT 3.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'root_course_id') THEN
        ALTER TABLE courses ADD COLUMN root_course_id UUID;
    END IF;
END $$;

-- Seed initial courses
INSERT INTO courses (id, course_code, version, title, credit_units, lecture_hours, lab_hours, contact_hours, description, requires_lab, lab_type, special_software, status) VALUES
    ('caaaaaaa-1111-1111-1111-111111111111', 'INTE 30103', 1, 'Web Systems and Technologies', 3.0, 2.0, 3.0, 5.0, 'Full-stack web application development and modern web frameworks', TRUE, 'Computer Laboratory', ARRAY['VS Code', 'Node.js', 'PostgreSQL', 'Docker'], 'Active'),
    ('caaaaaaa-2222-2222-2222-222222222222', 'INTE 30093', 1, 'Information Assurance and Security', 3.0, 2.0, 3.0, 5.0, 'Security architectures, cryptography and cyber defense fundamentals', TRUE, 'Computer Laboratory', ARRAY['Wireshark', 'Kali Linux tools', 'Burp Suite'], 'Active'),
    ('caaaaaaa-3333-3333-3333-333333333333', 'COMP 20033', 1, 'Data Structures and Algorithms', 3.0, 2.0, 3.0, 5.0, 'Design and analysis of linear and non-linear data structures', TRUE, 'Computer Laboratory', ARRAY['C++', 'Java', 'VS Code'], 'Active'),
    ('caaaaaaa-4444-4444-4444-444444444444', 'GEED 10013', 1, 'Understanding the Self', 3.0, 3.0, 0.0, 3.0, 'General education course focusing on nature of identity', FALSE, NULL, NULL, 'Active')
ON CONFLICT (course_code, version) DO NOTHING;

-- 3. Curricula Table (SMS-030)
CREATE TABLE IF NOT EXISTS curricula (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
    curriculum_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    effective_start_term VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Draft', 'Active', 'Superseded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial curriculum
INSERT INTO curricula (id, program_id, curriculum_code, name, effective_start_term, description, status) VALUES
    ('baaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'BSIT-2024-CURR', 'BS Information Technology Curriculum 2024 Revision', '2024-1S', 'CHED CMO 25 s. 2015 Compliant BSIT Curriculum', 'Active')
ON CONFLICT (curriculum_code) DO NOTHING;

-- 4. Curriculum Courses Junction Table (SMS-030)
CREATE TABLE IF NOT EXISTS curriculum_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curriculum_id UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    year_level INT NOT NULL CHECK (year_level BETWEEN 1 AND 5),
    semester INT NOT NULL CHECK (semester IN (1, 2, 3)),
    is_major BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (curriculum_id, course_id)
);

-- Seed curriculum courses mapping
INSERT INTO curriculum_courses (curriculum_id, course_id, year_level, semester, is_major) VALUES
    ('baaaaaaa-1111-1111-1111-111111111111', 'caaaaaaa-1111-1111-1111-111111111111', 3, 1, TRUE),
    ('baaaaaaa-1111-1111-1111-111111111111', 'caaaaaaa-2222-2222-2222-222222222222', 3, 1, TRUE),
    ('baaaaaaa-1111-1111-1111-111111111111', 'caaaaaaa-3333-3333-3333-333333333333', 2, 1, TRUE),
    ('baaaaaaa-1111-1111-1111-111111111111', 'caaaaaaa-4444-4444-4444-444444444444', 1, 1, FALSE)
ON CONFLICT (curriculum_id, course_id) DO NOTHING;

-- 5. Block Sections Cohort Management (SMS-031)
CREATE TABLE IF NOT EXISTS block_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
    cohort_admission_year INT NOT NULL,
    year_level INT NOT NULL CHECK (year_level BETWEEN 1 AND 5),
    section_number INT NOT NULL,
    display_label VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Dissolved', 'Merged')),
    merged_into_section_id UUID REFERENCES block_sections(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (program_id, cohort_admission_year, year_level, section_number)
);

-- Seed initial block sections for PUPQC
INSERT INTO block_sections (id, program_id, cohort_admission_year, year_level, section_number, display_label, status) VALUES
    ('daaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 2023, 4, 1, 'BSIT 4-1', 'Active'),
    ('daaaaaaa-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2023, 4, 2, 'BSIT 4-2', 'Active'),
    ('daaaaaaa-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 2024, 3, 1, 'BSIT 3-1', 'Active'),
    ('daaaaaaa-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 2024, 3, 1, 'BSBA-HRM 3-1', 'Active')
ON CONFLICT (program_id, cohort_admission_year, year_level, section_number) DO NOTHING;
