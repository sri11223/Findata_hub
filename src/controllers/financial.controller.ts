import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { financialService } from '../services/financial.service';
import { sendSuccess } from '../utils/api-response';
import { HttpStatus } from '../constants/http-status';
import { buildPaginationMeta } from '../utils/pagination';

export class FinancialController {
  // ── Records ──────────────────────────────────────────────────────────────────

  /**
   * GET /financial/records
   * Lists records with filtering, sorting, and pagination.
   */
  async listRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = req.query as Record<string, string>;
      const result = await financialService.listRecords(
        {
          type:       q.type as never,
          categoryId: q.categoryId,
          startDate:  q.startDate,
          endDate:    q.endDate,
          search:     q.search,
          page:       q.page  ? Number(q.page)  : undefined,
          limit:      q.limit ? Number(q.limit) : undefined,
          sortBy:     q.sortBy  as never,
          sortOrder:  q.sortOrder as never,
          userId:     q.userId,
        },
        req.user!.id,
        req.user!.role as Role,
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'Records retrieved successfully',
        data:       { records: result.records },
        pagination: buildPaginationMeta(result.total, result.page, result.limit),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /financial/records
   * Creates a new financial record.
   */
  async createRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await financialService.createRecord(req.body, req.user!.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.CREATED,
        message:    'Financial record created successfully',
        data:       { record },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /financial/records/:id
   * Gets a single financial record.
   */
  async getRecordById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await financialService.getRecordById(
        req.params.id,
        req.user!.id,
        req.user!.role as Role,
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'Record retrieved successfully',
        data:       { record },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /financial/records/:id
   * Partially updates a financial record.
   */
  async updateRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await financialService.updateRecord(
        req.params.id,
        req.body,
        req.user!.id,
        req.user!.role as Role,
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'Record updated successfully',
        data:       { record },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /financial/records/:id
   * Soft-deletes a financial record.
   */
  async deleteRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await financialService.deleteRecord(req.params.id, req.user!.id, req.user!.role as Role);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message:    'Record deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Categories ───────────────────────────────────────────────────────────────

  /**
   * GET /financial/categories
   */
  async listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await financialService.listCategories();
      sendSuccess({ res, statusCode: HttpStatus.OK, message: 'Categories retrieved successfully', data: { categories } });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /financial/categories/:id
   */
  async getCategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await financialService.getCategoryById(req.params.id);
      sendSuccess({ res, statusCode: HttpStatus.OK, message: 'Category retrieved successfully', data: { category } });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /financial/categories  — Admin+
   */
  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await financialService.createCategory(req.body);
      sendSuccess({ res, statusCode: HttpStatus.CREATED, message: 'Category created successfully', data: { category } });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /financial/categories/:id  — Admin+
   */
  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await financialService.updateCategory(req.params.id, req.body);
      sendSuccess({ res, statusCode: HttpStatus.OK, message: 'Category updated successfully', data: { category } });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /financial/categories/:id  — Admin+
   */
  async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await financialService.deleteCategory(req.params.id);
      sendSuccess({ res, statusCode: HttpStatus.OK, message: 'Category deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const financialController = new FinancialController();
