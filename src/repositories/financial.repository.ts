import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../config/database';
import {
  CreateRecordInput,
  UpdateRecordInput,
  RecordFilters,
  CreateCategoryInput,
  UpdateCategoryInput,
  DashboardSummary,
  CategoryTotal,
  MonthlyTrend,
} from '../types/financial.types';
import { parsePagination } from '../utils/pagination';
import { startOfMonth, endOfMonth, monthLabel, lastNMonths } from '../utils/date-helpers';

// ── Financial Records ─────────────────────────────────────────────────────────

export class FinancialRepository {
  // ── Record Finders ───────────────────────────────────────────────────────────

  async findRecordById(id: string) {
    return prisma.financialRecord.findFirst({
      where: { id, status: 'ACTIVE' },
      include: { category: true, user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async findManyRecords(filters: RecordFilters, viewerUserId?: string) {
    const { page, limit, skip } = parsePagination(filters.page, filters.limit);

    // If viewerUserId is set, scope to that user's records only
    const userFilter = viewerUserId ? { userId: viewerUserId } : {};

    const where: Prisma.FinancialRecordWhereInput = {
      status: 'ACTIVE',
      ...userFilter,
      ...(filters.userId     && { userId: filters.userId }),
      ...(filters.type       && { type: filters.type }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...((filters.startDate || filters.endDate) && {
        date: {
          ...(filters.startDate && { gte: new Date(filters.startDate) }),
          ...(filters.endDate   && { lte: new Date(filters.endDate) }),
        },
      }),
      ...(filters.search && {
        description: { contains: filters.search, mode: 'insensitive' as Prisma.QueryMode },
      }),
    };

    const orderBy: Prisma.FinancialRecordOrderByWithRelationInput = {
      [filters.sortBy ?? 'date']: filters.sortOrder ?? 'desc',
    };

    const [records, total] = await prisma.$transaction([
      prisma.financialRecord.findMany({
        where,
        include: { category: true },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.financialRecord.count({ where }),
    ]);

    return { records, total, page, limit };
  }

  async createRecord(userId: string, data: CreateRecordInput) {
    return prisma.financialRecord.create({
      data: {
        userId,
        amount:      data.amount,
        type:        data.type,
        categoryId:  data.categoryId,
        date:        new Date(data.date),
        description: data.description,
        tags:        data.tags ?? [],
      },
      include: { category: true },
    });
  }

  async updateRecord(id: string, data: UpdateRecordInput) {
    return prisma.financialRecord.update({
      where: { id },
      data: {
        ...(data.amount      !== undefined && { amount:      data.amount }),
        ...(data.type        !== undefined && { type:        data.type }),
        ...(data.categoryId  !== undefined && { categoryId:  data.categoryId }),
        ...(data.date        !== undefined && { date:        new Date(data.date) }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.tags        !== undefined && { tags:        data.tags }),
      },
      include: { category: true },
    });
  }

  /**
   * Soft-delete: marks status=DELETED and sets deletedAt.
   */
  async softDeleteRecord(id: string) {
    return prisma.financialRecord.update({
      where: { id },
      data:  { status: 'DELETED', deletedAt: new Date() },
    });
  }

  // ── Dashboard Aggregations ────────────────────────────────────────────────

  async getDashboardSummary(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<DashboardSummary> {
    const where: Prisma.FinancialRecordWhereInput = {
      status: 'ACTIVE',
      ...(userId && { userId }),
      ...((startDate || endDate) && {
        date: {
          ...(startDate && { gte: startDate }),
          ...(endDate   && { lte: endDate }),
        },
      }),
    };

    const [incomeAgg, expenseAgg, incomeCount, expenseCount] =
      await prisma.$transaction([
        prisma.financialRecord.aggregate({
          where: { ...where, type: TransactionType.INCOME },
          _sum:   { amount: true },
          _count: { id: true },
        }),
        prisma.financialRecord.aggregate({
          where: { ...where, type: TransactionType.EXPENSE },
          _sum:   { amount: true },
          _count: { id: true },
        }),
        prisma.financialRecord.count({ where: { ...where, type: TransactionType.INCOME } }),
        prisma.financialRecord.count({ where: { ...where, type: TransactionType.EXPENSE } }),
      ]);

    const totalIncome   = Number(incomeAgg._sum.amount  ?? 0);
    const totalExpenses = Number(expenseAgg._sum.amount ?? 0);

    return {
      totalIncome,
      totalExpenses,
      netBalance:    totalIncome - totalExpenses,
      recordCount:   incomeCount + expenseCount,
      incomeCount,
      expenseCount,
    };
  }

  async getCategoryTotals(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CategoryTotal[]> {
    const where: Prisma.FinancialRecordWhereInput = {
      status: 'ACTIVE',
      ...(userId && { userId }),
      ...((startDate || endDate) && {
        date: {
          ...(startDate && { gte: startDate }),
          ...(endDate   && { lte: endDate }),
        },
      }),
    };

    const grouped = await prisma.financialRecord.groupBy({
      by:       ['categoryId', 'type'],
      where,
      _sum:     { amount: true },
      _count:   { id: true },
      orderBy:  { _sum: { amount: 'desc' } },
    });

    // Fetch category names in one shot
    const categoryIds = [...new Set(grouped.map((g) => g.categoryId).filter(Boolean))] as string[];
    const categories  = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    return grouped.map((g) => ({
      categoryId:   g.categoryId,
      categoryName: g.categoryId ? (catMap.get(g.categoryId) ?? 'Unknown') : 'Uncategorised',
      type:         g.type,
      total:        Number(g._sum.amount ?? 0),
      count:        g._count.id,
    }));
  }

  async getMonthlyTrends(
    userId?: string,
    months = 6,
  ): Promise<MonthlyTrend[]> {
    const periods = lastNMonths(months);

    const trends: MonthlyTrend[] = await Promise.all(
      periods.map(async ({ year, month }) => {
        const start = startOfMonth(year, month);
        const end   = endOfMonth(year, month);

        const [income, expenses] = await prisma.$transaction([
          prisma.financialRecord.aggregate({
            where: {
              status: 'ACTIVE',
              type: TransactionType.INCOME,
              date:  { gte: start, lte: end },
              ...(userId && { userId }),
            },
            _sum: { amount: true },
          }),
          prisma.financialRecord.aggregate({
            where: {
              status: 'ACTIVE',
              type: TransactionType.EXPENSE,
              date:  { gte: start, lte: end },
              ...(userId && { userId }),
            },
            _sum: { amount: true },
          }),
        ]);

        const totalIncome   = Number(income._sum.amount   ?? 0);
        const totalExpenses = Number(expenses._sum.amount ?? 0);

        return {
          year,
          month,
          monthLabel: monthLabel(year, month),
          income:     totalIncome,
          expenses:   totalExpenses,
          net:        totalIncome - totalExpenses,
        };
      }),
    );

    return trends;
  }

  async getRecentActivity(limit = 10, userId?: string) {
    return prisma.financialRecord.findMany({
      where: {
        status: 'ACTIVE',
        ...(userId && { userId }),
      },
      include: { category: true, user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

// ── Category Repository ───────────────────────────────────────────────────────

export class CategoryRepository {
  async findAll() {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    return prisma.category.findUnique({ where: { id } });
  }

  async findByName(name: string) {
    return prisma.category.findUnique({ where: { name } });
  }

  async create(data: CreateCategoryInput) {
    return prisma.category.create({ data });
  }

  async update(id: string, data: UpdateCategoryInput) {
    return prisma.category.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.category.delete({ where: { id } });
  }
}

export const financialRepository = new FinancialRepository();
export const categoryRepository  = new CategoryRepository();
