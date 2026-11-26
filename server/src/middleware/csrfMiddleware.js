import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const CSRF_COOKIE_OPTIONS = {
  httpOnly: false, // Must be readable by client JS to send in X-CSRF-Token header
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Generates a cryptographically strong CSRF token bound to server secret
 */
export function generateCsrfToken() {
  const secret = env.CSRF?.secret || 'joineazy_csrf_secret_default_key';
  return crypto.createHmac('sha256', secret).update(crypto.randomBytes(32)).digest('hex');
}

/**
 * Controller endpoint: GET /api/auth/csrf-token
 * Sets or refreshes the XSRF-TOKEN cookie and returns token in JSON
 */
export function getCsrfTokenHandler(req, res) {
  let token = req.cookies['XSRF-TOKEN'];
  if (!token) {
    token = generateCsrfToken();
    res.cookie('XSRF-TOKEN', token, CSRF_COOKIE_OPTIONS);
  }
  return res.status(200).json({
    success: true,
    csrfToken: token,
  });
}

/**
 * Helper function to verify CSRF token
 */
export function verifyCsrfToken(req) {
  const clientCsrfToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  const cookieCsrfToken = req.cookies && req.cookies['XSRF-TOKEN'];
  return Boolean(clientCsrfToken && cookieCsrfToken && clientCsrfToken === cookieCsrfToken);
}

/**
 * CSRF Protection Middleware
 * Verifies Origin header and matches X-CSRF-Token header against cookie
 */
export function csrfProtection(req, res, next) {
  // Safe HTTP methods do not alter state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    // If client doesn't have an XSRF cookie yet, attach one on GET requests
    if (!req.cookies['XSRF-TOKEN']) {
      const token = generateCsrfToken();
      res.cookie('XSRF-TOKEN', token, CSRF_COOKIE_OPTIONS);
    }
    return next();
  }

  // Allowed origins check
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.origin;
      const currentHost = `${req.protocol}://${req.get('host')}`;
      const allowedOrigins = [
        currentHost,
        ...(env.CLIENT_ORIGIN ? [env.CLIENT_ORIGIN] : []),
        ...(env.NODE_ENV !== 'production'
          ? ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5000', 'http://127.0.0.1:5000']
          : []),
      ];

      const isAllowed = allowedOrigins.some((allowed) => {
        try {
          return new URL(allowed).origin === originHost;
        } catch {
          return false;
        }
      });

      if (!isAllowed) {
        logger.warn(`CSRF: Blocked state-changing request from unauthorized origin: ${originHost}`);
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cross-Origin request blocked by CSRF security policy.',
          },
        });
      }
    } catch {
      // Malformed origin header
      return res.status(403).json({
        success: false,
        error: {
          message: 'Invalid origin header.',
        },
      });
    }
  }

  // Token validation for cookie-authenticated sessions:
  // CSRF attacks forge authenticated session cookies. If no session cookie is present,
  // there are no session credentials to forge.
  const hasCookieAuth = !!(req.cookies && req.cookies.token);

  if (!hasCookieAuth) {
    return next();
  }

  const clientCsrfToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  const cookieCsrfToken = req.cookies['XSRF-TOKEN'];

  if (!clientCsrfToken || !cookieCsrfToken || clientCsrfToken !== cookieCsrfToken) {
    logger.warn(`CSRF: Token mismatch or missing token for ${req.method} ${req.originalUrl}`);
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid or missing CSRF token. Request blocked.',
      },
    });
  }

  next();
}
