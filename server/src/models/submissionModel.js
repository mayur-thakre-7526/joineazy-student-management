import { pool } from '../config/db.js';

/**
 * Submission & Analytics Data Access Layer
 * Uses parameterized queries and guarantees relational integrity
 */
export const SubmissionModel = {
  /**
   * Confirm student assignment submission (INDIVIDUAL only)
   * Atomic insert with ON CONFLICT prevention against duplicate records
   */
  async confirmSubmission(assignmentId, studentId) {
    // 1. Fetch assignment to verify submission_type
    const checkQuery = `
      SELECT id, submission_type, due_date
      FROM assignments
      WHERE id = $1;
    `;
    const checkRes = await pool.query(checkQuery, [assignmentId]);
    if (checkRes.rows.length === 0) {
      const err = new Error('Assignment not found.');
      err.statusCode = 404;
      throw err;
    }

    const assignment = checkRes.rows[0];
    if (assignment.submission_type === 'GROUP') {
      const err = new Error(
        'This assignment requires group leader submission acknowledgment. Individual confirmation is disabled for group assignments.'
      );
      err.statusCode = 400;
      throw err;
    }

    const insertQuery = `
      INSERT INTO submission_confirmations (assignment_id, student_id, confirmed_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (assignment_id, student_id) DO NOTHING
      RETURNING id, assignment_id, student_id, confirmed_at;
    `;
    const { rows } = await pool.query(insertQuery, [assignmentId, studentId]);

    if (rows.length === 0) {
      // Record already existed - fetch existing record
      const fetchQuery = `
        SELECT id, assignment_id, student_id, confirmed_at
        FROM submission_confirmations
        WHERE assignment_id = $1 AND student_id = $2;
      `;
      const existing = await pool.query(fetchQuery, [assignmentId, studentId]);
      return {
        isDuplicate: true,
        confirmation: existing.rows[0] || null,
      };
    }

    return {
      isDuplicate: false,
      confirmation: rows[0],
    };
  },

  /**
   * Acknowledge group assignment submission (GROUP Leader only)
   * Runs in an atomic transaction with row-level locks
   */
  async acknowledgeGroupSubmission({ assignmentId, leaderId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch assignment with row-level lock
      const assignQuery = `
        SELECT id, title, submission_type, scope, course_id, due_date
        FROM assignments
        WHERE id = $1
        FOR UPDATE;
      `;
      const assignRes = await client.query(assignQuery, [assignmentId]);
      if (assignRes.rows.length === 0) {
        await client.query('ROLLBACK');
        const err = new Error('Assignment not found.');
        err.statusCode = 404;
        throw err;
      }
      const assignment = assignRes.rows[0];

      // 2. Confirm submission_type is GROUP
      if (assignment.submission_type !== 'GROUP') {
        await client.query('ROLLBACK');
        const err = new Error('This assignment is an individual assignment. Group acknowledgment is not allowed.');
        err.statusCode = 400;
        throw err;
      }

      // 3. Confirm leader belongs to an active group
      const groupQuery = `
        SELECT gm.group_id, g.name as group_name, g.created_by
        FROM group_members gm
        JOIN groups g ON gm.group_id = g.id
        WHERE gm.student_id = $1
        LIMIT 1;
      `;
      const groupRes = await client.query(groupQuery, [leaderId]);
      if (groupRes.rows.length === 0) {
        await client.query('ROLLBACK');
        const err = new Error('You must be a member of a group to acknowledge group assignments.');
        err.statusCode = 403;
        throw err;
      }
      const group = groupRes.rows[0];

      // 4. Confirm requester is the group leader (creator)
      if (group.created_by !== leaderId) {
        await client.query('ROLLBACK');
        const err = new Error('Only the group leader can acknowledge group submissions.');
        err.statusCode = 403;
        throw err;
      }

      // 5. Confirm group is eligible for this assignment (if SPECIFIC_GROUPS)
      if (assignment.scope === 'SPECIFIC_GROUPS') {
        const targetQuery = `
          SELECT 1 FROM assignment_groups
          WHERE assignment_id = $1 AND group_id = $2;
        `;
        const targetRes = await client.query(targetQuery, [assignmentId, group.group_id]);
        if (targetRes.rows.length === 0) {
          await client.query('ROLLBACK');
          const err = new Error('Your group is not assigned to this assignment.');
          err.statusCode = 403;
          throw err;
        }
      }

      // 6. Confirm course enrollment requirements (if course_id is set)
      if (assignment.course_id) {
        const enrollQuery = `
          SELECT 1 FROM course_enrollments
          WHERE course_id = $1 AND student_id = $2;
        `;
        const enrollRes = await client.query(enrollQuery, [assignment.course_id, leaderId]);
        if (enrollRes.rows.length === 0) {
          await client.query('ROLLBACK');
          const err = new Error('You are not enrolled in the course for this assignment.');
          err.statusCode = 403;
          throw err;
        }
      }

      // 7. Check if group already acknowledged (prevent concurrent duplicates)
      const existingQuery = `
        SELECT id, acknowledged_at, acknowledged_by
        FROM group_submission_acknowledgments
        WHERE assignment_id = $1 AND group_id = $2
        FOR UPDATE;
      `;
      const existingRes = await client.query(existingQuery, [assignmentId, group.group_id]);
      if (existingRes.rows.length > 0) {
        await client.query('ROLLBACK');
        const err = new Error('This assignment has already been acknowledged for your group.');
        err.statusCode = 409;
        throw err;
      }

      // 8. Insert group acknowledgment
      const insertAcknowledgeQuery = `
        INSERT INTO group_submission_acknowledgments (assignment_id, group_id, acknowledged_by, acknowledged_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id, assignment_id, group_id, acknowledged_by, acknowledged_at;
      `;
      const ackRes = await client.query(insertAcknowledgeQuery, [
        assignmentId,
        group.group_id,
        leaderId,
      ]);
      const acknowledgment = ackRes.rows[0];

      // 9. Snapshot eligible group members at acknowledgment time
      // Policy: All current group members who satisfy course enrollment are snapshotted.
      const membersQuery = `
        SELECT gm.student_id, (gm.student_id = $3) as is_leader
        FROM group_members gm
        WHERE gm.group_id = $1
          AND ($2::uuid IS NULL OR EXISTS (
            SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $2 AND ce.student_id = gm.student_id
          ));
      `;
      const membersRes = await client.query(membersQuery, [
        group.group_id,
        assignment.course_id,
        leaderId,
      ]);

      for (const m of membersRes.rows) {
        await client.query(
          `INSERT INTO group_submission_member_snapshots
             (acknowledgment_id, assignment_id, group_id, student_id, is_leader, snapshotted_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (acknowledgment_id, student_id) DO NOTHING;`,
          [acknowledgment.id, assignmentId, group.group_id, m.student_id, m.is_leader]
        );
      }

      await client.query('COMMIT');

      const isLate = new Date(acknowledgment.acknowledged_at) > new Date(assignment.due_date);

      return {
        acknowledgment,
        group_name: group.group_name,
        group_id: group.group_id,
        is_late: isLate,
        snapshotted_members_count: membersRes.rows.length,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Retrieve group submission status for an assignment (Role-aware)
   */
  async getGroupStatus({ assignmentId, studentId }) {
    // 1. Fetch assignment details
    const assignQuery = `
      SELECT a.id, a.title, a.submission_type, a.scope, a.course_id, a.due_date
      FROM assignments a
      WHERE a.id = $1;
    `;
    const assignRes = await pool.query(assignQuery, [assignmentId]);
    if (assignRes.rows.length === 0) {
      const err = new Error('Assignment not found.');
      err.statusCode = 404;
      throw err;
    }
    const assignment = assignRes.rows[0];

    // If individual assignment, return clear indicator
    if (assignment.submission_type !== 'GROUP') {
      return {
        submission_type: 'INDIVIDUAL',
        assignment_id: assignmentId,
        has_group: false,
        can_acknowledge: false,
        message: 'This is an individual assignment. Please use individual submission confirmation.',
      };
    }

    // 2. Fetch student's group
    const groupQuery = `
      SELECT gm.group_id, g.name as group_name, g.created_by,
             u.full_name as leader_name, u.email as leader_email
      FROM group_members gm
      JOIN groups g ON gm.group_id = g.id
      JOIN users u ON g.created_by = u.id
      WHERE gm.student_id = $1
      LIMIT 1;
    `;
    const groupRes = await pool.query(groupQuery, [studentId]);

    // Check course enrollment
    let isEnrolled = true;
    if (assignment.course_id) {
      const enrollCheck = await pool.query(
        'SELECT 1 FROM course_enrollments WHERE course_id = $1 AND student_id = $2 LIMIT 1;',
        [assignment.course_id, studentId]
      );
      isEnrolled = enrollCheck.rows.length > 0;
    }

    if (groupRes.rows.length === 0) {
      return {
        submission_type: 'GROUP',
        assignment_id: assignmentId,
        has_group: false,
        group_id: null,
        group_name: null,
        is_leader: false,
        leader_name: null,
        is_enrolled: isEnrolled,
        acknowledged: false,
        acknowledged_by: null,
        acknowledged_by_name: null,
        acknowledged_at: null,
        is_late: false,
        can_acknowledge: false,
        cannot_acknowledge_reason: 'You are not a member of any group. Please join or create a group to participate.',
        eligible_member_count: 0,
        reflected_member_count: 0,
        members: [],
      };
    }

    const group = groupRes.rows[0];
    const isLeader = group.created_by === studentId;

    // Check group targeting scope
    let isGroupAssigned = true;
    if (assignment.scope === 'SPECIFIC_GROUPS') {
      const targetCheck = await pool.query(
        'SELECT 1 FROM assignment_groups WHERE assignment_id = $1 AND group_id = $2 LIMIT 1;',
        [assignmentId, group.group_id]
      );
      isGroupAssigned = targetCheck.rows.length > 0;
    }

    // Check group acknowledgment
    const ackQuery = `
      SELECT gsa.id, gsa.assignment_id, gsa.group_id, gsa.acknowledged_by, gsa.acknowledged_at,
             u.full_name as acknowledged_by_name, u.email as acknowledged_by_email,
             (gsa.acknowledged_at > a.due_date) as is_late
      FROM group_submission_acknowledgments gsa
      JOIN users u ON gsa.acknowledged_by = u.id
      JOIN assignments a ON gsa.assignment_id = a.id
      WHERE gsa.assignment_id = $1 AND gsa.group_id = $2;
    `;
    const ackRes = await pool.query(ackQuery, [assignmentId, group.group_id]);
    const isAcknowledged = ackRes.rows.length > 0;
    const ackData = ackRes.rows[0] || null;

    // Fetch group members and their eligibility
    const membersQuery = `
      SELECT gm.student_id, u.full_name as student_name, u.email as student_email,
             (gm.student_id = $3) as is_leader,
             CASE
               WHEN $2::uuid IS NULL THEN true
               ELSE EXISTS (SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $2 AND ce.student_id = gm.student_id)
             END as is_course_enrolled
      FROM group_members gm
      JOIN users u ON gm.student_id = u.id
      WHERE gm.group_id = $1
      ORDER BY is_leader DESC, u.full_name ASC;
    `;
    const membersRes = await pool.query(membersQuery, [
      group.group_id,
      assignment.course_id,
      group.created_by,
    ]);

    const eligibleMembers = membersRes.rows.filter((m) => m.is_course_enrolled);
    const eligibleCount = eligibleMembers.length;
    const reflectedCount = isAcknowledged ? eligibleCount : 0;

    let canAcknowledge = false;
    let cannotAcknowledgeReason = null;

    if (isAcknowledged) {
      canAcknowledge = false;
      cannotAcknowledgeReason = 'Submission has already been acknowledged for your group.';
    } else if (!isLeader) {
      canAcknowledge = false;
      cannotAcknowledgeReason =
        'Only your group leader can acknowledge this assignment. The status will update for eligible group members after acknowledgment.';
    } else if (!isEnrolled) {
      canAcknowledge = false;
      cannotAcknowledgeReason = 'You must be enrolled in the course to acknowledge this assignment.';
    } else if (!isGroupAssigned) {
      canAcknowledge = false;
      cannotAcknowledgeReason = 'Your group is not assigned to this assignment.';
    } else {
      canAcknowledge = true;
    }

    return {
      submission_type: 'GROUP',
      assignment_id: assignmentId,
      has_group: true,
      group_id: group.group_id,
      group_name: group.group_name,
      is_leader: isLeader,
      leader_name: group.leader_name,
      is_enrolled: isEnrolled,
      is_group_assigned: isGroupAssigned,
      acknowledged: isAcknowledged,
      acknowledged_by: ackData?.acknowledged_by || null,
      acknowledged_by_name: ackData?.acknowledged_by_name || null,
      acknowledged_at: ackData?.acknowledged_at || null,
      is_late: ackData ? ackData.is_late === true : false,
      can_acknowledge: canAcknowledge,
      cannot_acknowledge_reason: cannotAcknowledgeReason,
      eligible_member_count: eligibleCount,
      reflected_member_count: reflectedCount,
      members: membersRes.rows.map((m) => ({
        student_id: m.student_id,
        student_name: m.student_name,
        student_email: m.student_email,
        is_leader: m.is_leader,
        is_course_enrolled: m.is_course_enrolled,
        confirmed: isAcknowledged && m.is_course_enrolled,
      })),
    };
  },

  /**
   * Retrieve a student's submission status for a single assignment
   * Seamlessly handles INDIVIDUAL vs GROUP assignments
   */
  async getSubmissionStatus(assignmentId, studentId) {
    // 1. Fetch assignment
    const assignQuery = `
      SELECT a.id, a.submission_type, a.due_date, a.course_id
      FROM assignments a
      WHERE a.id = $1;
    `;
    const assignRes = await pool.query(assignQuery, [assignmentId]);
    if (assignRes.rows.length === 0) {
      return {
        assignment_id: assignmentId,
        confirmed: false,
        confirmed_at: null,
        is_late: false,
      };
    }
    const assignment = assignRes.rows[0];

    // If GROUP assignment: check group acknowledgment
    if (assignment.submission_type === 'GROUP') {
      const groupCheck = `
        SELECT gm.group_id, g.name as group_name, g.created_by,
               u.full_name as leader_name
        FROM group_members gm
        JOIN groups g ON gm.group_id = g.id
        JOIN users u ON g.created_by = u.id
        WHERE gm.student_id = $1
        LIMIT 1;
      `;
      const groupRes = await pool.query(groupCheck, [studentId]);
      if (groupRes.rows.length === 0) {
        return {
          assignment_id: assignmentId,
          submission_type: 'GROUP',
          has_group: false,
          confirmed: false,
          confirmed_at: null,
          is_late: false,
          is_leader: false,
          acknowledged_by_leader: null,
        };
      }

      const group = groupRes.rows[0];
      const isLeader = group.created_by === studentId;

      // Check acknowledgment
      const ackQuery = `
        SELECT gsa.id, gsa.acknowledged_by, gsa.acknowledged_at,
               u.full_name as acknowledged_by_name,
               (gsa.acknowledged_at > $3) as is_late
        FROM group_submission_acknowledgments gsa
        JOIN users u ON gsa.acknowledged_by = u.id
        WHERE gsa.assignment_id = $1 AND gsa.group_id = $2;
      `;
      const ackRes = await pool.query(ackQuery, [assignmentId, group.group_id, assignment.due_date]);

      if (ackRes.rows.length > 0) {
        const ack = ackRes.rows[0];
        return {
          assignment_id: assignmentId,
          submission_type: 'GROUP',
          has_group: true,
          group_id: group.group_id,
          group_name: group.group_name,
          is_leader: isLeader,
          confirmed: true,
          confirmed_at: ack.acknowledged_at,
          is_late: ack.is_late === true,
          acknowledged_by_leader: ack.acknowledged_by_name,
        };
      }

      return {
        assignment_id: assignmentId,
        submission_type: 'GROUP',
        has_group: true,
        group_id: group.group_id,
        group_name: group.group_name,
        is_leader: isLeader,
        confirmed: false,
        confirmed_at: null,
        is_late: false,
        acknowledged_by_leader: null,
      };
    }

    // INDIVIDUAL assignment: query submission_confirmations
    const query = `
      SELECT sc.id, sc.assignment_id, sc.student_id, sc.confirmed_at,
             a.due_date,
             (sc.confirmed_at > a.due_date) as is_late
      FROM submission_confirmations sc
      JOIN assignments a ON sc.assignment_id = a.id
      WHERE sc.assignment_id = $1 AND sc.student_id = $2;
    `;
    const { rows } = await pool.query(query, [assignmentId, studentId]);
    if (rows.length === 0) {
      return {
        assignment_id: assignmentId,
        submission_type: 'INDIVIDUAL',
        confirmed: false,
        confirmed_at: null,
        is_late: false,
      };
    }

    const row = rows[0];
    return {
      assignment_id: assignmentId,
      submission_type: 'INDIVIDUAL',
      confirmed: true,
      confirmed_at: row.confirmed_at,
      is_late: row.is_late === true,
    };
  },

  /**
   * Get student's overall progress across all currently eligible assignments
   * and group progress if student belongs to a group
   */
  async getStudentProgress(studentId) {
    // 1. Check if student belongs to an active group
    const groupQuery = `
      SELECT gm.group_id, g.name as group_name
      FROM group_members gm
      JOIN groups g ON gm.group_id = g.id
      WHERE gm.student_id = $1
      LIMIT 1;
    `;
    const groupResult = await pool.query(groupQuery, [studentId]);
    const studentGroup = groupResult.rows[0] || null;
    const currentGroupId = studentGroup ? studentGroup.group_id : null;

    // 2. Fetch all eligible assignments with individual or reflected group confirmation status
    const assignmentsQuery = `
      SELECT DISTINCT
        a.id, a.title, a.description, a.due_date, a.onedrive_link, a.scope, a.submission_type, a.created_at,
        u.full_name as professor_name, u.email as professor_email,
        CASE
          WHEN a.submission_type = 'GROUP' THEN gsa.acknowledged_at
          ELSE sc.confirmed_at
        END as confirmed_at,
        CASE
          WHEN a.submission_type = 'GROUP' THEN (gsa.acknowledged_at IS NOT NULL)
          ELSE (sc.confirmed_at IS NOT NULL)
        END as confirmed,
        CASE
          WHEN a.submission_type = 'GROUP' THEN (gsa.acknowledged_at > a.due_date)
          ELSE (sc.confirmed_at > a.due_date)
        END as is_late
      FROM assignments a
      JOIN users u ON a.professor_id = u.id
      LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
      LEFT JOIN group_members gm ON ag.group_id = gm.group_id AND gm.student_id = $1
      LEFT JOIN submission_confirmations sc ON a.id = sc.assignment_id AND sc.student_id = $1
      LEFT JOIN group_submission_acknowledgments gsa ON a.id = gsa.assignment_id AND gsa.group_id = $2
      WHERE
        (a.course_id IS NULL OR EXISTS (
          SELECT 1 FROM course_enrollments ce WHERE ce.course_id = a.course_id AND ce.student_id = $1
        ))
        AND
        (a.scope = 'ALL' OR gm.student_id IS NOT NULL)
      ORDER BY a.due_date ASC;
    `;
    const { rows: eligibleAssignments } = await pool.query(assignmentsQuery, [
      studentId,
      currentGroupId,
    ]);

    const totalAssignments = eligibleAssignments.length;
    let confirmedAssignments = 0;
    let lateConfirmations = 0;

    const formattedAssignments = eligibleAssignments.map((a) => {
      const isConfirmed = a.confirmed === true;
      const isLate = a.is_late === true;
      if (isConfirmed) {
        confirmedAssignments += 1;
        if (isLate) lateConfirmations += 1;
      }

      const isPastDue = new Date(a.due_date) < new Date();
      let status = 'PENDING';
      if (isConfirmed) {
        status = isLate ? 'CONFIRMED_LATE' : 'CONFIRMED';
      } else if (isPastDue) {
        status = 'OVERDUE';
      }

      return {
        id: a.id,
        title: a.title,
        description: a.description,
        due_date: a.due_date,
        onedrive_link: a.onedrive_link,
        scope: a.scope,
        submission_type: a.submission_type,
        professor_name: a.professor_name,
        confirmed: isConfirmed,
        confirmed_at: a.confirmed_at,
        is_late: isLate,
        status,
      };
    });

    const pendingAssignments = Math.max(0, totalAssignments - confirmedAssignments);
    const completionPercentage =
      totalAssignments > 0 ? Math.round((confirmedAssignments / totalAssignments) * 100) : 0;

    // 3. Compute group progress if applicable
    let groupData = null;
    if (studentGroup) {
      const groupId = studentGroup.group_id;

      // Group members count
      const memberCountQuery = `
        SELECT COUNT(student_id)::int as count
        FROM group_members
        WHERE group_id = $1;
      `;
      const memberCountRes = await pool.query(memberCountQuery, [groupId]);
      const memberCount = memberCountRes.rows[0]?.count || 0;

      // Applicable assignments for this group
      const groupAssignmentsQuery = `
        SELECT DISTINCT a.id, a.title, a.due_date, a.scope, a.submission_type
        FROM assignments a
        LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
        WHERE a.scope = 'ALL' OR (a.scope = 'SPECIFIC_GROUPS' AND ag.group_id = $1)
        ORDER BY a.due_date ASC;
      `;
      const groupAssignmentsRes = await pool.query(groupAssignmentsQuery, [groupId]);
      const groupAssignments = groupAssignmentsRes.rows;

      let totalGroupPairs = 0;
      let confirmedGroupPairs = 0;

      const groupAssignmentsProgress = [];

      for (const ga of groupAssignments) {
        let confirmedMembers = 0;
        let totalEligible = memberCount;

        if (ga.submission_type === 'GROUP') {
          // For GROUP assignment: single leader acknowledgment reflects for all eligible group members
          const ackQuery = `
            SELECT id FROM group_submission_acknowledgments
            WHERE assignment_id = $1 AND group_id = $2;
          `;
          const ackRes = await pool.query(ackQuery, [ga.id, groupId]);
          const isGroupAck = ackRes.rows.length > 0;
          confirmedMembers = isGroupAck ? totalEligible : 0;
        } else {
          // For INDIVIDUAL assignment: count distinct individual confirmations
          const groupConfirmQuery = `
            SELECT COUNT(DISTINCT sc.student_id)::int as count
            FROM submission_confirmations sc
            JOIN group_members gm ON sc.student_id = gm.student_id
            WHERE sc.assignment_id = $1 AND gm.group_id = $2;
          `;
          const confirmRes = await pool.query(groupConfirmQuery, [ga.id, groupId]);
          confirmedMembers = confirmRes.rows[0]?.count || 0;
        }

        const pendingMembers = Math.max(0, totalEligible - confirmedMembers);
        const progressPercent =
          totalEligible > 0 ? Math.round((confirmedMembers / totalEligible) * 100) : 0;

        let status = 'NOT_STARTED';
        if (progressPercent === 100) {
          status = 'COMPLETED';
        } else if (progressPercent > 0) {
          status = 'IN_PROGRESS';
        }

        totalGroupPairs += totalEligible;
        confirmedGroupPairs += confirmedMembers;

        groupAssignmentsProgress.push({
          assignment_id: ga.id,
          title: ga.title,
          due_date: ga.due_date,
          scope: ga.scope,
          submission_type: ga.submission_type,
          total_members: totalEligible,
          confirmed_members: confirmedMembers,
          pending_members: pendingMembers,
          progress_percentage: progressPercent,
          status,
        });
      }

      const overallGroupProgress =
        totalGroupPairs > 0 ? Math.round((confirmedGroupPairs / totalGroupPairs) * 100) : 0;

      groupData = {
        group_id: groupId,
        group_name: studentGroup.group_name,
        member_count: memberCount,
        overall_progress_percentage: overallGroupProgress,
        assignments_progress: groupAssignmentsProgress,
      };
    }

    return {
      summary: {
        total_assignments: totalAssignments,
        confirmed_assignments: confirmedAssignments,
        pending_assignments: pendingAssignments,
        late_confirmations: lateConfirmations,
        completion_percentage: completionPercentage,
      },
      assignments: formattedAssignments,
      group: groupData,
    };
  },

  /**
   * Admin Professor Course Analytics Overview
   * Accurately supports both INDIVIDUAL and GROUP assignments
   */
  async getAdminAnalytics() {
    // 1. Total counts
    const totalAssignmentsRes = await pool.query('SELECT COUNT(*)::int as count FROM assignments;');
    const totalStudentsRes = await pool.query(
      "SELECT COUNT(*)::int as count FROM users WHERE role = 'STUDENT';"
    );
    const totalGroupsRes = await pool.query('SELECT COUNT(*)::int as count FROM groups;');

    const totalAssignments = totalAssignmentsRes.rows[0]?.count || 0;
    const totalStudents = totalStudentsRes.rows[0]?.count || 0;
    const totalGroups = totalGroupsRes.rows[0]?.count || 0;

    // 2. Fetch all assignments
    const assignmentsQuery = `
      SELECT a.id, a.title, a.scope, a.course_id, a.submission_type, a.due_date, a.created_at,
             c.course_code, c.title as course_title,
             u.full_name as professor_name
      FROM assignments a
      JOIN users u ON a.professor_id = u.id
      LEFT JOIN courses c ON a.course_id = c.id
      ORDER BY a.due_date ASC;
    `;
    const assignmentsRes = await pool.query(assignmentsQuery);

    let totalEligiblePairs = 0;
    let totalConfirmedPairs = 0;
    let totalLateConfirmations = 0;

    const assignmentMetrics = [];

    for (const a of assignmentsRes.rows) {
      let eligibleStudents = 0;
      let confirmedCount = 0;
      let lateCount = 0;
      let eligibleGroupsCount = 0;
      let confirmedGroupsCount = 0;

      if (a.submission_type === 'GROUP') {
        // GROUP assignment: Group level & reflected student metrics
        if (a.scope === 'ALL') {
          // Eligible groups: all groups with members enrolled in course (or all groups if course_id is null)
          const groupQuery = `
            SELECT g.id, COUNT(DISTINCT gm.student_id)::int as member_count
            FROM groups g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE ($1::uuid IS NULL OR EXISTS (
              SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $1 AND ce.student_id = gm.student_id
            ))
            GROUP BY g.id;
          `;
          const gRes = await pool.query(groupQuery, [a.course_id]);
          eligibleGroupsCount = gRes.rows.length;
          eligibleStudents = gRes.rows.reduce((sum, r) => sum + r.member_count, 0);

          // Confirmed groups
          const ackQuery = `
            SELECT gsa.group_id, gsa.acknowledged_at,
                   (gsa.acknowledged_at > $2) as is_late,
                   COUNT(DISTINCT gm.student_id)::int as member_count
            FROM group_submission_acknowledgments gsa
            JOIN group_members gm ON gsa.group_id = gm.group_id
            WHERE gsa.assignment_id = $1
              AND ($3::uuid IS NULL OR EXISTS (
                SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $3 AND ce.student_id = gm.student_id
              ))
            GROUP BY gsa.group_id, gsa.acknowledged_at;
          `;
          const ackRes = await pool.query(ackQuery, [a.id, a.due_date, a.course_id]);
          confirmedGroupsCount = ackRes.rows.length;
          confirmedCount = ackRes.rows.reduce((sum, r) => sum + r.member_count, 0);
          lateCount = ackRes.rows.filter((r) => r.is_late).reduce((sum, r) => sum + r.member_count, 0);
        } else {
          // SPECIFIC_GROUPS: Only targeted groups
          const groupQuery = `
            SELECT ag.group_id, COUNT(DISTINCT gm.student_id)::int as member_count
            FROM assignment_groups ag
            JOIN group_members gm ON ag.group_id = gm.group_id
            WHERE ag.assignment_id = $1
              AND ($2::uuid IS NULL OR EXISTS (
                SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $2 AND ce.student_id = gm.student_id
              ))
            GROUP BY ag.group_id;
          `;
          const gRes = await pool.query(groupQuery, [a.id, a.course_id]);
          eligibleGroupsCount = gRes.rows.length;
          eligibleStudents = gRes.rows.reduce((sum, r) => sum + r.member_count, 0);

          const ackQuery = `
            SELECT gsa.group_id, gsa.acknowledged_at,
                   (gsa.acknowledged_at > $2) as is_late,
                   COUNT(DISTINCT gm.student_id)::int as member_count
            FROM group_submission_acknowledgments gsa
            JOIN assignment_groups ag ON gsa.group_id = ag.group_id AND ag.assignment_id = gsa.assignment_id
            JOIN group_members gm ON gsa.group_id = gm.group_id
            WHERE gsa.assignment_id = $1
              AND ($3::uuid IS NULL OR EXISTS (
                SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $3 AND ce.student_id = gm.student_id
              ))
            GROUP BY gsa.group_id, gsa.acknowledged_at;
          `;
          const ackRes = await pool.query(ackQuery, [a.id, a.due_date, a.course_id]);
          confirmedGroupsCount = ackRes.rows.length;
          confirmedCount = ackRes.rows.reduce((sum, r) => sum + r.member_count, 0);
          lateCount = ackRes.rows.filter((r) => r.is_late).reduce((sum, r) => sum + r.member_count, 0);
        }
      } else {
        // INDIVIDUAL assignment: Student level metrics
        if (a.scope === 'ALL') {
          if (a.course_id) {
            const courseStudentsQuery = `
              SELECT COUNT(DISTINCT student_id)::int as count
              FROM course_enrollments
              WHERE course_id = $1;
            `;
            const csRes = await pool.query(courseStudentsQuery, [a.course_id]);
            eligibleStudents = csRes.rows[0]?.count || 0;
          } else {
            eligibleStudents = totalStudents;
          }

          const confirmQuery = `
            SELECT
              COUNT(DISTINCT sc.student_id)::int as total_confirmed,
              COUNT(DISTINCT CASE WHEN sc.confirmed_at > a.due_date THEN sc.student_id END)::int as total_late
            FROM submission_confirmations sc
            JOIN users u ON sc.student_id = u.id AND u.role = 'STUDENT'
            JOIN assignments a ON sc.assignment_id = a.id
            WHERE sc.assignment_id = $1
              AND ($2::uuid IS NULL OR EXISTS (
                SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $2 AND ce.student_id = sc.student_id
              ));
          `;
          const confirmRes = await pool.query(confirmQuery, [a.id, a.course_id]);
          confirmedCount = confirmRes.rows[0]?.total_confirmed || 0;
          lateCount = confirmRes.rows[0]?.total_late || 0;
        } else {
          // SPECIFIC_GROUPS: Only students in targeted groups
          const eligibleQuery = `
            SELECT COUNT(DISTINCT gm.student_id)::int as count
            FROM assignment_groups ag
            JOIN group_members gm ON ag.group_id = gm.group_id
            WHERE ag.assignment_id = $1
              AND ($2::uuid IS NULL OR EXISTS (
                SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $2 AND ce.student_id = gm.student_id
              ));
          `;
          const eligibleRes = await pool.query(eligibleQuery, [a.id, a.course_id]);
          eligibleStudents = eligibleRes.rows[0]?.count || 0;

          const confirmQuery = `
            SELECT
              COUNT(DISTINCT sc.student_id)::int as total_confirmed,
              COUNT(DISTINCT CASE WHEN sc.confirmed_at > a.due_date THEN sc.student_id END)::int as total_late
            FROM submission_confirmations sc
            JOIN group_members gm ON sc.student_id = gm.student_id
            JOIN assignment_groups ag ON gm.group_id = ag.group_id AND ag.assignment_id = sc.assignment_id
            JOIN assignments a ON sc.assignment_id = a.id
            WHERE sc.assignment_id = $1
              AND ($2::uuid IS NULL OR EXISTS (
                SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $2 AND ce.student_id = sc.student_id
              ));
          `;
          const confirmRes = await pool.query(confirmQuery, [a.id, a.course_id]);
          confirmedCount = confirmRes.rows[0]?.total_confirmed || 0;
          lateCount = confirmRes.rows[0]?.total_late || 0;
        }
      }

      const pendingCount = Math.max(0, eligibleStudents - confirmedCount);
      const completionPercentage =
        eligibleStudents > 0 ? Math.round((confirmedCount / eligibleStudents) * 100) : 0;

      totalEligiblePairs += eligibleStudents;
      totalConfirmedPairs += confirmedCount;
      totalLateConfirmations += lateCount;

      assignmentMetrics.push({
        id: a.id,
        title: a.title,
        scope: a.scope,
        course_id: a.course_id,
        course_code: a.course_code,
        course_title: a.course_title,
        submission_type: a.submission_type,
        due_date: a.due_date,
        created_at: a.created_at,
        professor_name: a.professor_name,
        eligible_students: eligibleStudents,
        confirmed_count: confirmedCount,
        pending_count: pendingCount,
        late_count: lateCount,
        eligible_groups: eligibleGroupsCount,
        confirmed_groups: confirmedGroupsCount,
        completion_percentage: completionPercentage,
      });
    }

    const totalPendingPairs = Math.max(0, totalEligiblePairs - totalConfirmedPairs);
    const overallCompletionPercentage =
      totalEligiblePairs > 0 ? Math.round((totalConfirmedPairs / totalEligiblePairs) * 100) : 0;

    return {
      overview: {
        total_assignments: totalAssignments,
        total_students: totalStudents,
        total_groups: totalGroups,
        total_eligible_pairs: totalEligiblePairs,
        total_confirmed_pairs: totalConfirmedPairs,
        total_pending_pairs: totalPendingPairs,
        total_late_confirmations: totalLateConfirmations,
        overall_completion_percentage: overallCompletionPercentage,
      },
      assignments: assignmentMetrics,
    };
  },

  /**
   * Detailed Submission Tracking for a single assignment (ADMIN)
   * Accurately supports both INDIVIDUAL and GROUP assignments
   */
  async getAssignmentSubmissionsAdmin(assignmentId) {
    // 1. Fetch assignment
    const assignQuery = `
      SELECT a.id, a.title, a.description, a.due_date, a.onedrive_link, a.scope,
             a.course_id, a.submission_type, a.created_at, a.updated_at,
             c.course_code, c.title as course_title,
             u.full_name as professor_name, u.email as professor_email
      FROM assignments a
      JOIN users u ON a.professor_id = u.id
      LEFT JOIN courses c ON a.course_id = c.id
      WHERE a.id = $1;
    `;
    const assignRes = await pool.query(assignQuery, [assignmentId]);
    if (assignRes.rows.length === 0) {
      return null;
    }
    const assignment = assignRes.rows[0];
    const isGroup = assignment.submission_type === 'GROUP';
    const isPastDue = new Date(assignment.due_date) < new Date();

    // 2. Group-wise breakdown
    let groupRows = [];
    if (assignment.scope === 'ALL') {
      const allGroupsQuery = `
        SELECT g.id as group_id, g.name as group_name,
               g.created_by as leader_id, leader.full_name as leader_name,
               COUNT(DISTINCT gm.student_id)::int as eligible_count,
               gsa.acknowledged_at,
               gsa.acknowledged_by,
               ack_user.full_name as acknowledged_by_name,
               (gsa.acknowledged_at IS NOT NULL) as is_group_acknowledged,
               (gsa.acknowledged_at > $2) as is_group_late
        FROM groups g
        JOIN users leader ON g.created_by = leader.id
        LEFT JOIN group_members gm ON g.id = gm.group_id
          AND ($3::uuid IS NULL OR EXISTS (
            SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $3 AND ce.student_id = gm.student_id
          ))
        LEFT JOIN group_submission_acknowledgments gsa ON g.id = gsa.group_id AND gsa.assignment_id = $1
        LEFT JOIN users ack_user ON gsa.acknowledged_by = ack_user.id
        GROUP BY g.id, g.name, g.created_by, leader.full_name, gsa.acknowledged_at, gsa.acknowledged_by, ack_user.full_name
        ORDER BY g.name ASC;
      `;
      const res = await pool.query(allGroupsQuery, [assignmentId, assignment.due_date, assignment.course_id]);
      groupRows = res.rows;
    } else {
      const targetedGroupsQuery = `
        SELECT g.id as group_id, g.name as group_name,
               g.created_by as leader_id, leader.full_name as leader_name,
               COUNT(DISTINCT gm.student_id)::int as eligible_count,
               gsa.acknowledged_at,
               gsa.acknowledged_by,
               ack_user.full_name as acknowledged_by_name,
               (gsa.acknowledged_at IS NOT NULL) as is_group_acknowledged,
               (gsa.acknowledged_at > $2) as is_group_late
        FROM assignment_groups ag
        JOIN groups g ON ag.group_id = g.id
        JOIN users leader ON g.created_by = leader.id
        LEFT JOIN group_members gm ON g.id = gm.group_id
          AND ($3::uuid IS NULL OR EXISTS (
            SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $3 AND ce.student_id = gm.student_id
          ))
        LEFT JOIN group_submission_acknowledgments gsa ON g.id = gsa.group_id AND gsa.assignment_id = ag.assignment_id
        LEFT JOIN users ack_user ON gsa.acknowledged_by = ack_user.id
        WHERE ag.assignment_id = $1
        GROUP BY g.id, g.name, g.created_by, leader.full_name, gsa.acknowledged_at, gsa.acknowledged_by, ack_user.full_name
        ORDER BY g.name ASC;
      `;
      const res = await pool.query(targetedGroupsQuery, [assignmentId, assignment.due_date, assignment.course_id]);
      groupRows = res.rows;
    }

    const groupTracking = groupRows.map((g) => {
      const eligible = g.eligible_count;
      let confirmed = 0;
      let progressPercent = 0;
      let status = 'NOT_STARTED';

      if (isGroup) {
        if (g.is_group_acknowledged) {
          confirmed = eligible;
          progressPercent = 100;
          status = g.is_group_late ? 'CONFIRMED_LATE' : 'COMPLETED';
        } else {
          confirmed = 0;
          progressPercent = 0;
          status = isPastDue ? 'OVERDUE' : 'NOT_STARTED';
        }
      } else {
        // Individual confirmations for this group's members
        // Calculate based on individual confirmations
        confirmed = 0; // Will be aggregated below
      }

      return {
        group_id: g.group_id,
        group_name: g.group_name,
        leader_id: g.leader_id,
        leader_name: g.leader_name,
        eligible_count: eligible,
        confirmed_count: confirmed,
        pending_count: Math.max(0, eligible - confirmed),
        progress_percentage: progressPercent,
        status,
        acknowledged: g.is_group_acknowledged === true,
        acknowledged_at: g.acknowledged_at || null,
        acknowledged_by: g.acknowledged_by || null,
        acknowledged_by_name: g.acknowledged_by_name || null,
      };
    });

    // 3. Student-wise breakdown
    let studentRows = [];
    if (isGroup) {
      // For GROUP assignment: reflect group leader acknowledgment to all eligible group members
      let studentQuery = '';
      if (assignment.scope === 'ALL') {
        studentQuery = `
          SELECT u.id as student_id, u.full_name as student_name, u.email as student_email,
                 g.id as group_id, g.name as group_name,
                 (g.created_by = u.id) as is_leader,
                 gsa.acknowledged_at as confirmed_at,
                 (gsa.acknowledged_at IS NOT NULL) as confirmed,
                 (gsa.acknowledged_at > $2) as is_late,
                 ack_user.full_name as acknowledged_by_leader
          FROM users u
          JOIN group_members gm ON u.id = gm.student_id
          JOIN groups g ON gm.group_id = g.id
          LEFT JOIN group_submission_acknowledgments gsa ON g.id = gsa.group_id AND gsa.assignment_id = $1
          LEFT JOIN users ack_user ON gsa.acknowledged_by = ack_user.id
          WHERE u.role = 'STUDENT'
            AND ($3::uuid IS NULL OR EXISTS (
              SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $3 AND ce.student_id = u.id
            ))
          ORDER BY g.name ASC, u.full_name ASC;
        `;
      } else {
        studentQuery = `
          SELECT DISTINCT u.id as student_id, u.full_name as student_name, u.email as student_email,
                 g.id as group_id, g.name as group_name,
                 (g.created_by = u.id) as is_leader,
                 gsa.acknowledged_at as confirmed_at,
                 (gsa.acknowledged_at IS NOT NULL) as confirmed,
                 (gsa.acknowledged_at > $2) as is_late,
                 ack_user.full_name as acknowledged_by_leader
          FROM assignment_groups ag
          JOIN group_members gm ON ag.group_id = gm.group_id
          JOIN groups g ON gm.group_id = g.id
          JOIN users u ON gm.student_id = u.id
          LEFT JOIN group_submission_acknowledgments gsa ON g.id = gsa.group_id AND gsa.assignment_id = ag.assignment_id
          LEFT JOIN users ack_user ON gsa.acknowledged_by = ack_user.id
          WHERE ag.assignment_id = $1
            AND ($3::uuid IS NULL OR EXISTS (
              SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $3 AND ce.student_id = u.id
            ))
          ORDER BY g.name ASC, u.full_name ASC;
        `;
      }
      const sRes = await pool.query(studentQuery, [assignmentId, assignment.due_date, assignment.course_id]);
      studentRows = sRes.rows;
    } else {
      // INDIVIDUAL assignment
      let studentQuery = '';
      if (assignment.scope === 'ALL') {
        studentQuery = `
          SELECT u.id as student_id, u.full_name as student_name, u.email as student_email,
                 g.id as group_id, g.name as group_name,
                 false as is_leader,
                 sc.confirmed_at,
                 (sc.confirmed_at IS NOT NULL) as confirmed,
                 (sc.confirmed_at > $2) as is_late,
                 NULL as acknowledged_by_leader
          FROM users u
          LEFT JOIN group_members gm ON u.id = gm.student_id
          LEFT JOIN groups g ON gm.group_id = g.id
          LEFT JOIN submission_confirmations sc ON u.id = sc.student_id AND sc.assignment_id = $1
          WHERE u.role = 'STUDENT'
            AND ($3::uuid IS NULL OR EXISTS (
              SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $3 AND ce.student_id = u.id
            ))
          ORDER BY u.full_name ASC;
        `;
      } else {
        studentQuery = `
          SELECT DISTINCT u.id as student_id, u.full_name as student_name, u.email as student_email,
                 g.id as group_id, g.name as group_name,
                 false as is_leader,
                 sc.confirmed_at,
                 (sc.confirmed_at IS NOT NULL) as confirmed,
                 (sc.confirmed_at > $2) as is_late,
                 NULL as acknowledged_by_leader
          FROM assignment_groups ag
          JOIN group_members gm ON ag.group_id = gm.group_id
          JOIN groups g ON gm.group_id = g.id
          JOIN users u ON gm.student_id = u.id
          LEFT JOIN submission_confirmations sc ON u.id = sc.student_id AND sc.assignment_id = ag.assignment_id
          WHERE ag.assignment_id = $1
            AND ($3::uuid IS NULL OR EXISTS (
              SELECT 1 FROM course_enrollments ce WHERE ce.course_id = $3 AND ce.student_id = u.id
            ))
          ORDER BY u.full_name ASC;
        `;
      }
      const sRes = await pool.query(studentQuery, [assignmentId, assignment.due_date, assignment.course_id]);
      studentRows = sRes.rows;
    }

    const studentTracking = studentRows.map((s) => {
      const isConfirmed = s.confirmed === true;
      const isLate = s.is_late === true;
      let status = 'PENDING';
      if (isConfirmed) {
        status = isLate ? 'CONFIRMED_LATE' : 'CONFIRMED';
      } else if (isPastDue) {
        status = 'OVERDUE';
      }
      return {
        student_id: s.student_id,
        student_name: s.student_name,
        student_email: s.student_email,
        group_id: s.group_id || null,
        group_name: s.group_name || null,
        is_leader: s.is_leader === true,
        confirmed: isConfirmed,
        confirmed_at: s.confirmed_at || null,
        is_late: isLate,
        status,
        acknowledged_by_leader: s.acknowledged_by_leader || null,
      };
    });

    // 4. Overall metrics
    const totalEligible = studentTracking.length;
    const totalConfirmed = studentTracking.filter((s) => s.confirmed).length;
    const totalPending = Math.max(0, totalEligible - totalConfirmed);
    const totalLate = studentTracking.filter((s) => s.confirmed && s.is_late).length;
    const overallPercentage =
      totalEligible > 0 ? Math.round((totalConfirmed / totalEligible) * 100) : 0;

    return {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        due_date: assignment.due_date,
        onedrive_link: assignment.onedrive_link,
        scope: assignment.scope,
        course_id: assignment.course_id,
        course_code: assignment.course_code,
        course_title: assignment.course_title,
        submission_type: assignment.submission_type,
        professor_name: assignment.professor_name,
        professor_email: assignment.professor_email,
      },
      overall: {
        eligible_count: totalEligible,
        confirmed_count: totalConfirmed,
        pending_count: totalPending,
        late_count: totalLate,
        completion_percentage: overallPercentage,
        eligible_groups: groupTracking.length,
        confirmed_groups: groupTracking.filter((g) => g.acknowledged).length,
      },
      group_tracking: groupTracking,
      student_tracking: studentTracking,
    };
  },
};
