import { Router } from 'express';
import { GroupController } from '../controllers/groupController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// All group endpoints require authenticated STUDENT role
router.use(authenticateToken);
router.use(requireRole('STUDENT'));

// Group Creation & Current Group
router.post('/', GroupController.createGroup);
router.get('/my', GroupController.getMyGroup);

// Single Group Roster View
router.get('/:id', GroupController.getGroupById);

// Group Creator Invitation Management
router.post('/:id/invitations', GroupController.createInvitation);
router.get('/:id/invitations', GroupController.getGroupInvitations);

export default router;
