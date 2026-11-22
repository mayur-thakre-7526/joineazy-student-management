import { checkDatabaseConnection } from '../config/db.js';

/**
 * Controller to handle GET /api/health
 */
export async function getHealthStatus(req, res, next) {
  try {
    const dbStatus = await checkDatabaseConnection();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      service: 'joineazy-backend',
      version: '1.0.0',
      database: {
        connected: dbStatus.connected,
        message: dbStatus.message,
        ...(dbStatus.timestamp ? { dbTimestamp: dbStatus.timestamp } : {}),
      },
    });
  } catch (error) {
    next(error);
  }
}
