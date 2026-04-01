import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { HttpStatus } from '../constants/http-status';

/**
 * General API rate limiter — applied globally.
 * Default: 100 requests per 15 minutes per IP.
 */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,   // Return standard RateLimit-* headers
  legacyHeaders: false,    // Disable deprecated X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many requests — please try again later.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
  statusCode: HttpStatus.TOO_MANY_REQUESTS,
  skip: () => env.NODE_ENV === 'test',
});

/**
 * Strict rate limiter for auth endpoints (login / register).
 * 10 requests per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'development' ? 50 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts — please try again in 15 minutes.',
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  statusCode: HttpStatus.TOO_MANY_REQUESTS,
  skip: () => env.NODE_ENV === 'test',
});
