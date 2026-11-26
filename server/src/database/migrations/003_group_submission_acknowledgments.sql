-- -----------------------------------------------------------------------------
-- Joineazy Migration 003: Group Submission Acknowledgments & Member Snapshots
-- -----------------------------------------------------------------------------

-- 1. GROUP SUBMISSION ACKNOWLEDGMENTS TABLE
-- Stores group-level submission acknowledgment performed exclusively by the group leader.
CREATE TABLE IF NOT EXISTS group_submission_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    acknowledged_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_group_assignment_acknowledgment UNIQUE (assignment_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_gsa_assignment_id ON group_submission_acknowledgments (assignment_id);
CREATE INDEX IF NOT EXISTS idx_gsa_group_id ON group_submission_acknowledgments (group_id);
CREATE INDEX IF NOT EXISTS idx_gsa_acknowledged_by ON group_submission_acknowledgments (acknowledged_by);

-- 2. GROUP SUBMISSION MEMBER SNAPSHOTS TABLE
-- Captures immutable snapshot of group members at the exact moment of acknowledgment.
-- Policy: Students active in the group at acknowledgment time are permanently recorded.
-- If members join later or leave, this table preserves historical submission integrity.
CREATE TABLE IF NOT EXISTS group_submission_member_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acknowledgment_id UUID NOT NULL REFERENCES group_submission_acknowledgments(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_leader BOOLEAN NOT NULL DEFAULT FALSE,
    snapshotted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_acknowledgment_member_snapshot UNIQUE (acknowledgment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_gsms_acknowledgment_id ON group_submission_member_snapshots (acknowledgment_id);
CREATE INDEX IF NOT EXISTS idx_gsms_assignment_id ON group_submission_member_snapshots (assignment_id);
CREATE INDEX IF NOT EXISTS idx_gsms_group_id ON group_submission_member_snapshots (group_id);
CREATE INDEX IF NOT EXISTS idx_gsms_student_id ON group_submission_member_snapshots (student_id);
