import { Router } from 'express';
import { CourseController } from '../controllers/courseController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Base authentication required for all course endpoints
router.use(authenticateToken);

// List courses (Role-aware: Professors see courses taught; Students see enrolled courses)
router.get('/', CourseController.getCourses);

// Explicitly retrieve user's courses
router.get('/my', CourseController.getMyCourses);

// Self-enroll using course code (STUDENT only)
router.post('/enroll', requireRole('STUDENT'), CourseController.enrollByCode);

// Single course details
router.get('/:id', CourseController.getCourseById);

// Get assignments belonging to a course (Role-aware with enrollment checks)
router.get('/:id/assignments', CourseController.getCourseAssignments);

// Create new course (ADMIN / Professor only)
router.post('/', requireRole('ADMIN'), CourseController.createCourse);

// Enroll in course by ID (STUDENT only)
router.post('/:id/enroll', requireRole('STUDENT'), CourseController.enrollInCourseById);

export default router;
