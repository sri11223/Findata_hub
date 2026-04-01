import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/api-response';
import { HttpStatus } from '../constants/http-status';

export class DashboardController {
  /**
   * GET /dashboard/summary
   * Returns totals: income, expenses, net balance, record counts.
   * Available to all authenticated users (viewers see own data).
   */
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = req.query as Record<string, string>;
      const summary = await dashboardService.getSummary(
        { startDate: q.startDate, endDate: q.endDate, userId: q.userId },
        req.user!.id,
        req.user!.role as Role,
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'Dashboard summary retrieved successfully',
        data:       { summary },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /dashboard/analytics
   * Returns summary + category breakdown + monthly trends + recent activity.
   * Requires ANALYST role or above.
   */
  async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = req.query as Record<string, string>;
      const analytics = await dashboardService.getFullAnalytics(
        {
          startDate: q.startDate,
          endDate:   q.endDate,
          userId:    q.userId,
          months:    q.months ? Number(q.months) : undefined,
        },
        req.user!.id,
        req.user!.role as Role,
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'Analytics retrieved successfully',
        data:       { analytics },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /dashboard/trends
   * Returns monthly income vs. expense trends.
   * Requires ANALYST role or above.
   */
  async getMonthlyTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = req.query as Record<string, string>;
      const trends = await dashboardService.getMonthlyTrends(
        {
          userId: q.userId,
          months: q.months ? Number(q.months) : undefined,
        },
        req.user!.id,
        req.user!.role as Role,
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'Monthly trends retrieved successfully',
        data:       { trends },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /dashboard/categories
   * Returns category-wise totals.
   * Requires ANALYST role or above.
   */
  async getCategoryTotals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = req.query as Record<string, string>;
      const categoryTotals = await dashboardService.getCategoryTotals(
        { startDate: q.startDate, endDate: q.endDate, userId: q.userId },
        req.user!.id,
        req.user!.role as Role,
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'Category totals retrieved successfully',
        data:       { categoryTotals },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /dashboard/recent
   * Returns the most recent transactions.
   */
  async getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q      = req.query as Record<string, string>;
      const limit  = q.limit ? Math.min(Number(q.limit), 50) : 10;
      const recent = await dashboardService.getRecentActivity(
        limit,
        q.userId,
        req.user!.id,
        req.user!.role as Role,
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'Recent activity retrieved successfully',
        data:       { activity: recent },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();
