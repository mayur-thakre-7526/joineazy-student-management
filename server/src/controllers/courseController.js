import { CourseModel } from '../models/courseModel.js';
import {
  createCourseSchema,
  enrollCourseSchema,
  uuidParamSchema,
} from '../validators/courseValidators.js';
import { logger } from '../utils/logger.js';

export const CourseController = {
  /**
   * Create a new course (ADMIN / Professor only)
   * POST /api/courses
   */
  async createCourse(req, res, next) {
    try {
      const parseResult = createCourseSchema.safeParse(req.body);
      if (!parseResult.success) {
        const issues = parseResult.error.issues || parseResult.error.errors || [];
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: issues.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }

      const { title, course_code, description } = parseResult.data;
      const professorId = req.user.id;

      const course = await CourseModel.create({
        title,
        courseCode: course_code,
        description,
        professorId,
      });

      logger.info(
        `Course created: "${course.title}" (${course.course_code}) by professor ${req.user.email}`
      );

      return res.status(201).json({
        success: true,
        message: 'Course created successfully',
        course,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * List courses (Role-aware)
   * GET /api/courses
   */
  async getCourses(req, res, next) {
    try {
      let courses = [];
      if (req.user.role === 'ADMIN') {
        if (req.query.scope === 'all') {
          courses = await CourseModel.findAll();
        } else {
          courses = await CourseModel.findAllForProfessor(req.user.id);
        }
      } else {
        courses = await CourseModel.findAllForStudent(req.user.id);
      }

      return res.status(200).json({
        success: true,
        courses,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * List user's courses explicitly
   * GET /api/courses/my
   */
  async getMyCourses(req, res, next) {
    try {
      let courses = [];
      if (req.user.role === 'ADMIN') {
        courses = await CourseModel.findAllForProfessor(req.user.id);
      } else {
        courses = await CourseModel.findAllForStudent(req.user.id);
      }

      return res.status(200).json({
        success: true,
        courses,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get single course details
   * GET /api/courses/:id
   */
  async getCourseById(req, res, next) {
    try {
      const idParse = uuidParamSchema.safeParse(req.params.id);
      if (!idParse.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid course ID format. Must be a valid UUID.',
          },
        });
      }

      const courseId = idParse.data;
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Course not found.',
          },
        });
      }

      let isEnrolled = false;
      if (req.user.role === 'STUDENT') {
        isEnrolled = await CourseModel.isStudentEnrolled(courseId, req.user.id);
      }

      return res.status(200).json({
        success: true,
        course: {
          ...course,
          is_enrolled: req.user.role === 'STUDENT' ? isEnrolled : undefined,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get assignments belonging to a course
   * GET /api/courses/:id/assignments
   */
  async getCourseAssignments(req, res, next) {
    try {
      const idParse = uuidParamSchema.safeParse(req.params.id);
      if (!idParse.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid course ID format. Must be a valid UUID.',
          },
        });
      }

      const courseId = idParse.data;
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Course not found.',
          },
        });
      }

      let assignments = [];
      if (req.user.role === 'ADMIN') {
        assignments = await CourseModel.getCourseAssignmentsForAdmin(courseId);
      } else {
        assignments = await CourseModel.getCourseAssignmentsForStudent(courseId, req.user.id);
      }

      return res.status(200).json({
        success: true,
        course: {
          id: course.id,
          title: course.title,
          course_code: course.course_code,
        },
        assignments,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Enroll in a course by course ID (STUDENT only)
   * POST /api/courses/:id/enroll
   */
  async enrollInCourseById(req, res, next) {
    try {
      const idParse = uuidParamSchema.safeParse(req.params.id);
      if (!idParse.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid course ID format. Must be a valid UUID.',
          },
        });
      }

      const courseId = idParse.data;
      const studentId = req.user.id;

      const result = await CourseModel.enrollStudent({ courseId, studentId });

      logger.info(
        `Student ${req.user.email} enrolled in course "${result.course.title}" (${result.course.course_code})`
      );

      return res.status(201).json({
        success: true,
        message: `Successfully enrolled in course "${result.course.title}"`,
        enrollment: result.enrollment,
        course: result.course,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Self-enroll by course code (STUDENT only)
   * POST /api/courses/enroll
   */
  async enrollByCode(req, res, next) {
    try {
      const parseResult = enrollCourseSchema.safeParse(req.body);
      if (!parseResult.success) {
        const issues = parseResult.error.issues || parseResult.error.errors || [];
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: issues.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }

      const { course_code } = parseResult.data;
      const course = await CourseModel.findByCode(course_code);
      if (!course) {
        return res.status(404).json({
          success: false,
          error: {
            message: `No active course found with code "${course_code}". Please verify the code with your professor.`,
          },
        });
      }

      const result = await CourseModel.enrollStudent({
        courseId: course.id,
        studentId: req.user.id,
      });

      logger.info(
        `Student ${req.user.email} enrolled via code in course "${result.course.title}" (${result.course.course_code})`
      );

      return res.status(201).json({
        success: true,
        message: `Successfully enrolled in course "${result.course.title}"`,
        enrollment: result.enrollment,
        course: result.course,
      });
    } catch (error) {
      next(error);
    }
  },
};
