import { z } from 'zod';
import { TransactionType } from '@prisma/client';

// ── Financial Records ─────────────────────────────────────────────────────────

export const createRecordSchema = z.object({
  body: z.object({
    amount: z
      .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
      .positive('Amount must be greater than zero')
      .max(999_999_999.99, 'Amount exceeds maximum allowed value'),
    type: z.nativeEnum(TransactionType, { required_error: 'Transaction type is required' }),
    categoryId: z.string().uuid('Invalid category ID').optional(),
    date: z
      .string({ required_error: 'Date is required' })
      .datetime({ message: 'Date must be a valid ISO 8601 datetime string' }),
    description: z.string().trim().max(500, 'Description must be at most 500 characters').optional(),
    tags: z
      .array(z.string().trim().max(50))
      .max(10, 'At most 10 tags allowed')
      .optional()
      .default([]),
  }),
});

export const updateRecordSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid record ID'),
  }),
  body: z
    .object({
      amount:      z.number().positive().max(999_999_999.99).optional(),
      type:        z.nativeEnum(TransactionType).optional(),
      categoryId:  z.string().uuid('Invalid category ID').nullable().optional(),
      date:        z.string().datetime().optional(),
      description: z.string().trim().max(500).optional(),
      tags:        z.array(z.string().trim().max(50)).max(10).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' }),
});

export const recordIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid record ID'),
  }),
});

export const listRecordsSchema = z.object({
  query: z.object({
    type:       z.nativeEnum(TransactionType).optional(),
    categoryId: z.string().uuid().optional(),
    startDate:  z.string().datetime().optional(),
    endDate:    z.string().datetime().optional(),
    search:     z.string().trim().optional(),
    page:       z.coerce.number().int().positive().optional(),
    limit:      z.coerce.number().int().positive().max(100).optional(),
    sortBy:     z.enum(['date', 'amount', 'createdAt']).optional().default('date'),
    sortOrder:  z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

// ── Categories ───────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  body: z.object({
    name:        z.string().trim().min(1).max(100, 'Category name must be at most 100 characters'),
    type:        z.enum(['INCOME', 'EXPENSE', 'BOTH'], { required_error: 'Category type is required' }),
    color:       z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code (#rrggbb)').optional(),
    description: z.string().trim().max(255).optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid category ID'),
  }),
  body: z
    .object({
      name:        z.string().trim().min(1).max(100).optional(),
      type:        z.enum(['INCOME', 'EXPENSE', 'BOTH']).optional(),
      color:       z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      description: z.string().trim().max(255).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' }),
});

export const categoryIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid category ID'),
  }),
});

// ── Dashboard Query ───────────────────────────────────────────────────────────

export const dashboardQuerySchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate:   z.string().datetime().optional(),
    userId:    z.string().uuid().optional(),
    months:    z.coerce.number().int().min(1).max(24).optional().default(6),
  }),
});
