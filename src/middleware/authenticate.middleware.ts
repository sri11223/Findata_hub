import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { extractBearerToken, verifyAccessToken } from '../utils/jwt.helpers';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserStatus } from '@prisma/client';

/**
 * authenticate — verifies the Bearer JWT, loads the user from the database,
 * and injects req.user.  Rejects with 401 for missing/invalid tokens and 403
 * for suspended/inactive accounts.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: {
        id: payload.userId,
        deletedAt: null,
      },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenError('Your account has been suspended');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenError('Your account is inactive');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
