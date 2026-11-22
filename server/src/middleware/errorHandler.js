import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Centralized error-handling middleware
 */
export function errorHandler(err, req, res, next) {
  logger.error(`Unhandled Error: ${err.message}`, {
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  });
}

/**
 * 404 Not Found middleware
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}
