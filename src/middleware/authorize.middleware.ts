import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { Permission, hasPermission, hasMinimumRole } from '../constants/permissions';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/**
 * authorize(...permissions) — middleware factory.
 * Requires that the authenticated user has ALL of the listed permissions.
 *
 * Usage:
 *   router.get('/records', authenticate, authorize(Permission.READ_ALL_RECORDS), handler)
 */
export function authorize(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const { role } = req.user;
    const missing = permissions.filter((p) => !hasPermission(role as Role, p));

    if (missing.length > 0) {
      return next(
        new ForbiddenError(
          `Your role (${role}) does not have the required permission(s): ${missing.join(', ')}`,
        ),
      );
    }

    next();
  };
}

/**
 * requireRole(role) — middleware factory.
 * Ensures the authenticated user's role is at or above the minimum required role.
 *
 * Usage:
 *   router.delete('/users/:id', authenticate, requireRole(Role.ADMIN), handler)
 */
export function requireRole(minimumRole: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!hasMinimumRole(req.user.role as Role, minimumRole)) {
      return next(
        new ForbiddenError(
          `This action requires at least the ${minimumRole} role`,
        ),
      );
    }

    next();
  };
}
