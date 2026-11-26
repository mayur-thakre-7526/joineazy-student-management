import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import readyRoutes from './readyRoutes.js';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import groupRoutes from './groupRoutes.js';
import invitationRoutes from './invitationRoutes.js';
import assignmentRoutes from './assignmentRoutes.js';
import studentRoutes from './studentRoutes.js';
import courseRoutes from './courseRoutes.js';

const router = Router();

// System diagnostics
router.use('/health', healthRoutes);
router.use('/ready', readyRoutes);

// Authentication & Profile
router.use('/auth', authRoutes);

// Admin Role verification & Admin operations
router.use('/admin', adminRoutes);

// Courses & Enrollment (Round 2)
router.use('/courses', courseRoutes);

// Student Groups & Invitations
router.use('/groups', groupRoutes);
router.use('/invitations', invitationRoutes);

// Assignments (Students & Admins)
router.use('/assignments', assignmentRoutes);

// Student Progress & Coursework
router.use('/student', studentRoutes);

export default router;
