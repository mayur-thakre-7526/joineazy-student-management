import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );

  // Request parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Custom request logging
  app.use(requestLogger);

  // Mount API router
  app.use('/api', apiRoutes);

  // 404 Route handling
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
