import { pool } from '../config/db.js';

export const AssignmentModel = {
  /**
   * Create an assignment with optional course mapping and group targeting inside an atomic transaction
   */
  async createAssignment({
    professorId,
    title,
    description,
    dueDate,
    onedriveLink,
    scope,
    courseId = null,
    submissionType = 'INDIVIDUAL',
    groupIds = [],
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify course exists if courseId is provided
      if (courseId) {
        const checkCourseQuery = `SELECT id FROM courses WHERE id = $1;`;
        const { rows: courseRows } = await client.query(checkCourseQuery, [courseId]);
        if (courseRows.length === 0) {
          await client.query('ROLLBACK');
          const err = new Error('Specified course does not exist.');
          err.statusCode = 400;
          throw err;
        }
      }

      const uniqueGroupIds = Array.from(new Set(groupIds));

      // If scope is SPECIFIC_GROUPS, verify all specified groups exist
      if (scope === 'SPECIFIC_GROUPS') {
        const checkGroupsQuery = `
          SELECT id FROM groups WHERE id = ANY($1::uuid[]);
        `;
        const { rows: existingGroups } = await client.query(checkGroupsQuery, [uniqueGroupIds]);

        if (existingGroups.length !== uniqueGroupIds.length) {
          await client.query('ROLLBACK');
          const err = new Error('One or more specified target groups do not exist.');
          err.statusCode = 400;
          throw err;
        }
      }

      // 1. Insert Assignment
      const insertAssignmentQuery = `
        INSERT INTO assignments (professor_id, title, description, due_date, onedrive_link, scope, course_id, submission_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, professor_id, title, description, due_date, onedrive_link, scope, course_id, submission_type, created_at, updated_at;
      `;
      const { rows: assignmentRows } = await client.query(insertAssignmentQuery, [
        professorId,
        title.trim(),
        description.trim(),
        dueDate,
        onedriveLink.trim(),
        scope,
        courseId || null,
        submissionType || 'INDIVIDUAL',
      ]);
      const assignment = assignmentRows[0];

      // 2. Insert target group mappings if scope is SPECIFIC_GROUPS
      if (scope === 'SPECIFIC_GROUPS' && uniqueGroupIds.length > 0) {
        for (const groupId of uniqueGroupIds) {
          const insertMappingQuery = `
            INSERT INTO assignment_groups (assignment_id, group_id)
            VALUES ($1, $2);
          `;
          await client.query(insertMappingQuery, [assignment.id, groupId]);
        }
      }

      await client.query('COMMIT');

      return {
        ...assignment,
        assigned_group_ids: scope === 'SPECIFIC_GROUPS' ? uniqueGroupIds : [],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * List all assignments for Administrator view
   */
  async findAllForAdmin() {
    const query = `
      SELECT a.id, a.professor_id, a.title, a.description, a.due_date, a.onedrive_link, a.scope,
             a.course_id, a.submission_type,
             c.title as course_title, c.course_code,
             a.created_at, a.updated_at,
             u.full_name as professor_name, u.email as professor_email,
             COUNT(ag.group_id)::int as assigned_group_count
      FROM assignments a
      JOIN users u ON a.professor_id = u.id
      LEFT JOIN courses c ON a.course_id = c.id
      LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
      GROUP BY a.id, c.title, c.course_code, u.full_name, u.email
      ORDER BY a.due_date ASC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  /**
   * List eligible assignments for Student view
   * Respects course enrollment for course-scoped assignments,
   * while preserving legacy Round 1 visibility for unassigned courses (course_id IS NULL)
   */
  async findAllForStudent(studentId) {
    // 1. Get student's current active group ID if any
    const groupQuery = `
      SELECT group_id FROM group_members WHERE student_id = $1 LIMIT 1;
    `;
    const { rows: groupRows } = await pool.query(groupQuery, [studentId]);
    const currentGroupId = groupRows.length > 0 ? groupRows[0].group_id : null;

    const query = `
      SELECT DISTINCT a.id, a.professor_id, a.title, a.description, a.due_date,
             a.onedrive_link, a.scope, a.course_id, a.submission_type,
             c.title as course_title, c.course_code,
             a.created_at, a.updated_at,
             u.full_name as professor_name, u.email as professor_email
      FROM assignments a
      JOIN users u ON a.professor_id = u.id
      LEFT JOIN courses c ON a.course_id = c.id
      LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
      WHERE
        -- If course_id is set, student must be enrolled in the course. Legacy NULL courses are open to all.
        (a.course_id IS NULL OR EXISTS (
          SELECT 1 FROM course_enrollments ce WHERE ce.course_id = a.course_id AND ce.student_id = $1
        ))
        AND
        -- Target scope check
        (a.scope = 'ALL' OR (a.scope = 'SPECIFIC_GROUPS' AND ag.group_id = $2))
      ORDER BY a.due_date ASC;
    `;
    const { rows } = await pool.query(query, [studentId, currentGroupId]);
    return rows;
  },

  /**
   * Find single assignment by ID with creator details and course info
   */
  async findById(assignmentId) {
    const query = `
      SELECT a.id, a.professor_id, a.title, a.description, a.due_date, a.onedrive_link, a.scope,
             a.course_id, a.submission_type,
             c.title as course_title, c.course_code,
             a.created_at, a.updated_at,
             u.full_name as professor_name, u.email as professor_email
      FROM assignments a
      JOIN users u ON a.professor_id = u.id
      LEFT JOIN courses c ON a.course_id = c.id
      WHERE a.id = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [assignmentId]);
    return rows[0] || null;
  },

  /**
   * Get assigned groups metadata for an assignment
   */
  async getAssignedGroups(assignmentId) {
    const query = `
      SELECT g.id, g.name
      FROM assignment_groups ag
      JOIN groups g ON ag.group_id = g.id
      WHERE ag.assignment_id = $1
      ORDER BY g.name ASC;
    `;
    const { rows } = await pool.query(query, [assignmentId]);
    return rows;
  },

  /**
   * Check if a student is eligible to view/submit an assignment
   * (Enforces course enrollment for course-scoped assignments)
   */
  async isStudentEligible(assignmentId, studentId) {
    const query = `
      SELECT a.scope, a.course_id,
             EXISTS(
               SELECT 1
               FROM assignment_groups ag
               JOIN group_members gm ON ag.group_id = gm.group_id
               WHERE ag.assignment_id = a.id AND gm.student_id = $2
             ) as is_group_assigned,
             CASE
               WHEN a.course_id IS NULL THEN true
               ELSE EXISTS (
                 SELECT 1
                 FROM course_enrollments ce
                 WHERE ce.course_id = a.course_id AND ce.student_id = $2
               )
             END as is_course_enrolled
      FROM assignments a
      WHERE a.id = $1;
    `;
    const { rows } = await pool.query(query, [assignmentId, studentId]);
    if (rows.length === 0) return false;

    const { scope, is_group_assigned, is_course_enrolled } = rows[0];

    // If student is not enrolled in the assignment's course, they are not eligible
    if (!is_course_enrolled) return false;

    if (scope === 'ALL') return true;
    return is_group_assigned === true;
  },

  /**
   * Update assignment details and group targeting in an atomic transaction
   */
  async updateAssignment({
    assignmentId,
    editorId,
    title,
    description,
    dueDate,
    onedriveLink,
    scope,
    courseId = null,
    submissionType = 'INDIVIDUAL',
    groupIds = [],
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch assignment with row-level lock (FOR UPDATE)
      const fetchQuery = `
        SELECT id, professor_id, scope FROM assignments WHERE id = $1 FOR UPDATE;
      `;
      const { rows } = await client.query(fetchQuery, [assignmentId]);
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        const err = new Error('Assignment not found.');
        err.statusCode = 404;
        throw err;
      }

      const existing = rows[0];

      // Policy: Professor who created the assignment can edit it
      if (existing.professor_id !== editorId) {
        await client.query('ROLLBACK');
        const err = new Error('Only the professor who created this assignment can edit it.');
        err.statusCode = 403;
        throw err;
      }

      // Verify course exists if courseId is provided
      if (courseId) {
        const checkCourseQuery = `SELECT id FROM courses WHERE id = $1;`;
        const { rows: courseRows } = await client.query(checkCourseQuery, [courseId]);
        if (courseRows.length === 0) {
          await client.query('ROLLBACK');
          const err = new Error('Specified course does not exist.');
          err.statusCode = 400;
          throw err;
        }
      }

      const uniqueGroupIds = Array.from(new Set(groupIds));

      // Verify groups if SPECIFIC_GROUPS
      if (scope === 'SPECIFIC_GROUPS') {
        const checkGroupsQuery = `
          SELECT id FROM groups WHERE id = ANY($1::uuid[]);
        `;
        const { rows: existingGroups } = await client.query(checkGroupsQuery, [uniqueGroupIds]);

        if (existingGroups.length !== uniqueGroupIds.length) {
          await client.query('ROLLBACK');
          const err = new Error('One or more specified target groups do not exist.');
          err.statusCode = 400;
          throw err;
        }
      }

      // 2. Update Assignment
      const updateQuery = `
        UPDATE assignments
        SET title = $1, description = $2, due_date = $3, onedrive_link = $4, scope = $5,
            course_id = $6, submission_type = $7, updated_at = NOW()
        WHERE id = $8
        RETURNING id, professor_id, title, description, due_date, onedrive_link, scope, course_id, submission_type, created_at, updated_at;
      `;
      const { rows: updatedRows } = await client.query(updateQuery, [
        title.trim(),
        description.trim(),
        dueDate,
        onedriveLink.trim(),
        scope,
        courseId || null,
        submissionType || 'INDIVIDUAL',
        assignmentId,
      ]);
      const updatedAssignment = updatedRows[0];

      // 3. Atomically replace target group mappings
      // First delete existing mappings
      await client.query('DELETE FROM assignment_groups WHERE assignment_id = $1;', [assignmentId]);

      // If scope is SPECIFIC_GROUPS, insert new mappings
      if (scope === 'SPECIFIC_GROUPS' && uniqueGroupIds.length > 0) {
        for (const groupId of uniqueGroupIds) {
          const insertMappingQuery = `
            INSERT INTO assignment_groups (assignment_id, group_id)
            VALUES ($1, $2);
          `;
          await client.query(insertMappingQuery, [assignmentId, groupId]);
        }
      }

      await client.query('COMMIT');

      return {
        ...updatedAssignment,
        assigned_group_ids: scope === 'SPECIFIC_GROUPS' ? uniqueGroupIds : [],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Helper: Retrieve minimal groups listing for Admin targeting selector
   */
  async getAllGroupsForAdmin() {
    const query = `
      SELECT g.id, g.name, g.created_at,
             COUNT(gm.student_id)::int as member_count
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      GROUP BY g.id
      ORDER BY g.name ASC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  },
};
