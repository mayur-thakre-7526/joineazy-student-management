import { Router } from 'express';
import { InvitationController } from '../controllers/invitationController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// All invitation endpoints require authenticated STUDENT role
router.use(authenticateToken);
router.use(requireRole('STUDENT'));

// Retrieve pending invitations addressed to current student
router.get('/my-pending', InvitationController.getMyPendingInvitations);

// Respond to an invitation (ACCEPT / REJECT)
router.post('/:id/respond', InvitationController.respondToInvitation);

export default router;
