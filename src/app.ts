import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import router from './routes';
import { globalRateLimiter } from './middleware/rate-limiter.middleware';
import { requestLogger } from './middleware/request-logger.middleware';
import { errorHandler } from './middleware/error-handler.middleware';
import { HttpStatus } from './constants/http-status';

export function createApp(): Application {
  const app = express();

  // ── Security headers ─────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin:      env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
      methods:     ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ── Body parsing & compression ────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(compression());

  // ── Request logging ───────────────────────────────────────────────────────────
  app.use(requestLogger);

  // ── Global rate limiting ──────────────────────────────────────────────────────
  app.use('/api', globalRateLimiter);

  // ── Health check (no auth, no rate limit) ────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'FinData Hub API is running',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // ── API documentation ─────────────────────────────────────────────────────────
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'FinData Hub — API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
    }),
  );

  // Expose raw OpenAPI JSON for tooling
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // ── API routes ───────────────────────────────────────────────────────────────
  app.use('/api', router);

  // ── 404 handler ──────────────────────────────────────────────────────────────
  app.use((req: Request, res: Response) => {
    res.status(HttpStatus.NOT_FOUND).json({
      success: false,
      message: `Route ${req.method} ${req.path} not found`,
      error:   'NOT_FOUND',
    });
  });

  // ── Global error handler (must be last) ──────────────────────────────────────
  app.use(errorHandler);

  return app;
}
