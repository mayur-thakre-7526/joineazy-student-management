import { pool } from '../config/db.js';

export const AssignmentModel = {
  /**
   * Create an assignment with optional group targeting inside an atomic transaction
   */
  async createAssignment({
    professorId,
    title,
    description,
    dueDate,
    onedriveLink,
    scope,
    groupIds = [],
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

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
        INSERT INTO assignments (professor_id, title, description, due_date, onedrive_link, scope)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, professor_id, title, description, due_date, onedrive_link, scope, created_at, updated_at;
      `;
      const { rows: assignmentRows } = await client.query(insertAssignmentQuery, [
        professorId,
        title.trim(),
        description.trim(),
        dueDate,
        onedriveLink.trim(),
        scope,
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
             a.created_at, a.updated_at,
             u.full_name as professor_name, u.email as professor_email,
             COUNT(ag.group_id)::int as assigned_group_count
      FROM assignments a
      JOIN users u ON a.professor_id = u.id
      LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
      GROUP BY a.id, u.full_name, u.email
      ORDER BY a.due_date ASC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  /**
   * List eligible assignments for Student view
   */
  async findAllForStudent(studentId) {
    // 1. Get student's current active group ID if any
    const groupQuery = `
      SELECT group_id FROM group_members WHERE student_id = $1 LIMIT 1;
    `;
    const { rows: groupRows } = await pool.query(groupQuery, [studentId]);
    const currentGroupId = groupRows.length > 0 ? groupRows[0].group_id : null;

    if (currentGroupId) {
      // Grouped student sees scope ALL + scope SPECIFIC_GROUPS targeting their group
      const query = `
        SELECT DISTINCT a.id, a.professor_id, a.title, a.description, a.due_date,
               a.onedrive_link, a.scope, a.created_at, a.updated_at,
               u.full_name as professor_name, u.email as professor_email
        FROM assignments a
        JOIN users u ON a.professor_id = u.id
        LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
        WHERE a.scope = 'ALL' OR (a.scope = 'SPECIFIC_GROUPS' AND ag.group_id = $1)
        ORDER BY a.due_date ASC;
      `;
      const { rows } = await pool.query(query, [currentGroupId]);
      return rows;
    } else {
      // Ungrouped student sees only scope ALL assignments
      const query = `
        SELECT a.id, a.professor_id, a.title, a.description, a.due_date,
               a.onedrive_link, a.scope, a.created_at, a.updated_at,
               u.full_name as professor_name, u.email as professor_email
        FROM assignments a
        JOIN users u ON a.professor_id = u.id
        WHERE a.scope = 'ALL'
        ORDER BY a.due_date ASC;
      `;
      const { rows } = await pool.query(query);
      return rows;
    }
  },

  /**
   * Find single assignment by ID with creator details
   */
  async findById(assignmentId) {
    const query = `
      SELECT a.id, a.professor_id, a.title, a.description, a.due_date, a.onedrive_link, a.scope,
             a.created_at, a.updated_at,
             u.full_name as professor_name, u.email as professor_email
      FROM assignments a
      JOIN users u ON a.professor_id = u.id
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
   * Check if a student is eligible to view an assignment
   */
  async isStudentEligible(assignmentId, studentId) {
    const query = `
      SELECT a.scope,
             EXISTS(
               SELECT 1 
               FROM assignment_groups ag
               JOIN group_members gm ON ag.group_id = gm.group_id
               WHERE ag.assignment_id = a.id AND gm.student_id = $2
             ) as is_group_assigned
      FROM assignments a
      WHERE a.id = $1;
    `;
    const { rows } = await pool.query(query, [assignmentId, studentId]);
    if (rows.length === 0) return false;

    const { scope, is_group_assigned } = rows[0];
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
        SET title = $1, description = $2, due_date = $3, onedrive_link = $4, scope = $5, updated_at = NOW()
        WHERE id = $6
        RETURNING id, professor_id, title, description, due_date, onedrive_link, scope, created_at, updated_at;
      `;
      const { rows: updatedRows } = await client.query(updateQuery, [
        title.trim(),
        description.trim(),
        dueDate,
        onedriveLink.trim(),
        scope,
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
