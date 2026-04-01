export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ApiSuccessResponse<T = undefined> {
  success: true;
  message: string;
  data?: T;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  details?: unknown;
}

export type ApiResponse<T = undefined> = ApiSuccessResponse<T> | ApiErrorResponse;
