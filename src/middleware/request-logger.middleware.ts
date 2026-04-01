import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { log } from '../utils/logger';
import { env } from '../config/env';

// Use Morgan for HTTP request logging in dev, our logger in all envs
const morganMiddleware = morgan(
  env.NODE_ENV === 'production' ? 'combined' : 'dev',
  {
    skip: (_req, _res) => env.NODE_ENV === 'test',
    stream: {
      write: (message: string) => log.info(message.trim()),
    },
  },
);

/**
 * Logs each incoming request and attaches timing info to the response.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  morganMiddleware(req, res, next);
}
