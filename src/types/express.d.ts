import { Role, UserStatus } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /**
       * Populated by the authenticate middleware after JWT verification.
       * Guaranteed to be defined on any route protected by authenticate().
       */
      user?: {
        id: string;
        email: string;
        role: Role;
        status: UserStatus;
      };
    }
  }
}

export {};
