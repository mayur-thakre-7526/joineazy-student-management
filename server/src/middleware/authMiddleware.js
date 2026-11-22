import { verifyToken } from '../utils/token.js';
import { UserModel } from '../models/userModel.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware: Verify JWT from Cookie or Authorization header
 */
export async function authenticateToken(req, res, next) {
  let token = null;

  // 1. Check HTTP-only cookie first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization Header: Bearer <token>
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required. No token provided.',
      },
    });
  }

  try {
    const decoded = verifyToken(token);
    
    // Attach decoded token data to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token has expired. Please log in again.',
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid authentication token.',
      },
    });
  }
}

/**
 * Middleware: Role Authorization Gate
 * Ensures req.user has one of the allowed roles
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required.',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.email} (Role: ${req.user.role}) to protected role route.`);
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied: You do not have sufficient permissions to access this resource.',
        },
      });
    }

    next();
  };
}
