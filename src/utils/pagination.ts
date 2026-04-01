import { PaginationMeta, PaginatedResult } from '../types/common.types';

export const DEFAULT_PAGE  = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT      = 100;

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Normalises raw query params into safe, bounded pagination values.
 */
export function parsePagination(
  rawPage?: unknown,
  rawLimit?: unknown,
): PaginationParams {
  const page  = Math.max(1, parseInt(String(rawPage  ?? DEFAULT_PAGE),  10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(rawLimit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Builds the standardised pagination metadata block included in list responses.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Wraps a list of items + a total count into the paginated result shape.
 */
export function toPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    meta: buildPaginationMeta(total, page, limit),
  };
}
