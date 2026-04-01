import { Router } from 'express';
import { dashboardController } from '../../controllers/dashboard.controller';
import { authenticate } from '../../middleware/authenticate.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { validate } from '../../middleware/validate.middleware';
import { Permission } from '../../constants/permissions';
import { dashboardQuerySchema } from '../../validators/financial.validator';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get financial summary (all roles — viewers see own data)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *         description: Filter by user ID (Admin+ only; ignored for VIEWER)
 *     responses:
 *       200:
 *         description: Financial summary with income, expenses, net balance
 */
router.get(
  '/summary',
  authorize(Permission.READ_DASHBOARD),
  validate(dashboardQuerySchema),
  dashboardController.getSummary.bind(dashboardController),
);

/**
 * @openapi
 * /dashboard/analytics:
 *   get:
 *     tags: [Dashboard]
 *     summary: Full analytics bundle — requires ANALYST role
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/analytics',
  authorize(Permission.READ_ANALYTICS),
  validate(dashboardQuerySchema),
  dashboardController.getAnalytics.bind(dashboardController),
);

/**
 * @openapi
 * /dashboard/trends:
 *   get:
 *     tags: [Dashboard]
 *     summary: Monthly income vs expense trends — requires ANALYST role
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, minimum: 1, maximum: 24, default: 6 }
 */
router.get(
  '/trends',
  authorize(Permission.READ_ANALYTICS),
  validate(dashboardQuerySchema),
  dashboardController.getMonthlyTrends.bind(dashboardController),
);

/**
 * @openapi
 * /dashboard/categories:
 *   get:
 *     tags: [Dashboard]
 *     summary: Category-wise totals — requires ANALYST role
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/categories',
  authorize(Permission.READ_ANALYTICS),
  validate(dashboardQuerySchema),
  dashboardController.getCategoryTotals.bind(dashboardController),
);

/**
 * @openapi
 * /dashboard/recent:
 *   get:
 *     tags: [Dashboard]
 *     summary: Recent transaction activity (all roles — viewers see own)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 */
router.get(
  '/recent',
  authorize(Permission.READ_DASHBOARD),
  dashboardController.getRecentActivity.bind(dashboardController),
);

export default router;
