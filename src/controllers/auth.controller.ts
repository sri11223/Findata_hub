import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/api-response';
import { HttpStatus } from '../constants/http-status';

export class AuthController {
  /**
   * POST /auth/register
   * Creates a new user account with the VIEWER role.
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await authService.register(req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.CREATED,
        message:    'Account created successfully',
        data:       { user, tokens },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/login
   * Authenticates a user and issues access + refresh tokens.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await authService.login(req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'Login successful',
        data:       { user, tokens },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/refresh
   * Issues a new access token using the provided refresh token.
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tokens = await authService.refresh(req.body.refreshToken);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'Token refreshed successfully',
        data:       { tokens },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/logout
   * Invalidates the current refresh token.
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.logout(req.user!.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'Logged out successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /auth/me
   * Returns the authenticated user's profile.
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getMe(req.user!.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'Profile retrieved successfully',
        data:       { user },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
