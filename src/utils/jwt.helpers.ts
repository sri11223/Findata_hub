import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { env } from '../config/env';
import { AccessTokenPayload, RefreshTokenPayload } from '../types/auth.types';
import { UnauthorizedError } from './errors';

// ── Sign ─────────────────────────────────────────────────────────────────────

export function signAccessToken(payload: AccessTokenPayload): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as any);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as any);
}

// ── Verify ───────────────────────────────────────────────────────────────────

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired');
    }
    if (err instanceof JsonWebTokenError) {
      throw new UnauthorizedError('Invalid access token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new UnauthorizedError('Refresh token has expired — please log in again');
    }
    if (err instanceof JsonWebTokenError) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    throw new UnauthorizedError('Refresh token verification failed');
  }
}

// ── Extract bearer token from Authorization header ───────────────────────────

export function extractBearerToken(authHeader: string | undefined): string {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authorization header missing or malformed');
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new UnauthorizedError('Bearer token is empty');
  }
  return token;
}
