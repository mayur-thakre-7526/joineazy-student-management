import { pool } from '../config/db.js';

export const GroupModel = {
  /**
   * Check if student currently belongs to any active group
   */
  async isStudentInAnyGroup(studentId, client = pool) {
    const query = `
      SELECT group_id 
      FROM group_members 
      WHERE student_id = $1 
      LIMIT 1;
    `;
    const { rows } = await client.query(query, [studentId]);
    return rows.length > 0;
  },

  /**
   * Find student's active group with creator and membership metadata
   */
  async findStudentGroup(studentId) {
    const membershipQuery = `
      SELECT gm.group_id, gm.joined_at, g.name, g.created_by, g.created_at,
             u.full_name as creator_name, u.email as creator_email
      FROM group_members gm
      JOIN groups g ON gm.group_id = g.id
      JOIN users u ON g.created_by = u.id
      WHERE gm.student_id = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(membershipQuery, [studentId]);
    if (rows.length === 0) return null;

    const groupMeta = rows[0];
    const members = await this.getGroupMembers(groupMeta.group_id);

    return {
      id: groupMeta.group_id,
      name: groupMeta.name,
      created_by: {
        id: groupMeta.created_by,
        full_name: groupMeta.creator_name,
        email: groupMeta.creator_email,
      },
      created_at: groupMeta.created_at,
      is_creator: groupMeta.created_by === studentId,
      members,
    };
  },

  /**
   * Get all current members of a group with safe fields
   */
  async getGroupMembers(groupId) {
    const query = `
      SELECT u.id, u.full_name, u.email, gm.joined_at,
             (u.id = g.created_by) as is_creator
      FROM group_members gm
      JOIN users u ON gm.student_id = u.id
      JOIN groups g ON gm.group_id = g.id
      WHERE gm.group_id = $1
      ORDER BY is_creator DESC, gm.joined_at ASC;
    `;
    const { rows } = await pool.query(query, [groupId]);
    return rows;
  },

  /**
   * Find group by ID
   */
  async findById(groupId) {
    const query = `
      SELECT g.id, g.name, g.created_by, g.created_at, g.updated_at,
             u.full_name as creator_name, u.email as creator_email
      FROM groups g
      JOIN users u ON g.created_by = u.id
      WHERE g.id = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [groupId]);
    return rows[0] || null;
  },

  /**
   * Check if a student is a member of a specific group
   */
  async isMemberOfGroup(groupId, studentId) {
    const query = `
      SELECT id 
      FROM group_members 
      WHERE group_id = $1 AND student_id = $2
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [groupId, studentId]);
    return rows.length > 0;
  },

  /**
   * Create group and assign creator in an atomic transaction
   */
  async createGroupWithCreator({ name, creatorId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Pre-check if student already has a group
      const alreadyInGroup = await this.isStudentInAnyGroup(creatorId, client);
      if (alreadyInGroup) {
        await client.query('ROLLBACK');
        const err = new Error('You already belong to an active group. Students may only belong to one group at a time.');
        err.statusCode = 400;
        throw err;
      }

      // 1. Insert Group
      const insertGroupQuery = `
        INSERT INTO groups (name, created_by)
        VALUES ($1, $2)
        RETURNING id, name, created_by, created_at, updated_at;
      `;
      const { rows: groupRows } = await client.query(insertGroupQuery, [
        name.trim(),
        creatorId,
      ]);
      const newGroup = groupRows[0];

      // 2. Insert creator into group_members
      const insertMemberQuery = `
        INSERT INTO group_members (group_id, student_id)
        VALUES ($1, $2)
        RETURNING id, joined_at;
      `;
      const { rows: memberRows } = await client.query(insertMemberQuery, [
        newGroup.id,
        creatorId,
      ]);

      await client.query('COMMIT');

      return {
        ...newGroup,
        joined_at: memberRows[0].joined_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      // Detect unique constraint violation on student membership
      if (error.code === '23505' && error.constraint === 'uq_student_active_group') {
        const err = new Error('You already belong to an active group.');
        err.statusCode = 400;
        throw err;
      }
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Get pending invitations for a group (creator view)
   */
  async getGroupInvitations(groupId) {
    const query = `
      SELECT gi.id, gi.invited_student_id, gi.status, gi.created_at, gi.updated_at,
             u.full_name as student_name, u.email as student_email
      FROM group_invitations gi
      JOIN users u ON gi.invited_student_id = u.id
      WHERE gi.group_id = $1
      ORDER BY gi.created_at DESC;
    `;
    const { rows } = await pool.query(query, [groupId]);
    return rows;
  },

  /**
   * Get pending invitations for a student
   */
  async getStudentPendingInvitations(studentId) {
    const query = `
      SELECT gi.id, gi.group_id, gi.status, gi.created_at,
             g.name as group_name,
             u.full_name as inviter_name, u.email as inviter_email
      FROM group_invitations gi
      JOIN groups g ON gi.group_id = g.id
      JOIN users u ON gi.invited_by = u.id
      WHERE gi.invited_student_id = $1 AND gi.status = 'PENDING'
      ORDER BY gi.created_at DESC;
    `;
    const { rows } = await pool.query(query, [studentId]);
    return rows;
  },

  /**
   * Check for duplicate pending invitation
   */
  async hasPendingInvitation(groupId, studentId) {
    const query = `
      SELECT id 
      FROM group_invitations 
      WHERE group_id = $1 AND invited_student_id = $2 AND status = 'PENDING'
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [groupId, studentId]);
    return rows.length > 0;
  },

  /**
   * Create an in-app group invitation
   */
  async createInvitation({ groupId, invitedStudentId, invitedBy }) {
    const query = `
      INSERT INTO group_invitations (group_id, invited_student_id, invited_by, status)
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING id, group_id, invited_student_id, invited_by, status, created_at;
    `;
    const { rows } = await pool.query(query, [groupId, invitedStudentId, invitedBy]);
    return rows[0];
  },

  /**
   * Accept or Reject an invitation inside a transaction with row lock
   */
  async respondToInvitation({ invitationId, studentId, action }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch invitation with row-level lock (FOR UPDATE)
      const fetchQuery = `
        SELECT gi.id, gi.group_id, gi.invited_student_id, gi.status, g.name as group_name
        FROM group_invitations gi
        JOIN groups g ON gi.group_id = g.id
        WHERE gi.id = $1
        FOR UPDATE;
      `;
      const { rows } = await client.query(fetchQuery, [invitationId]);

      if (rows.length === 0) {
        await client.query('ROLLBACK');
        const err = new Error('Invitation not found.');
        err.statusCode = 404;
        throw err;
      }

      const invitation = rows[0];

      // 2. Authorization check: Only invitation recipient can respond
      if (invitation.invited_student_id !== studentId) {
        await client.query('ROLLBACK');
        const err = new Error('You are not authorized to respond to this invitation.');
        err.statusCode = 403;
        throw err;
      }

      // 3. Status check: Must be PENDING
      if (invitation.status !== 'PENDING') {
        await client.query('ROLLBACK');
        const err = new Error(`This invitation has already been ${invitation.status.toLowerCase()}.`);
        err.statusCode = 400;
        throw err;
      }

      // 4. Handle ACCEPT
      if (action === 'ACCEPT') {
        // Verify student is not already in an active group
        const alreadyInGroup = await this.isStudentInAnyGroup(studentId, client);
        if (alreadyInGroup) {
          await client.query('ROLLBACK');
          const err = new Error('You already belong to an active group. You must leave your current group before joining another.');
          err.statusCode = 400;
          throw err;
        }

        // Add to group_members
        const insertMemberQuery = `
          INSERT INTO group_members (group_id, student_id)
          VALUES ($1, $2)
          RETURNING id, joined_at;
        `;
        await client.query(insertMemberQuery, [invitation.group_id, studentId]);

        // Update current invitation to ACCEPTED
        const updateCurrentQuery = `
          UPDATE group_invitations
          SET status = 'ACCEPTED', updated_at = NOW()
          WHERE id = $1
          RETURNING id, status, updated_at;
        `;
        await client.query(updateCurrentQuery, [invitationId]);

        // Auto-reject any other pending invitations for this student
        const cancelOtherQuery = `
          UPDATE group_invitations
          SET status = 'REJECTED', updated_at = NOW()
          WHERE invited_student_id = $1 AND id != $2 AND status = 'PENDING';
        `;
        await client.query(cancelOtherQuery, [studentId, invitationId]);

        await client.query('COMMIT');

        return {
          success: true,
          action: 'ACCEPT',
          group_id: invitation.group_id,
          group_name: invitation.group_name,
          message: `Successfully joined ${invitation.group_name}!`,
        };
      }

      // 5. Handle REJECT
      if (action === 'REJECT') {
        const updateRejectQuery = `
          UPDATE group_invitations
          SET status = 'REJECTED', updated_at = NOW()
          WHERE id = $1
          RETURNING id, status, updated_at;
        `;
        await client.query(updateRejectQuery, [invitationId]);

        await client.query('COMMIT');

        return {
          success: true,
          action: 'REJECT',
          group_id: invitation.group_id,
          group_name: invitation.group_name,
          message: `Invitation to ${invitation.group_name} declined.`,
        };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      // If concurrent acceptance triggered database constraint
      if (error.code === '23505' && error.constraint === 'uq_student_active_group') {
        const err = new Error('You already belong to an active group.');
        err.statusCode = 400;
        throw err;
      }
      throw error;
    } finally {
      client.release();
    }
  },
};
