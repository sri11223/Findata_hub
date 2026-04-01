import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { HttpStatus } from '../constants/http-status';
import { log } from '../utils/logger';

/**
 * Global error-handling middleware.
 * Must have 4 parameters to be recognised as an error handler by Express.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── Known operational errors ─────────────────────────────────────
  if (err instanceof AppError) {
    log.warn('Operational error', {
      code:    err.code,
      message: err.message,
      path:    req.path,
      method:  req.method,
    });

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error:   err.code,
    });
    return;
  }

  // ── Zod validation errors (should be caught by validate middleware,
  //    but guard here just in case) ─────────────────────────────────
  if (err instanceof ZodError) {
    res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: 'Validation failed',
      errors:  err.flatten().fieldErrors,
    });
    return;
  }

  // ── Prisma errors ─────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(err);
    res.status(prismaError.status).json({
      success: false,
      message: prismaError.message,
      error:   prismaError.code,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Invalid data provided to the database',
      error:   'PRISMA_VALIDATION_ERROR',
    });
    return;
  }

  // ── Unexpected errors ─────────────────────────────────────────────
  const message =
    err instanceof Error ? err.message : 'An unexpected error occurred';

  log.error('Unhandled error', {
    message,
    stack: err instanceof Error ? err.stack : undefined,
    path:  req.path,
    method: req.method,
  });

  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: 'Internal server error',
    error:   'INTERNAL_SERVER_ERROR',
  });
}

// ── Prisma error mapper ─────────────────────────────────────────────────────

function handlePrismaError(
  err: Prisma.PrismaClientKnownRequestError,
): { status: number; message: string; code: string } {
  switch (err.code) {
    case 'P2002': {
      const field = Array.isArray(err.meta?.target)
        ? (err.meta!.target as string[]).join(', ')
        : 'field';
      return {
        status:  HttpStatus.CONFLICT,
        message: `A record with this ${field} already exists`,
        code:    'DUPLICATE_ENTRY',
      };
    }
    case 'P2025':
      return {
        status:  HttpStatus.NOT_FOUND,
        message: 'The requested record was not found',
        code:    'NOT_FOUND',
      };
    case 'P2003':
      return {
        status:  HttpStatus.BAD_REQUEST,
        message: 'Related record not found — check referenced IDs',
        code:    'FOREIGN_KEY_ERROR',
      };
    case 'P2014':
      return {
        status:  HttpStatus.BAD_REQUEST,
        message: 'This operation would violate a required relation',
        code:    'RELATION_VIOLATION',
      };
    default:
      return {
        status:  HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'A database error occurred',
        code:    'DATABASE_ERROR',
      };
  }
}
