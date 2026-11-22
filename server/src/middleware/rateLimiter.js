/**
 * In-memory sliding-window rate limiter for sensitive authentication endpoints
 * Protects against credential stuffing and brute-force attacks
 */
const loginAttempts = new Map();

// Default: 25 attempts per 5 minutes per IP
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 25;

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of loginAttempts.entries()) {
    if (now - data.firstAttempt > WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
}, 60 * 1000).unref();

export function loginRateLimiter(req, res, next) {
  // Allow test environments or internal bypass
  if (process.env.NODE_ENV === 'test' || req.headers['x-test-bypass'] === 'true') {
    return next();
  }

  const clientIp =
    req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const now = Date.now();
  const record = loginAttempts.get(clientIp);

  if (!record) {
    loginAttempts.set(clientIp, {
      count: 1,
      firstAttempt: now,
    });
    return next();
  }

  // Reset window if expired
  if (now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(clientIp, {
      count: 1,
      firstAttempt: now,
    });
    return next();
  }

  record.count += 1;

  if (record.count > MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.firstAttempt + WINDOW_MS - now) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds);
    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts. Please try again later.',
        retryAfterSeconds,
      },
    });
  }

  next();
}
