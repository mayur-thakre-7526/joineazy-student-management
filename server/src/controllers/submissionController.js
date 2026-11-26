import { SubmissionModel } from '../models/submissionModel.js';
import { AssignmentModel } from '../models/assignmentModel.js';
import { uuidParamSchema } from '../validators/assignmentValidators.js';
import { logger } from '../utils/logger.js';

export const SubmissionController = {
  /**
   * Confirm assignment submission (STUDENT only, INDIVIDUAL assignments)
   * POST /api/assignments/:id/confirm
   */
  async confirmSubmission(req, res, next) {
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
      const studentId = req.user.id;

      // 1. Verify assignment exists
      const assignment = await AssignmentModel.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Assignment not found.',
          },
        });
      }

      // CRITICAL: Reject GROUP assignments on individual confirmation endpoint
      if (assignment.submission_type === 'GROUP') {
        return res.status(400).json({
          success: false,
          error: {
            message:
              'This assignment requires group leader submission acknowledgment. Individual confirmation is disabled for group assignments.',
          },
        });
      }

      // 2. Check student eligibility (ALL or assigned group member, plus course enrollment if scoped)
      const isEligible = await AssignmentModel.isStudentEligible(assignmentId, studentId);
      if (!isEligible) {
        logger.warn(
          `Unauthorized submission confirmation attempt by student ${req.user.email} on assignment ${assignmentId}`
        );
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied: You are not assigned to this assignment.',
          },
        });
      }

      // 3. Perform atomic confirmation insert
      const result = await SubmissionModel.confirmSubmission(assignmentId, studentId);

      if (result.isDuplicate) {
        const isLate =
          result.confirmation &&
          new Date(result.confirmation.confirmed_at) > new Date(assignment.due_date);

        return res.status(409).json({
          success: false,
          error: {
            message: 'You have already confirmed submission for this assignment.',
          },
          confirmation: result.confirmation
            ? {
                id: result.confirmation.id,
                assignment_id: result.confirmation.assignment_id,
                student_id: result.confirmation.student_id,
                confirmed_at: result.confirmation.confirmed_at,
                is_late: isLate,
              }
            : null,
        });
      }

      const isLate =
        new Date(result.confirmation.confirmed_at) > new Date(assignment.due_date);

      logger.info(
        `Submission confirmed for assignment "${assignment.title}" by student ${req.user.email} (Late: ${isLate})`
      );

      return res.status(201).json({
        success: true,
        message: 'Submission confirmation recorded successfully.',
        confirmation: {
          id: result.confirmation.id,
          assignment_id: result.confirmation.assignment_id,
          student_id: result.confirmation.student_id,
          confirmed_at: result.confirmation.confirmed_at,
          is_late: isLate,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Acknowledge group assignment submission (STUDENT group leader only)
   * POST /api/assignments/:id/group-acknowledge
   */
  async acknowledgeGroupSubmission(req, res, next) {
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
      const leaderId = req.user.id;

      // 1. Verify assignment exists
      const assignment = await AssignmentModel.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Assignment not found.',
          },
        });
      }

      // 2. Reject if assignment is not GROUP type
      if (assignment.submission_type !== 'GROUP') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'This assignment is an individual assignment. Group acknowledgment is not allowed.',
          },
        });
      }

      // 3. Delegate to transactional model method which validates leader identity,
      //    course enrollment, scope targeting, duplicate prevention, and takes member snapshots
      const result = await SubmissionModel.acknowledgeGroupSubmission({
        assignmentId,
        leaderId,
      });

      logger.info(
        `Group submission acknowledged for assignment "${assignment.title}" (Group ID: ${result.group_id}) by leader ${req.user.email} (Late: ${result.is_late}, Members snapshotted: ${result.snapshotted_members_count})`
      );

      return res.status(201).json({
        success: true,
        message: 'Group submission acknowledgment recorded successfully.',
        acknowledgment: {
          id: result.acknowledgment.id,
          assignment_id: result.acknowledgment.assignment_id,
          group_id: result.acknowledgment.group_id,
          group_name: result.group_name,
          acknowledged_by: result.acknowledgment.acknowledged_by,
          acknowledged_at: result.acknowledgment.acknowledged_at,
          is_late: result.is_late,
          snapshotted_members_count: result.snapshotted_members_count,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get group submission status for an assignment (Role-aware)
   * GET /api/assignments/:id/group-status
   */
  async getGroupStatus(req, res, next) {
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
      const studentId = req.user.id;

      const groupStatus = await SubmissionModel.getGroupStatus({
        assignmentId,
        studentId,
      });

      return res.status(200).json({
        success: true,
        group_status: groupStatus,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get student's submission status for a single assignment
   * GET /api/assignments/:id/submission (STUDENT only)
   */
  async getSubmissionStatus(req, res, next) {
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
      const studentId = req.user.id;

      // Verify assignment exists
      const assignment = await AssignmentModel.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Assignment not found.',
          },
        });
      }

      // Check student eligibility
      const isEligible = await AssignmentModel.isStudentEligible(assignmentId, studentId);
      if (!isEligible) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied: You are not assigned to this assignment.',
          },
        });
      }

      const submission = await SubmissionModel.getSubmissionStatus(assignmentId, studentId);

      return res.status(200).json({
        success: true,
        submission,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get student's comprehensive coursework & group progress
   * GET /api/student/progress (STUDENT only)
   */
  async getStudentProgress(req, res, next) {
    try {
      const progress = await SubmissionModel.getStudentProgress(req.user.id);
      return res.status(200).json({
        success: true,
        summary: progress.summary,
        assignments: progress.assignments,
        group: progress.group,
      });
    } catch (error) {
      next(error);
    }
  },
};
