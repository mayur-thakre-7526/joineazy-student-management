import { pool } from '../config/db.js';

/**
 * Submission & Analytics Data Access Layer
 * Uses parameterized queries and guarantees relational integrity
 */
export const SubmissionModel = {
  /**
   * Confirm student assignment submission
   * Atomic insert with ON CONFLICT prevention against duplicate records
   */
  async confirmSubmission(assignmentId, studentId) {
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
   * Retrieve a student's submission status for a single assignment
   */
  async getSubmissionStatus(assignmentId, studentId) {
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
        confirmed: false,
        confirmed_at: null,
        is_late: false,
      };
    }

    const row = rows[0];
    return {
      assignment_id: assignmentId,
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

    // 2. Fetch all eligible assignments and their confirmation status for this student
    const assignmentsQuery = `
      SELECT DISTINCT
        a.id, a.title, a.description, a.due_date, a.onedrive_link, a.scope, a.created_at,
        u.full_name as professor_name, u.email as professor_email,
        sc.confirmed_at,
        (sc.confirmed_at IS NOT NULL) as confirmed,
        (sc.confirmed_at > a.due_date) as is_late
      FROM assignments a
      JOIN users u ON a.professor_id = u.id
      LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
      LEFT JOIN group_members gm ON ag.group_id = gm.group_id AND gm.student_id = $1
      LEFT JOIN submission_confirmations sc ON a.id = sc.assignment_id AND sc.student_id = $1
      WHERE a.scope = 'ALL' OR gm.student_id IS NOT NULL
      ORDER BY a.due_date ASC;
    `;
    const { rows: eligibleAssignments } = await pool.query(assignmentsQuery, [studentId]);

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
        professor_name: a.professor_name,
        confirmed: isConfirmed,
        confirmed_at: a.confirmed_at,
        is_late: isLate,
        status,
      };
    });

    const pendingAssignments = totalAssignments - confirmedAssignments;
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

      // Applicable assignments for this group (ALL or targeted to this group)
      const groupAssignmentsQuery = `
        SELECT DISTINCT a.id, a.title, a.due_date, a.scope
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
        // Count confirmed distinct members of this group for this assignment
        const groupConfirmQuery = `
          SELECT COUNT(DISTINCT sc.student_id)::int as count
          FROM submission_confirmations sc
          JOIN group_members gm ON sc.student_id = gm.student_id
          WHERE sc.assignment_id = $1 AND gm.group_id = $2;
        `;
        const confirmRes = await pool.query(groupConfirmQuery, [ga.id, groupId]);
        const confirmedMembers = confirmRes.rows[0]?.count || 0;
        const totalEligible = memberCount;
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
      SELECT a.id, a.title, a.scope, a.due_date, a.created_at,
             u.full_name as professor_name
      FROM assignments a
      JOIN users u ON a.professor_id = u.id
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

      if (a.scope === 'ALL') {
        eligibleStudents = totalStudents;

        const confirmQuery = `
          SELECT 
            COUNT(DISTINCT sc.student_id)::int as total_confirmed,
            COUNT(DISTINCT CASE WHEN sc.confirmed_at > a.due_date THEN sc.student_id END)::int as total_late
          FROM submission_confirmations sc
          JOIN users u ON sc.student_id = u.id AND u.role = 'STUDENT'
          JOIN assignments a ON sc.assignment_id = a.id
          WHERE sc.assignment_id = $1;
        `;
        const confirmRes = await pool.query(confirmQuery, [a.id]);
        confirmedCount = confirmRes.rows[0]?.total_confirmed || 0;
        lateCount = confirmRes.rows[0]?.total_late || 0;
      } else {
        // SPECIFIC_GROUPS: Only students in targeted groups
        const eligibleQuery = `
          SELECT COUNT(DISTINCT gm.student_id)::int as count
          FROM assignment_groups ag
          JOIN group_members gm ON ag.group_id = gm.group_id
          WHERE ag.assignment_id = $1;
        `;
        const eligibleRes = await pool.query(eligibleQuery, [a.id]);
        eligibleStudents = eligibleRes.rows[0]?.count || 0;

        // Current confirmations of currently eligible students
        const confirmQuery = `
          SELECT 
            COUNT(DISTINCT sc.student_id)::int as total_confirmed,
            COUNT(DISTINCT CASE WHEN sc.confirmed_at > a.due_date THEN sc.student_id END)::int as total_late
          FROM submission_confirmations sc
          JOIN group_members gm ON sc.student_id = gm.student_id
          JOIN assignment_groups ag ON gm.group_id = ag.group_id AND ag.assignment_id = sc.assignment_id
          JOIN assignments a ON sc.assignment_id = a.id
          WHERE sc.assignment_id = $1;
        `;
        const confirmRes = await pool.query(confirmQuery, [a.id]);
        confirmedCount = confirmRes.rows[0]?.total_confirmed || 0;
        lateCount = confirmRes.rows[0]?.total_late || 0;
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
        due_date: a.due_date,
        created_at: a.created_at,
        professor_name: a.professor_name,
        eligible_students: eligibleStudents,
        confirmed_count: confirmedCount,
        pending_count: pendingCount,
        late_count: lateCount,
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
   * Returns metadata, overall stats, group-wise breakdown, and student-wise breakdown
   */
  async getAssignmentSubmissionsAdmin(assignmentId) {
    // 1. Fetch assignment
    const assignQuery = `
      SELECT a.id, a.title, a.description, a.due_date, a.onedrive_link, a.scope,
             a.created_at, a.updated_at,
             u.full_name as professor_name, u.email as professor_email
      FROM assignments a
      JOIN users u ON a.professor_id = u.id
      WHERE a.id = $1;
    `;
    const assignRes = await pool.query(assignQuery, [assignmentId]);
    if (assignRes.rows.length === 0) {
      return null;
    }
    const assignment = assignRes.rows[0];

    // 2. Group-wise breakdown
    let groupRows = [];
    if (assignment.scope === 'ALL') {
      const allGroupsQuery = `
        SELECT g.id as group_id, g.name as group_name,
               COUNT(DISTINCT gm.student_id)::int as eligible_count,
               COUNT(DISTINCT sc.student_id)::int as confirmed_count
        FROM groups g
        LEFT JOIN group_members gm ON g.id = gm.group_id
        LEFT JOIN submission_confirmations sc ON gm.student_id = sc.student_id AND sc.assignment_id = $1
        GROUP BY g.id, g.name
        ORDER BY g.name ASC;
      `;
      const res = await pool.query(allGroupsQuery, [assignmentId]);
      groupRows = res.rows;
    } else {
      const targetedGroupsQuery = `
        SELECT g.id as group_id, g.name as group_name,
               COUNT(DISTINCT gm.student_id)::int as eligible_count,
               COUNT(DISTINCT sc.student_id)::int as confirmed_count
        FROM assignment_groups ag
        JOIN groups g ON ag.group_id = g.id
        LEFT JOIN group_members gm ON g.id = gm.group_id
        LEFT JOIN submission_confirmations sc ON gm.student_id = sc.student_id AND sc.assignment_id = ag.assignment_id
        WHERE ag.assignment_id = $1
        GROUP BY g.id, g.name
        ORDER BY g.name ASC;
      `;
      const res = await pool.query(targetedGroupsQuery, [assignmentId]);
      groupRows = res.rows;
    }

    const groupTracking = groupRows.map((g) => {
      const eligible = g.eligible_count;
      const confirmed = g.confirmed_count;
      const pending = Math.max(0, eligible - confirmed);
      const progressPercent = eligible > 0 ? Math.round((confirmed / eligible) * 100) : 0;
      let status = 'NOT_STARTED';
      if (progressPercent === 100) {
        status = 'COMPLETED';
      } else if (progressPercent > 0) {
        status = 'IN_PROGRESS';
      }
      return {
        group_id: g.group_id,
        group_name: g.group_name,
        eligible_count: eligible,
        confirmed_count: confirmed,
        pending_count: pending,
        progress_percentage: progressPercent,
        status,
      };
    });

    // 3. Student-wise breakdown
    let studentRows = [];
    if (assignment.scope === 'ALL') {
      const allStudentsQuery = `
        SELECT u.id as student_id, u.full_name as student_name, u.email as student_email,
               g.id as group_id, g.name as group_name,
               sc.confirmed_at,
               (sc.confirmed_at IS NOT NULL) as confirmed,
               (sc.confirmed_at > a.due_date) as is_late
        FROM users u
        CROSS JOIN assignments a
        LEFT JOIN group_members gm ON u.id = gm.student_id
        LEFT JOIN groups g ON gm.group_id = g.id
        LEFT JOIN submission_confirmations sc ON u.id = sc.student_id AND sc.assignment_id = a.id
        WHERE u.role = 'STUDENT' AND a.id = $1
        ORDER BY u.full_name ASC;
      `;
      const res = await pool.query(allStudentsQuery, [assignmentId]);
      studentRows = res.rows;
    } else {
      const targetedStudentsQuery = `
        SELECT DISTINCT u.id as student_id, u.full_name as student_name, u.email as student_email,
               g.id as group_id, g.name as group_name,
               sc.confirmed_at,
               (sc.confirmed_at IS NOT NULL) as confirmed,
               (sc.confirmed_at > a.due_date) as is_late
        FROM assignment_groups ag
        JOIN group_members gm ON ag.group_id = gm.group_id
        JOIN groups g ON gm.group_id = g.id
        JOIN users u ON gm.student_id = u.id
        JOIN assignments a ON ag.assignment_id = a.id
        LEFT JOIN submission_confirmations sc ON u.id = sc.student_id AND sc.assignment_id = a.id
        WHERE ag.assignment_id = $1
        ORDER BY u.full_name ASC;
      `;
      const res = await pool.query(targetedStudentsQuery, [assignmentId]);
      studentRows = res.rows;
    }

    const isPastDue = new Date(assignment.due_date) < new Date();

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
        confirmed: isConfirmed,
        confirmed_at: s.confirmed_at || null,
        is_late: isLate,
        status,
      };
    });

    // 4. Overall metrics
    const totalEligible = studentTracking.length;
    const totalConfirmed = studentTracking.filter((s) => s.confirmed).length;
    const totalPending = totalEligible - totalConfirmed;
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
        professor_name: assignment.professor_name,
        professor_email: assignment.professor_email,
      },
      overall: {
        eligible_count: totalEligible,
        confirmed_count: totalConfirmed,
        pending_count: totalPending,
        late_count: totalLate,
        completion_percentage: overallPercentage,
      },
      group_tracking: groupTracking,
      student_tracking: studentTracking,
    };
  },
};
