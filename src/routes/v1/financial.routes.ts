import { Router } from 'express';
import { financialController } from '../../controllers/financial.controller';
import { authenticate } from '../../middleware/authenticate.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { validate } from '../../middleware/validate.middleware';
import { Permission } from '../../constants/permissions';
import {
  createRecordSchema,
  updateRecordSchema,
  recordIdParamSchema,
  listRecordsSchema,
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from '../../validators/financial.validator';

const router = Router();

router.use(authenticate);

// ── Financial Records ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /financial/records:
 *   get:
 *     tags: [Financial Records]
 *     summary: List financial records with filtering and pagination
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { $ref: '#/components/schemas/TransactionType' }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [date, amount, createdAt], default: date }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated list of financial records
 */
router.get(
  '/records',
  authorize(Permission.READ_OWN_RECORDS),
  validate(listRecordsSchema),
  financialController.listRecords.bind(financialController),
);

/**
 * @openapi
 * /financial/records:
 *   post:
 *     tags: [Financial Records]
 *     summary: Create a new financial record (Analyst+)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, date]
 *             properties:
 *               amount:      { type: number, minimum: 0.01 }
 *               type:        { $ref: '#/components/schemas/TransactionType' }
 *               categoryId:  { type: string, format: uuid }
 *               date:        { type: string, format: date-time }
 *               description: { type: string }
 *               tags:        { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Record created
 *       422:
 *         description: Validation error
 */
router.post(
  '/records',
  authorize(Permission.CREATE_RECORD),
  validate(createRecordSchema),
  financialController.createRecord.bind(financialController),
);

/**
 * @openapi
 * /financial/records/{id}:
 *   get:
 *     tags: [Financial Records]
 *     summary: Get a financial record by ID
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/records/:id',
  authorize(Permission.READ_OWN_RECORDS),
  validate(recordIdParamSchema),
  financialController.getRecordById.bind(financialController),
);

/**
 * @openapi
 * /financial/records/{id}:
 *   patch:
 *     tags: [Financial Records]
 *     summary: Update a financial record (Analyst+ for own; Admin for any)
 *     security:
 *       - BearerAuth: []
 */
router.patch(
  '/records/:id',
  authorize(Permission.UPDATE_OWN_RECORD),
  validate(updateRecordSchema),
  financialController.updateRecord.bind(financialController),
);

/**
 * @openapi
 * /financial/records/{id}:
 *   delete:
 *     tags: [Financial Records]
 *     summary: Soft-delete a financial record (Admin+)
 *     security:
 *       - BearerAuth: []
 */
router.delete(
  '/records/:id',
  authorize(Permission.DELETE_RECORD),
  validate(recordIdParamSchema),
  financialController.deleteRecord.bind(financialController),
);

// ── Categories ───────────────────────────────────────────────────────────────

/**
 * @openapi
 * /financial/categories:
 *   get:
 *     tags: [Categories]
 *     summary: List all categories
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get(
  '/categories',
  authorize(Permission.READ_CATEGORIES),
  financialController.listCategories.bind(financialController),
);

router.get(
  '/categories/:id',
  authorize(Permission.READ_CATEGORIES),
  validate(categoryIdParamSchema),
  financialController.getCategoryById.bind(financialController),
);

/**
 * @openapi
 * /financial/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a category (Admin+)
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/categories',
  authorize(Permission.MANAGE_CATEGORIES),
  validate(createCategorySchema),
  financialController.createCategory.bind(financialController),
);

router.patch(
  '/categories/:id',
  authorize(Permission.MANAGE_CATEGORIES),
  validate(updateCategorySchema),
  financialController.updateCategory.bind(financialController),
);

router.delete(
  '/categories/:id',
  authorize(Permission.MANAGE_CATEGORIES),
  validate(categoryIdParamSchema),
  financialController.deleteCategory.bind(financialController),
);

export default router;
