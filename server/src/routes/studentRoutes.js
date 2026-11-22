import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { SubmissionController } from '../controllers/submissionController.js';

const router = Router();

// Student routes require authentication and STUDENT role
router.use(authenticateToken);
router.use(requireRole('STUDENT'));

/**
 * Get comprehensive student coursework progress
 * GET /api/student/progress
 */
router.get('/progress', SubmissionController.getStudentProgress);

export default router;
