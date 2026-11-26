-- -----------------------------------------------------------------------------
-- Joineazy Migration 002: Courses, Course Enrollments & Assignment Enhancements
-- -----------------------------------------------------------------------------

-- 1. COURSES TABLE
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    course_code VARCHAR(50) NOT NULL,
    description TEXT,
    professor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive unique index on course_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_course_code_lower ON courses (LOWER(course_code));
CREATE INDEX IF NOT EXISTS idx_courses_professor_id ON courses (professor_id);

-- 2. COURSE ENROLLMENTS TABLE (Students enrolled in courses)
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_course_enrollment UNIQUE (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments (course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON course_enrollments (student_id);

-- 3. EXTEND ASSIGNMENTS TABLE
-- Add course_id column (nullable foreign key to preserve legacy Round 1 assignments)
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS course_id UUID NULL REFERENCES courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments (course_id);

-- Add submission_type column with default 'INDIVIDUAL'
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS submission_type VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL';

-- Add check constraint for submission_type if it doesn't already exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_assignments_submission_type'
    ) THEN 
        ALTER TABLE assignments 
        ADD CONSTRAINT chk_assignments_submission_type 
        CHECK (submission_type IN ('INDIVIDUAL', 'GROUP')); 
    END IF; 
END $$;
