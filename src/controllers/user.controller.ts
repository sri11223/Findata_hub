import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { userService } from '../services/user.service';
import { sendSuccess } from '../utils/api-response';
import { HttpStatus } from '../constants/http-status';
import { buildPaginationMeta } from '../utils/pagination';

export class UserController {
  /**
   * GET /users
   * Lists all users with optional filters and pagination. Admin+.
   */
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, status, search, page, limit } = req.query as Record<string, string>;
      const result = await userService.listUsers({
        role:   role   as Role | undefined,
        status: status as never,
        search,
        page:   page  ? Number(page)  : undefined,
        limit:  limit ? Number(limit) : undefined,
      });

      sendSuccess({
        res,
        statusCode:  HttpStatus.OK,
        message:     'Users retrieved successfully',
        data:        { users: result.users },
        pagination:  buildPaginationMeta(result.total, result.page, result.limit),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /users
   * Creates a new user. Admin+.
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.createUser(req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.CREATED,
        message:    'User created successfully',
        data:       { user },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /users/:id
   * Gets a user by ID. Admin+ or self.
   */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'User retrieved successfully',
        data:       { user },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /users/:id
   * Updates a user's profile fields. Admin+ or self.
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateUser(
        req.params.id,
        req.body,
        req.user!.id,
        req.user!.role as Role,
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'User updated successfully',
        data:       { user },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /users/:id/status
   * Updates a user's active/inactive/suspended status. Admin+.
   */
  async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateUserStatus(
        req.params.id,
        req.body,
        req.user!.id,
        req.user!.role as Role,
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'User status updated successfully',
        data:       { user },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /users/:id/role
   * Changes a user's role. Super Admin only.
   */
  async changeUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.changeUserRole(
        req.params.id,
        req.body,
        req.user!.id,
        req.user!.role as Role,
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'User role updated successfully',
        data:       { user },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /users/:id
   * Soft-deletes a user. Super Admin only.
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.deleteUser(req.params.id, req.user!.id, req.user!.role as Role);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'User deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
