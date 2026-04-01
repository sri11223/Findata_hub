import { TransactionType } from '@prisma/client';

export interface CreateRecordInput {
  amount: number;
  type: TransactionType;
  categoryId?: string;
  date: string; // ISO date string from request body
  description?: string;
  tags?: string[];
}

export interface UpdateRecordInput {
  amount?: number;
  type?: TransactionType;
  categoryId?: string | null;
  date?: string;
  description?: string;
  tags?: string[];
}

export interface RecordFilters {
  userId?: string;       // If set, only return records for this user
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;       // Search in description
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCategoryInput {
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'BOTH';
  color?: string;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  type?: 'INCOME' | 'EXPENSE' | 'BOTH';
  color?: string;
  description?: string;
}

// ── Dashboard / Analytics types ─────────────────────────────────────────────

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  recordCount: number;
  incomeCount: number;
  expenseCount: number;
}

export interface CategoryTotal {
  categoryId: string | null;
  categoryName: string | null;
  type: TransactionType;
  total: number;
  count: number;
}

export interface MonthlyTrend {
  year: number;
  month: number;
  monthLabel: string;
  income: number;
  expenses: number;
  net: number;
}

export interface WeeklyTrend {
  weekStart: string;
  income: number;
  expenses: number;
  net: number;
}

export interface DashboardAnalytics {
  summary: DashboardSummary;
  categoryTotals: CategoryTotal[];
  monthlyTrends: MonthlyTrend[];
  recentActivity: unknown[];
}
