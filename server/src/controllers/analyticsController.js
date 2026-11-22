import { SubmissionModel } from '../models/submissionModel.js';
import { uuidParamSchema } from '../validators/assignmentValidators.js';

export const AnalyticsController = {
  /**
   * Get overarching course analytics (ADMIN only)
   * GET /api/admin/analytics
   */
  async getAdminAnalytics(req, res, next) {
    try {
      const analytics = await SubmissionModel.getAdminAnalytics();
      return res.status(200).json({
        success: true,
        overview: analytics.overview,
        assignments: analytics.assignments,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get detailed group and student submission tracking for a specific assignment (ADMIN only)
   * GET /api/admin/assignments/:id/submissions
   */
  async getAssignmentSubmissionsAdmin(req, res, next) {
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
      const tracking = await SubmissionModel.getAssignmentSubmissionsAdmin(assignmentId);

      if (!tracking) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Assignment not found.',
          },
        });
      }

      return res.status(200).json({
        success: true,
        assignment: tracking.assignment,
        overall: tracking.overall,
        group_tracking: tracking.group_tracking,
        student_tracking: tracking.student_tracking,
      });
    } catch (error) {
      next(error);
    }
  },
};
