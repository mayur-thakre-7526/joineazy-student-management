-- -----------------------------------------------------------------------------
-- Joineazy Migration 001: Initial Core Schema
-- Tables: users, groups, group_members, group_invitations,
--         assignments, assignment_groups, submission_confirmations
-- -----------------------------------------------------------------------------

-- Ensure pgcrypto extension is available for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

-- 2. GROUPS TABLE
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups (created_by);

-- 3. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Prevent duplicate membership in same group
    CONSTRAINT uq_group_member UNIQUE (group_id, student_id),
    -- MVP Constraint: One active group per student
    CONSTRAINT uq_student_active_group UNIQUE (student_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_student_id ON group_members (student_id);

-- 4. GROUP INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS group_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    invited_student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_group_id ON group_invitations (group_id);
CREATE INDEX IF NOT EXISTS idx_invitations_student_id ON group_invitations (invited_student_id);

-- Prevent duplicate pending invitations for same student and group
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_invitation 
ON group_invitations (group_id, invited_student_id) 
WHERE status = 'PENDING';

-- 5. ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    onedrive_link TEXT NOT NULL,
    scope VARCHAR(20) NOT NULL DEFAULT 'ALL' CHECK (scope IN ('ALL', 'SPECIFIC_GROUPS')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_professor_id ON assignments (professor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments (due_date);

-- 6. ASSIGNMENT GROUPS (Join table for scoped assignments)
CREATE TABLE IF NOT EXISTS assignment_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    CONSTRAINT uq_assignment_group UNIQUE (assignment_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_groups_assignment_id ON assignment_groups (assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_groups_group_id ON assignment_groups (group_id);

-- 7. SUBMISSION CONFIRMATIONS TABLE
CREATE TABLE IF NOT EXISTS submission_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Prevent duplicate confirmations for the same assignment by the same student
    CONSTRAINT uq_submission_confirmation UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submission_confirmations (assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submission_confirmations (student_id);
