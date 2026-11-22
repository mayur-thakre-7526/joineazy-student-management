import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { checkDatabaseConnection, pool } from './config/db.js';

const app = createApp();

const server = app.listen(env.PORT, '0.0.0.0', async () => {
  logger.info(`Joineazy Backend API listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
  logger.info(`Allowed Client Origin: ${env.CLIENT_ORIGIN}`);

  // Test database connection asynchronously on startup
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.connected) {
    logger.info(`Database status: ${dbStatus.message}`);
  } else {
    logger.warn(`Database status: ${dbStatus.message}`);
  }
});

// Graceful shutdown handling
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await pool.end();
      logger.info('Database pool closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during pool closure:', err.message);
      process.exit(1);
    }
  });

  // Force close after 5 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
