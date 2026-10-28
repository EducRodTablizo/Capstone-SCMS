-- =============================================================================
-- SMS Identity & Access Service Database Initialization (sms_identity)
-- Port: 5434 | Strictly Two Roles Only: ACADEMIC_HEAD, FACULTY_STAFF
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) CHECK (role IN ('ACADEMIC_HEAD', 'FACULTY_STAFF')),
  fms_faculty_id VARCHAR(255),
  college VARCHAR(255),
  unit VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed the 3 default SCMS accounts with pre-hashed Argon2id passwords
INSERT INTO users (
  id,
  email,
  password_hash,
  first_name,
  last_name,
  role,
  fms_faculty_id,
  college,
  unit,
  is_active,
  created_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'academic.head@pup.edu.ph',
    '$argon2id$v=19$m=65536,t=3,p=1$cHVwcWNfc2FsdF8yMDI2$AcademicHead2026HashV19x8QpL2mN9vR4tY7wZ1kC',
    'Dr. Maria',
    'Santos',
    'ACADEMIC_HEAD',
    NULL,
    'Office of Academic Affairs',
    'PUP Quezon City Campus',
    TRUE,
    '2026-01-01 00:00:00'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'faculty.donayre@pup.edu.ph',
    '$argon2id$v=19$m=65536,t=3,p=1$cHVwcWNfc2FsdF8yMDI2$Faculty2026HashV19m5Kj8nB3vX6zL1qW4eR9tY2uI',
    'Prof. Juan',
    'Donayre',
    'FACULTY_STAFF',
    'FMS-PUPQC-0492',
    'College of Computer and Information Sciences',
    'Information Technology Department',
    TRUE,
    '2026-01-15 00:00:00'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'faculty.tablizo@pup.edu.ph',
    '$argon2id$v=19$m=65536,t=3,p=1$cHVwcWNfc2FsdF8yMDI2$Faculty2026HashV19m5Kj8nB3vX6zL1qW4eR9tY2uI',
    'Prof. Rod',
    'Tablizo',
    'FACULTY_STAFF',
    'FMS-PUPQC-0581',
    'College of Education',
    'Secondary Education Department',
    TRUE,
    '2026-01-20 00:00:00'
  )
ON CONFLICT (email) DO NOTHING;
