import bcrypt from 'bcryptjs';
import { registerSchema, loginSchema } from '../validators/authValidators.js';
import { UserModel } from '../models/userModel.js';
import { signToken } from '../utils/token.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { generateCsrfToken } from '../middleware/csrfMiddleware.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24h
};

const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000,
};

export const AuthController = {
  /**
   * Register a new student account
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      // 1. Zod input validation
      const parseResult = registerSchema.safeParse(req.body);
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

      const { full_name, email, password } = parseResult.data;
      const normalizedEmail = email.trim().toLowerCase();

      // 2. Check duplicate email
      const existingUser = await UserModel.findByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'An account with this email address already exists.',
          },
        });
      }

      // 3. Hash password with bcryptjs
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // 4. Create student (enforcing STUDENT role, ignoring any client role input)
      const user = await UserModel.createStudent({
        full_name,
        email: normalizedEmail,
        password_hash,
      });

      // 5. Generate signed JWT token
      const token = signToken(user);

      // 6. Set HTTP-only secure cookie for authentication
      res.cookie('token', token, COOKIE_OPTIONS);

      // 7. Ensure CSRF cookie is set
      const csrfToken = generateCsrfToken();
      res.cookie('XSRF-TOKEN', csrfToken, CSRF_COOKIE_OPTIONS);

      logger.info(`Student registered successfully: ${user.email} (ID: ${user.id})`);

      return res.status(201).json({
        success: true,
        message: 'Student account registered successfully',
        token, // Provided for API testing & programmatic consumers; frontend uses HTTP-only cookie
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Log in an existing user
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      // 1. Zod input validation
      const parseResult = loginSchema.safeParse(req.body);
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

      const { email, password } = parseResult.data;
      const normalizedEmail = email.trim().toLowerCase();

      // 2. Find user by email
      const user = await UserModel.findByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid email or password.',
          },
        });
      }

      // 3. Verify password securely
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid email or password.',
          },
        });
      }

      // 4. Generate signed JWT token
      const token = signToken(user);

      // 5. Set HTTP-only secure cookie
      res.cookie('token', token, COOKIE_OPTIONS);

      // 6. Ensure CSRF cookie is set
      const csrfToken = generateCsrfToken();
      res.cookie('XSRF-TOKEN', csrfToken, CSRF_COOKIE_OPTIONS);

      logger.info(`User logged in: ${user.email} (Role: ${user.role})`);

      return res.status(200).json({
        success: true,
        message: 'Authentication successful',
        token, // Provided for API testing & programmatic consumers; frontend uses HTTP-only cookie
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get authenticated user profile
   * GET /api/auth/me
   */
  async getMe(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User profile not found.',
          },
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Log out authenticated user
   * POST /api/auth/logout
   */
  async logout(req, res) {
    res.clearCookie('token', COOKIE_OPTIONS);
    res.clearCookie('XSRF-TOKEN', CSRF_COOKIE_OPTIONS);
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  },
};
