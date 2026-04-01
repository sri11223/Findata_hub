// ── Constants (Vite-compatible, no TS enums) ──────────────────────────────────

export const Role = {
  VIEWER: 'VIEWER',
  ANALYST: 'ANALYST',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const TransactionType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const RecordStatus = {
  ACTIVE: 'ACTIVE',
  DELETED: 'DELETED',
} as const;
export type RecordStatus = (typeof RecordStatus)[keyof typeof RecordStatus];

// ── Models ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'BOTH';
  color: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialRecord {
  id: string;
  userId: string;
  amount: number | string;
  type: TransactionType;
  categoryId: string | null;
  category?: Category | null;
  date: string;
  description: string | null;
  tags: string[];
  status: RecordStatus;
  user?: { firstName: string; lastName: string; email: string };
  createdAt: string;
  updatedAt: string;
}

// ── Dashboard Types ────────────────────────────────────────────────────────────

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

export interface DashboardAnalytics {
  summary: DashboardSummary;
  categoryTotals: CategoryTotal[];
  monthlyTrends: MonthlyTrend[];
  recentActivity: FinancialRecord[];
}

// ── API Response Types ─────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    pagination?: PaginationMeta;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ── Input Types ────────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface CreateRecordInput {
  amount: number;
  type: TransactionType;
  categoryId?: string;
  date: string;
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
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
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

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface UserFilters {
  role?: Role;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}
