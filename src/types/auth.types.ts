import { Role, UserStatus } from '@prisma/client';

/**
 * Shape of the JWT access token payload stored inside the token.
 */
export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: Role;
}

/**
 * Shape of the JWT refresh token payload.
 */
export interface RefreshTokenPayload {
  userId: string;
}

/**
 * Properties attached to req.user after successful authentication.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
}
