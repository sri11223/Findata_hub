import { HttpStatus } from '../constants/http-status';

/**
 * Base application error. Throw this (or a subclass) in services and
 * repositories. The global error-handler middleware will catch it and
 * translate it to the correct HTTP response.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, HttpStatus.NOT_FOUND, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST, 'BAD_REQUEST');
  }
}
