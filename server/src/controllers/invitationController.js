import { GroupModel } from '../models/groupModel.js';
import { respondSchema, uuidParamSchema } from '../validators/groupValidators.js';
import { logger } from '../utils/logger.js';

export const InvitationController = {
  /**
   * Get pending invitations addressed to the authenticated student
   * GET /api/invitations/my-pending
   */
  async getMyPendingInvitations(req, res, next) {
    try {
      const studentId = req.user.id;
      const invitations = await GroupModel.getStudentPendingInvitations(studentId);

      return res.status(200).json({
        success: true,
        invitations,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Accept or Reject a pending invitation
   * POST /api/invitations/:id/respond
   */
  async respondToInvitation(req, res, next) {
    try {
      // 1. Validate Invitation ID param
      const idParse = uuidParamSchema.safeParse(req.params.id);
      if (!idParse.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid invitation ID format. Must be a valid UUID.',
          },
        });
      }
      const invitationId = idParse.data;

      // 2. Validate Action body
      const bodyParse = respondSchema.safeParse(req.body);
      if (!bodyParse.success) {
        const issues = bodyParse.error.issues || bodyParse.error.errors || [];
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

      const { action } = bodyParse.data;
      const studentId = req.user.id;

      // 3. Process response inside transaction with row-level locking
      const result = await GroupModel.respondToInvitation({
        invitationId,
        studentId,
        action,
      });

      logger.info(
        `Student ${req.user.email} responded ${action} to invitation ${invitationId} (Group: ${result.group_name})`
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        action: result.action,
        group_id: result.group_id,
        group_name: result.group_name,
      });
    } catch (error) {
      next(error);
    }
  },
};
