import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { AssignmentController } from '../controllers/assignmentController.js';
import { AnalyticsController } from '../controllers/analyticsController.js';

const router = Router();

// Enforce Admin role for all routes in /api/admin
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

/**
 * Admin Role Verification Route
 * GET /api/admin/test
 */
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Administrator portal. Role-based access control verified.',
    admin: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

/**
 * Admin Groups targeting endpoint
 * GET /api/admin/groups
 */
router.get('/groups', AssignmentController.getAdminGroups);

/**
 * Overarching Course Analytics
 * GET /api/admin/analytics
 */
router.get('/analytics', AnalyticsController.getAdminAnalytics);

/**
 * Detailed Group & Student Submissions Tracking for an assignment
 * GET /api/admin/assignments/:id/submissions
 */
router.get('/assignments/:id/submissions', AnalyticsController.getAssignmentSubmissionsAdmin);

export default router;
