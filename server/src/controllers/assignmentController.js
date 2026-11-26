import { AssignmentModel } from '../models/assignmentModel.js';
import { SubmissionModel } from '../models/submissionModel.js';
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  uuidParamSchema,
} from '../validators/assignmentValidators.js';
import { logger } from '../utils/logger.js';

export const AssignmentController = {
  /**
   * Create an assignment
   * POST /api/assignments (ADMIN only)
   */
  async createAssignment(req, res, next) {
    try {
      const parseResult = createAssignmentSchema.safeParse(req.body);
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

      const {
        title,
        description,
        due_date,
        onedrive_link,
        scope,
        course_id,
        submission_type,
        group_ids,
      } = parseResult.data;
      const professorId = req.user.id;

      const assignment = await AssignmentModel.createAssignment({
        professorId,
        title,
        description,
        dueDate: due_date,
        onedriveLink: onedrive_link,
        scope,
        courseId: course_id,
        submissionType: submission_type,
        groupIds: group_ids,
      });

      logger.info(
        `Assignment created: "${assignment.title}" (ID: ${assignment.id}, Scope: ${assignment.scope}) by professor ${req.user.email}`
      );

      return res.status(201).json({
        success: true,
        message: 'Assignment created successfully',
        assignment,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get assignments list (Role-aware)
   * GET /api/assignments
   */
  async getAssignments(req, res, next) {
    try {
      let assignments = [];
      if (req.user.role === 'ADMIN') {
        assignments = await AssignmentModel.findAllForAdmin();
      } else {
        assignments = await AssignmentModel.findAllForStudent(req.user.id);
      }

      return res.status(200).json({
        success: true,
        assignments,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get assignment details by ID
   * GET /api/assignments/:id
   */
  async getAssignmentById(req, res, next) {
    try {
      const idParse = uuidParamSchema.safeParse(req.params.id);
      if (!idParse.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid assignment ID format. Must be a valid UUID.',
          },
        });
      }

      const assignmentId = idParse.data;
      const assignment = await AssignmentModel.findById(assignmentId);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Assignment not found.',
          },
        });
      }

      // Authorization check for Students
      if (req.user.role === 'STUDENT') {
        const isEligible = await AssignmentModel.isStudentEligible(assignmentId, req.user.id);
        if (!isEligible) {
          logger.warn(
            `Unauthorized assignment detail attempt by student ${req.user.email} on assignment ${assignmentId}`
          );
          return res.status(403).json({
            success: false,
            error: {
              message: 'Access denied: You are not assigned to this assignment.',
            },
          });
        }

        const submission = await SubmissionModel.getSubmissionStatus(assignmentId, req.user.id);
        return res.status(200).json({
          success: true,
          assignment: {
            ...assignment,
            submission,
          },
        });
      }

      // For Admin, fetch target groups details
      const assignedGroups = await AssignmentModel.getAssignedGroups(assignmentId);

      return res.status(200).json({
        success: true,
        assignment: {
          ...assignment,
          assigned_groups: assignedGroups,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update an existing assignment
   * PUT /api/assignments/:id (ADMIN only)
   */
  async updateAssignment(req, res, next) {
    try {
      const idParse = uuidParamSchema.safeParse(req.params.id);
      if (!idParse.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid assignment ID format. Must be a valid UUID.',
          },
        });
      }

      const assignmentId = idParse.data;

      const bodyParse = updateAssignmentSchema.safeParse(req.body);
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

      const {
        title,
        description,
        due_date,
        onedrive_link,
        scope,
        course_id,
        submission_type,
        group_ids,
      } = bodyParse.data;

      const updatedAssignment = await AssignmentModel.updateAssignment({
        assignmentId,
        editorId: req.user.id,
        title,
        description,
        dueDate: due_date,
        onedriveLink: onedrive_link,
        scope,
        courseId: course_id,
        submissionType: submission_type,
        groupIds: group_ids,
      });

      logger.info(
        `Assignment updated: "${updatedAssignment.title}" (ID: ${assignmentId}) by professor ${req.user.email}`
      );

      return res.status(200).json({
        success: true,
        message: 'Assignment updated successfully',
        assignment: updatedAssignment,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Helper endpoint: Get all groups for Admin assignment targeting
   * GET /api/admin/groups (ADMIN only)
   */
  async getAdminGroups(req, res, next) {
    try {
      const groups = await AssignmentModel.getAllGroupsForAdmin();
      return res.status(200).json({
        success: true,
        groups,
      });
    } catch (error) {
      next(error);
    }
  },
};
