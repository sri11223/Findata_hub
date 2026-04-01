import { Role } from '@prisma/client';
import { financialRepository } from '../repositories/financial.repository';
import { hasPermission, Permission } from '../constants/permissions';
import { ForbiddenError } from '../utils/errors';

export interface DashboardQueryParams {
  startDate?: string;
  endDate?:   string;
  userId?:    string;
  months?:    number;
}

export class DashboardService {
  /**
   * Overall financial summary: totals, net balance, counts.
   * Viewers see only their own data; analysts and above can optionally scope by userId.
   */
  async getSummary(params: DashboardQueryParams, requesterId: string, requesterRole: Role) {
    const resolvedUserId = this.resolveUserId(params.userId, requesterId, requesterRole);
    const start = params.startDate ? new Date(params.startDate) : undefined;
    const end   = params.endDate   ? new Date(params.endDate)   : undefined;

    return financialRepository.getDashboardSummary(resolvedUserId, start, end);
  }

  /**
   * Category-wise expense/income breakdown.
   * Requires READ_ANALYTICS permission.
   */
  async getCategoryTotals(params: DashboardQueryParams, requesterId: string, requesterRole: Role) {
    this.assertAnalyticsAccess(requesterRole);
    const resolvedUserId = this.resolveUserId(params.userId, requesterId, requesterRole);
    const start = params.startDate ? new Date(params.startDate) : undefined;
    const end   = params.endDate   ? new Date(params.endDate)   : undefined;

    return financialRepository.getCategoryTotals(resolvedUserId, start, end);
  }

  /**
   * Monthly income vs expenses trend over the last N months.
   */
  async getMonthlyTrends(params: DashboardQueryParams, requesterId: string, requesterRole: Role) {
    this.assertAnalyticsAccess(requesterRole);
    const resolvedUserId = this.resolveUserId(params.userId, requesterId, requesterRole);
    const months = params.months ?? 6;

    return financialRepository.getMonthlyTrends(resolvedUserId, months);
  }

  /**
   * Most recent N transactions.
   */
  async getRecentActivity(
    limit: number,
    userId: string | undefined,
    requesterId: string,
    requesterRole: Role,
  ) {
    const resolvedUserId = this.resolveUserId(userId, requesterId, requesterRole);
    return financialRepository.getRecentActivity(limit, resolvedUserId);
  }

  /**
   * Composite analytics endpoint — bundles summary + categories + trends + recent.
   */
  async getFullAnalytics(params: DashboardQueryParams, requesterId: string, requesterRole: Role) {
    this.assertAnalyticsAccess(requesterRole);
    const resolvedUserId = this.resolveUserId(params.userId, requesterId, requesterRole);
    const start  = params.startDate ? new Date(params.startDate) : undefined;
    const end    = params.endDate   ? new Date(params.endDate)   : undefined;
    const months = params.months ?? 6;

    const [summary, categoryTotals, monthlyTrends, recentActivity] = await Promise.all([
      financialRepository.getDashboardSummary(resolvedUserId, start, end),
      financialRepository.getCategoryTotals(resolvedUserId, start, end),
      financialRepository.getMonthlyTrends(resolvedUserId, months),
      financialRepository.getRecentActivity(10, resolvedUserId),
    ]);

    return { summary, categoryTotals, monthlyTrends, recentActivity };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private resolveUserId(
    requestedUserId: string | undefined,
    requesterId: string,
    requesterRole: Role,
  ): string | undefined {
    if (!hasPermission(requesterRole, Permission.READ_ALL_RECORDS)) {
      // Viewers always see only their own data
      return requesterId;
    }
    // Admins/Analysts can opt to scope by a specific userId, or see all
    return requestedUserId;
  }

  private assertAnalyticsAccess(role: Role): void {
    if (!hasPermission(role, Permission.READ_ANALYTICS)) {
      throw new ForbiddenError('Analytics access requires at least the ANALYST role');
    }
  }
}

export const dashboardService = new DashboardService();
