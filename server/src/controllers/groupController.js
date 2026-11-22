import { GroupModel } from '../models/groupModel.js';
import { UserModel } from '../models/userModel.js';
import {
  createGroupSchema,
  inviteSchema,
  uuidParamSchema,
} from '../validators/groupValidators.js';
import { logger } from '../utils/logger.js';

export const GroupController = {
  /**
   * Create a new student group
   * POST /api/groups
   */
  async createGroup(req, res, next) {
    try {
      const parseResult = createGroupSchema.safeParse(req.body);
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

      const { name } = parseResult.data;
      const creatorId = req.user.id;

      const group = await GroupModel.createGroupWithCreator({
        name,
        creatorId,
      });

      logger.info(`Group created: "${group.name}" (ID: ${group.id}) by student ${req.user.email}`);

      return res.status(201).json({
        success: true,
        message: 'Group created successfully',
        group: {
          id: group.id,
          name: group.name,
          created_by: group.created_by,
          created_at: group.created_at,
          members: [
            {
              id: req.user.id,
              full_name: req.user.email, // Fresh details queried via getMyGroup
              email: req.user.email,
              is_creator: true,
              joined_at: group.joined_at,
            },
          ],
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get authenticated student's current group
   * GET /api/groups/my
   */
  async getMyGroup(req, res, next) {
    try {
      const studentId = req.user.id;
      const group = await GroupModel.findStudentGroup(studentId);

      if (!group) {
        return res.status(200).json({
          success: true,
          group: null,
          message: 'You are not currently a member of any group.',
        });
      }

      // If the authenticated student is the creator, include pending group invitations
      let pendingInvitations = [];
      if (group.is_creator) {
        const allInvitations = await GroupModel.getGroupInvitations(group.id);
        pendingInvitations = allInvitations.filter((inv) => inv.status === 'PENDING');
      }

      return res.status(200).json({
        success: true,
        group: {
          ...group,
          pending_invitations: group.is_creator ? pendingInvitations : undefined,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get group details by ID (Private to group members and admins)
   * GET /api/groups/:id
   */
  async getGroupById(req, res, next) {
    try {
      const idParse = uuidParamSchema.safeParse(req.params.id);
      if (!idParse.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid group ID format. Must be a valid UUID.',
          },
        });
      }

      const groupId = idParse.data;
      const group = await GroupModel.findById(groupId);

      if (!group) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Group not found.',
          },
        });
      }

      // Member authorization check: Only group members or Admins may view group roster
      const isMember = await GroupModel.isMemberOfGroup(groupId, req.user.id);
      const isAdmin = req.user.role === 'ADMIN';

      if (!isMember && !isAdmin) {
        logger.warn(`Unauthorized access attempt to group ${groupId} by user ${req.user.email}`);
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied: You are not a member of this group.',
          },
        });
      }

      const members = await GroupModel.getGroupMembers(groupId);

      return res.status(200).json({
        success: true,
        group: {
          id: group.id,
          name: group.name,
          created_by: {
            id: group.created_by,
            full_name: group.creator_name,
            email: group.creator_email,
          },
          created_at: group.created_at,
          members,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Send an in-app group invitation
   * POST /api/groups/:id/invitations
   */
  async createInvitation(req, res, next) {
    try {
      // 1. Validate Group ID param
      const idParse = uuidParamSchema.safeParse(req.params.id);
      if (!idParse.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid group ID format. Must be a valid UUID.',
          },
        });
      }
      const groupId = idParse.data;

      // 2. Validate request body
      const bodyParse = inviteSchema.safeParse(req.body);
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

      const { email, student_id } = bodyParse.data;

      // 3. Verify group exists and caller is the group creator
      const group = await GroupModel.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Group not found.',
          },
        });
      }

      if (group.created_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Only the group creator can send invitations.',
          },
        });
      }

      // 4. Find target user
      let targetUser = null;
      if (email) {
        targetUser = await UserModel.findByEmail(email.trim().toLowerCase());
      } else if (student_id) {
        targetUser = await UserModel.findById(student_id);
      }

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Student account not found.',
          },
        });
      }

      // 5. Target user must have STUDENT role
      if (targetUser.role !== 'STUDENT') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Only students can be invited to student groups.',
          },
        });
      }

      // 6. Prevent inviting yourself
      if (targetUser.id === req.user.id) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'You cannot invite yourself to your own group.',
          },
        });
      }

      // 7. Prevent inviting existing group members
      const isAlreadyMember = await GroupModel.isMemberOfGroup(groupId, targetUser.id);
      if (isAlreadyMember) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'This student is already a member of this group.',
          },
        });
      }

      // 8. Prevent inviting students who already belong to another group
      const inOtherGroup = await GroupModel.isStudentInAnyGroup(targetUser.id);
      if (inOtherGroup) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'This student already belongs to an active group.',
          },
        });
      }

      // 9. Prevent duplicate pending invitations
      const hasPending = await GroupModel.hasPendingInvitation(groupId, targetUser.id);
      if (hasPending) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'A pending invitation has already been sent to this student.',
          },
        });
      }

      // 10. Create invitation
      const invitation = await GroupModel.createInvitation({
        groupId,
        invitedStudentId: targetUser.id,
        invitedBy: req.user.id,
      });

      logger.info(
        `Invitation sent for group "${group.name}" to student ${targetUser.email} (ID: ${invitation.id})`
      );

      return res.status(201).json({
        success: true,
        message: 'Invitation sent successfully',
        invitation: {
          id: invitation.id,
          group_id: invitation.group_id,
          invited_student: {
            id: targetUser.id,
            full_name: targetUser.full_name,
            email: targetUser.email,
          },
          status: invitation.status,
          created_at: invitation.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * View all invitations sent by this group (creator view)
   * GET /api/groups/:id/invitations
   */
  async getGroupInvitations(req, res, next) {
    try {
      const idParse = uuidParamSchema.safeParse(req.params.id);
      if (!idParse.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid group ID format.',
          },
        });
      }
      const groupId = idParse.data;

      const group = await GroupModel.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Group not found.',
          },
        });
      }

      if (group.created_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Only the group creator can view group invitations.',
          },
        });
      }

      const invitations = await GroupModel.getGroupInvitations(groupId);

      return res.status(200).json({
        success: true,
        invitations,
      });
    } catch (error) {
      next(error);
    }
  },
};
