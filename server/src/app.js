import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { csrfProtection } from './middleware/csrfMiddleware.js';
import apiRoutes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Trust proxy for secure cookies and accurate client IP behind reverse proxies (Render, Nginx)
  app.set('trust proxy', 1);

  // Security headers (configure CSP to allow single-origin Vite bundle assets)
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  // CORS configuration (allow credentials for HTTP-only cookies; default to true for same-origin)
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN || true,
      credentials: true,
    })
  );

  // Cookie parsing
  app.use(cookieParser());

  // Request parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Custom request logging
  app.use(requestLogger);

  // CSRF Protection middleware
  app.use(csrfProtection);

  // Mount API router under /api
  app.use('/api', apiRoutes);

  // Catch-all for undefined /api routes (must always return JSON 404, never index.html)
  app.all('/api/*', (req, res) => {
    return res.status(404).json({
      success: false,
      error: {
        message: `API route ${req.method} ${req.originalUrl} not found`,
      },
    });
  });

  // Serve production client build if present (for single-origin production on Render / Docker)
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // 404 Route handling (fallback for non-static, non-api routes if client dist is not built)
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
