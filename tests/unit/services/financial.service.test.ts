/**
 * Unit tests — FinancialService
 */
import '../../helpers/test-setup';

jest.mock('../../../src/config/database', () => ({
  prisma: {
    financialRecord: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
    category: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn((arr: Promise<unknown>[]) => Promise.all(arr)),
  },
}));

import { financialService } from '../../../src/services/financial.service';
import { financialRepository, categoryRepository } from '../../../src/repositories/financial.repository';
import { NotFoundError, ForbiddenError, ConflictError } from '../../../src/utils/errors';
import { Role, TransactionType } from '@prisma/client';

const makeRecord = (overrides = {}) => ({
  id:          'rec-1',
  userId:      'user-1',
  amount:      500,
  type:        TransactionType.INCOME,
  categoryId:  null,
  category:    null,
  date:        new Date(),
  description: 'Test',
  tags:        [],
  status:      'ACTIVE',
  createdAt:   new Date(),
  updatedAt:   new Date(),
  deletedAt:   null,
  user:        { id: 'user-1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
  ...overrides,
});

describe('FinancialService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getRecordById ──────────────────────────────────────────────────────────

  describe('getRecordById', () => {
    it('returns the record if found and requester is owner', async () => {
      jest.spyOn(financialRepository, 'findRecordById').mockResolvedValue(makeRecord() as never);

      const rec = await financialService.getRecordById('rec-1', 'user-1', Role.VIEWER);
      expect(rec.id).toBe('rec-1');
    });

    it('throws NotFoundError if record not found', async () => {
      jest.spyOn(financialRepository, 'findRecordById').mockResolvedValue(null);
      await expect(financialService.getRecordById('ghost', 'user-1', Role.VIEWER)).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError (masking) when viewer tries to access another user\'s record', async () => {
      jest.spyOn(financialRepository, 'findRecordById').mockResolvedValue(makeRecord({ userId: 'other-user' }) as never);
      await expect(financialService.getRecordById('rec-1', 'user-1', Role.VIEWER)).rejects.toThrow(NotFoundError);
    });

    it('returns any record for ADMIN regardless of owner', async () => {
      jest.spyOn(financialRepository, 'findRecordById').mockResolvedValue(makeRecord({ userId: 'other-user' }) as never);
      const rec = await financialService.getRecordById('rec-1', 'admin-id', Role.ADMIN);
      expect(rec.userId).toBe('other-user');
    });
  });

  // ── createRecord ───────────────────────────────────────────────────────────

  describe('createRecord', () => {
    it('creates a record when category is valid', async () => {
      const record = makeRecord();
      jest.spyOn(categoryRepository, 'findById').mockResolvedValue({ id: 'cat-1', name: 'Salary', type: 'INCOME', color: null, description: null, createdAt: new Date(), updatedAt: new Date() });
      jest.spyOn(financialRepository, 'createRecord').mockResolvedValue(record as never);

      const result = await financialService.createRecord(
        {
          amount: 500,
          type: TransactionType.INCOME,
          categoryId: 'cat-1',
          date: new Date().toISOString(),
        },
        'user-1',
      );
      expect(result.id).toBe('rec-1');
    });

    it('throws NotFoundError when categoryId is invalid', async () => {
      jest.spyOn(categoryRepository, 'findById').mockResolvedValue(null);

      await expect(
        financialService.createRecord(
          {
            amount: 100,
            type: TransactionType.EXPENSE,
            categoryId: 'bad-cat',
            date: new Date().toISOString(),
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ── deleteRecord ───────────────────────────────────────────────────────────

  describe('deleteRecord', () => {
    it('throws ForbiddenError for ANALYST role', async () => {
      jest.spyOn(financialRepository, 'findRecordById').mockResolvedValue(makeRecord() as never);

      await expect(
        financialService.deleteRecord('rec-1', 'user-1', Role.ANALYST),
      ).rejects.toThrow(ForbiddenError);
    });

    it('allows ADMIN to delete any record', async () => {
      jest.spyOn(financialRepository, 'findRecordById').mockResolvedValue(makeRecord() as never);
      jest.spyOn(financialRepository, 'softDeleteRecord').mockResolvedValue(makeRecord() as never);

      await expect(
        financialService.deleteRecord('rec-1', 'admin-id', Role.ADMIN),
      ).resolves.toBeDefined();
    });
  });

  // ── createCategory ─────────────────────────────────────────────────────────

  describe('createCategory', () => {
    it('throws ConflictError when name is taken', async () => {
      jest.spyOn(categoryRepository, 'findByName').mockResolvedValue({
        id: 'cat-1', name: 'Salary', type: 'INCOME', color: null, description: null, createdAt: new Date(), updatedAt: new Date(),
      });

      await expect(
        financialService.createCategory({ name: 'Salary', type: 'INCOME' }),
      ).rejects.toThrow(ConflictError);
    });
  });
});
