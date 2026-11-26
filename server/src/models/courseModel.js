import { pool } from '../config/db.js';

export const CourseModel = {
  /**
   * Create a new course taught by a professor
   */
  async create({ title, courseCode, description = '', professorId }) {
    const normalizedCode = courseCode.trim().toUpperCase();

    // Check for duplicate course code (case-insensitive)
    const duplicateCheck = await pool.query(
      'SELECT id FROM courses WHERE LOWER(course_code) = LOWER($1) LIMIT 1;',
      [normalizedCode]
    );

    if (duplicateCheck.rows.length > 0) {
      const err = new Error(`Course code "${normalizedCode}" already exists.`);
      err.statusCode = 409;
      throw err;
    }

    const query = `
      INSERT INTO courses (title, course_code, description, professor_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, course_code, description, professor_id, created_at, updated_at;
    `;
    const { rows } = await pool.query(query, [
      title.trim(),
      normalizedCode,
      description.trim(),
      professorId,
    ]);
    return rows[0];
  },

  /**
   * Find single course by ID with professor details and aggregate counts
   */
  async findById(courseId) {
    const query = `
      SELECT c.id, c.title, c.course_code, c.description, c.professor_id, c.created_at, c.updated_at,
             u.full_name as professor_name, u.email as professor_email,
             (SELECT COUNT(*)::int FROM course_enrollments ce WHERE ce.course_id = c.id) as student_count,
             (SELECT COUNT(*)::int FROM assignments a WHERE a.course_id = c.id) as assignment_count
      FROM courses c
      JOIN users u ON c.professor_id = u.id
      WHERE c.id = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [courseId]);
    return rows[0] || null;
  },

  /**
   * Find single course by course code (case-insensitive)
   */
  async findByCode(courseCode) {
    const query = `
      SELECT c.id, c.title, c.course_code, c.description, c.professor_id, c.created_at, c.updated_at,
             u.full_name as professor_name, u.email as professor_email,
             (SELECT COUNT(*)::int FROM course_enrollments ce WHERE ce.course_id = c.id) as student_count,
             (SELECT COUNT(*)::int FROM assignments a WHERE a.course_id = c.id) as assignment_count
      FROM courses c
      JOIN users u ON c.professor_id = u.id
      WHERE LOWER(c.course_code) = LOWER($1)
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [courseCode.trim()]);
    return rows[0] || null;
  },

  /**
   * List all courses with professor details and counts (Admin / System view)
   */
  async findAll() {
    const query = `
      SELECT c.id, c.title, c.course_code, c.description, c.professor_id, c.created_at, c.updated_at,
             u.full_name as professor_name, u.email as professor_email,
             (SELECT COUNT(*)::int FROM course_enrollments ce WHERE ce.course_id = c.id) as student_count,
             (SELECT COUNT(*)::int FROM assignments a WHERE a.course_id = c.id) as assignment_count
      FROM courses c
      JOIN users u ON c.professor_id = u.id
      ORDER BY c.created_at DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  /**
   * List courses taught by a specific professor (Professor view)
   */
  async findAllForProfessor(professorId) {
    const query = `
      SELECT c.id, c.title, c.course_code, c.description, c.professor_id, c.created_at, c.updated_at,
             u.full_name as professor_name, u.email as professor_email,
             (SELECT COUNT(*)::int FROM course_enrollments ce WHERE ce.course_id = c.id) as student_count,
             (SELECT COUNT(*)::int FROM assignments a WHERE a.course_id = c.id) as assignment_count
      FROM courses c
      JOIN users u ON c.professor_id = u.id
      WHERE c.professor_id = $1
      ORDER BY c.created_at DESC;
    `;
    const { rows } = await pool.query(query, [professorId]);
    return rows;
  },

  /**
   * List courses enrolled by a specific student (Student view)
   */
  async findAllForStudent(studentId) {
    const query = `
      SELECT c.id, c.title, c.course_code, c.description, c.professor_id, c.created_at, c.updated_at,
             ce.enrolled_at,
             u.full_name as professor_name, u.email as professor_email,
             (
               SELECT COUNT(DISTINCT a.id)::int
               FROM assignments a
               LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
               LEFT JOIN group_members gm ON ag.group_id = gm.group_id AND gm.student_id = $1
               WHERE a.course_id = c.id
                 AND (a.scope = 'ALL' OR (a.scope = 'SPECIFIC_GROUPS' AND gm.student_id IS NOT NULL))
             ) as assignment_count
      FROM courses c
      JOIN course_enrollments ce ON c.id = ce.course_id
      JOIN users u ON c.professor_id = u.id
      WHERE ce.student_id = $1
      ORDER BY ce.enrolled_at DESC;
    `;
    const { rows } = await pool.query(query, [studentId]);
    return rows;
  },

  /**
   * Check if student is actively enrolled in a course
   */
  async isStudentEnrolled(courseId, studentId) {
    const query = `
      SELECT 1 FROM course_enrollments 
      WHERE course_id = $1 AND student_id = $2 
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [courseId, studentId]);
    return rows.length > 0;
  },

  /**
   * Enroll student into a course
   */
  async enrollStudent({ courseId, studentId }) {
    // 1. Verify course exists
    const course = await this.findById(courseId);
    if (!course) {
      const err = new Error('Course not found.');
      err.statusCode = 404;
      throw err;
    }

    // 2. Check duplicate enrollment
    const alreadyEnrolled = await this.isStudentEnrolled(courseId, studentId);
    if (alreadyEnrolled) {
      const err = new Error('You are already enrolled in this course.');
      err.statusCode = 409;
      throw err;
    }

    // 3. Insert enrollment
    const query = `
      INSERT INTO course_enrollments (course_id, student_id)
      VALUES ($1, $2)
      RETURNING id, course_id, student_id, enrolled_at;
    `;
    const { rows } = await pool.query(query, [courseId, studentId]);
    return {
      enrollment: rows[0],
      course,
    };
  },

  /**
   * Get assignments belonging to a course for an enrolled student
   */
  async getCourseAssignmentsForStudent(courseId, studentId) {
    // 1. Verify enrollment
    const enrolled = await this.isStudentEnrolled(courseId, studentId);
    if (!enrolled) {
      const err = new Error('Access denied. You are not enrolled in this course.');
      err.statusCode = 403;
      throw err;
    }

    // 2. Get student's current active group ID if any
    const groupQuery = `
      SELECT group_id FROM group_members WHERE student_id = $1 LIMIT 1;
    `;
    const { rows: groupRows } = await pool.query(groupQuery, [studentId]);
    const currentGroupId = groupRows.length > 0 ? groupRows[0].group_id : null;

    // 3. Query course assignments matching student eligibility
    const query = `
      SELECT DISTINCT a.id, a.course_id, a.professor_id, a.title, a.description,
             a.due_date, a.onedrive_link, a.scope, a.submission_type, a.created_at, a.updated_at,
             c.title as course_title, c.course_code,
             u.full_name as professor_name, u.email as professor_email,
             CASE
               WHEN a.submission_type = 'GROUP' THEN (gsa.acknowledged_at IS NOT NULL)
               ELSE (sc.confirmed_at IS NOT NULL)
             END as is_confirmed,
             CASE
               WHEN a.submission_type = 'GROUP' THEN gsa.acknowledged_at
               ELSE sc.confirmed_at
             END as confirmed_at,
             CASE
               WHEN a.submission_type = 'GROUP' THEN (gsa.acknowledged_at > a.due_date)
               ELSE (sc.confirmed_at > a.due_date)
             END as is_late,
             gsa.acknowledged_by as group_acknowledged_by,
             leader.full_name as group_acknowledged_by_name,
             (g.created_by = $2) as is_group_leader,
             g.name as group_name
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON a.professor_id = u.id
      LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
      LEFT JOIN submission_confirmations sc ON a.id = sc.assignment_id AND sc.student_id = $2
      LEFT JOIN group_submission_acknowledgments gsa ON a.id = gsa.assignment_id AND gsa.group_id = $3
      LEFT JOIN users leader ON gsa.acknowledged_by = leader.id
      LEFT JOIN groups g ON g.id = $3
      WHERE a.course_id = $1
        AND (a.scope = 'ALL' OR (a.scope = 'SPECIFIC_GROUPS' AND ag.group_id = $3))
      ORDER BY a.due_date ASC;
    `;
    const { rows } = await pool.query(query, [courseId, studentId, currentGroupId]);
    return rows;
  },

  /**
   * Get assignments belonging to a course for Admin/Professor view
   */
  async getCourseAssignmentsForAdmin(courseId) {
    const query = `
      SELECT a.id, a.course_id, a.professor_id, a.title, a.description,
             a.due_date, a.onedrive_link, a.scope, a.submission_type, a.created_at, a.updated_at,
             c.title as course_title, c.course_code,
             u.full_name as professor_name, u.email as professor_email,
             COUNT(ag.group_id)::int as assigned_group_count
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN users u ON a.professor_id = u.id
      LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
      WHERE a.course_id = $1
      GROUP BY a.id, c.title, c.course_code, u.full_name, u.email
      ORDER BY a.due_date ASC;
    `;
    const { rows } = await pool.query(query, [courseId]);
    return rows;
  },
};
