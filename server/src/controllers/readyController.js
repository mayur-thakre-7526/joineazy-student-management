import { checkDatabaseConnection } from '../config/db.js';

/**
 * Controller to handle GET /api/ready
 * Returns 200 if PostgreSQL is reachable, 503 if unavailable.
 * Never leaks credentials.
 */
export async function getReadinessStatus(req, res) {
  const dbStatus = await checkDatabaseConnection();

  if (!dbStatus.connected) {
    return res.status(503).json({
      ready: false,
      service: 'joineazy-backend',
      timestamp: new Date().toISOString(),
      database: {
        status: 'unavailable',
        message: dbStatus.message,
      },
      error: 'PostgreSQL database service is unavailable or not accepting connections',
    });
  }

  return res.status(200).json({
    ready: true,
    service: 'joineazy-backend',
    timestamp: new Date().toISOString(),
    database: {
      status: 'ready',
      message: 'PostgreSQL database connection verified',
      serverTimestamp: dbStatus.timestamp,
    },
  });
}
