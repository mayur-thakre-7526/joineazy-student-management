import { Router } from 'express';
import { getReadinessStatus } from '../controllers/readyController.js';

const router = Router();

// GET /api/ready
router.get('/', getReadinessStatus);

export default router;
