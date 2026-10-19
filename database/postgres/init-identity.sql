-- SMS Identity & Roles Database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Seed Academic Head and Faculty Staff accounts (Argon2id hashed, Decision A9)
INSERT INTO users (id, email, password_hash, first_name, last_name, college, unit, role_id)
SELECT 
    '11111111-1111-1111-1111-111111111111',
    'academic.head@pup.edu.ph',
    '$argon2id$v=19$m=65536,t=3,p=4$cHVwcWNfc2FsdF8yMDI2$k8lGz8fV9Q2L/9fXJqM1q7L2q8x1m9v3b5n7p9q1w3e',
    'Demetria',
    'Academic',
    'Academic Affairs Office',
    'Office of the Academic Head',
    r.id
FROM roles r WHERE r.role_code = 'ACADEMIC_HEAD'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, password_hash, first_name, last_name, college, unit, role_id)
SELECT 
    '22222222-2222-2222-2222-222222222222',
    'faculty@pup.edu.ph',
    '$argon2id$v=19$m=65536,t=3,p=4$cHVwcWNfc2FsdF8yMDI2$k8lGz8fV9Q2L/9fXJqM1q7L2q8x1m9v3b5n7p9q1w3e',
    'Juan',
    'Dela Cruz',
    'College of Computer and Information Sciences',
    'Department of Information Technology',
    r.id
FROM roles r WHERE r.role_code = 'FACULTY_STAFF'
ON CONFLICT (email) DO NOTHING;
