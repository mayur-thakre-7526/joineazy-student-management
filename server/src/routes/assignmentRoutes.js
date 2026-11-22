import { Router } from 'express';
import { AssignmentController } from '../controllers/assignmentController.js';
import { SubmissionController } from '../controllers/submissionController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Base authentication required for all assignment routes
router.use(authenticateToken);

// List assignments (Students see eligible; Admins see all)
router.get('/', AssignmentController.getAssignments);

// Single assignment details
router.get('/:id', AssignmentController.getAssignmentById);

// Create assignment (ADMIN only)
router.post('/', requireRole('ADMIN'), AssignmentController.createAssignment);

// Edit assignment (ADMIN only)
router.put('/:id', requireRole('ADMIN'), AssignmentController.updateAssignment);

// Confirm assignment submission (STUDENT only)
router.post('/:id/confirm', requireRole('STUDENT'), SubmissionController.confirmSubmission);

// Get student's submission status for an assignment (STUDENT only)
router.get('/:id/submission', requireRole('STUDENT'), SubmissionController.getSubmissionStatus);

export default router;
