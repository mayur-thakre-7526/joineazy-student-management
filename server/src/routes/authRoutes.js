import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getCsrfTokenHandler } from '../middleware/csrfMiddleware.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// CSRF token retrieval
router.get('/csrf-token', getCsrfTokenHandler);

// Public auth routes (with rate limiting on login)
router.post('/register', AuthController.register);
router.post('/login', loginRateLimiter, AuthController.login);

// Protected auth routes
router.get('/me', authenticateToken, AuthController.getMe);
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
