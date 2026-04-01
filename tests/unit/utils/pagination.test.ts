/**
 * Unit tests — Pagination utilities
 */
import '../../helpers/test-setup';
import { parsePagination, buildPaginationMeta, toPaginatedResult } from '../../../src/utils/pagination';

describe('parsePagination', () => {
  it('returns defaults when no arguments given', () => {
    const result = parsePagination();
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
  });

  it('calculates correct skip value', () => {
    const { skip } = parsePagination(3, 10);
    expect(skip).toBe(20); // (3-1) * 10
  });

  it('clamps limit to MAX_LIMIT (100)', () => {
    const { limit } = parsePagination(1, 999);
    expect(limit).toBe(100);
  });

  it('clamps page to minimum 1', () => {
    const { page } = parsePagination(-5, 10);
    expect(page).toBe(1);
  });

  it('handles string inputs gracefully', () => {
    const { page, limit } = parsePagination('2', '15');
    expect(page).toBe(2);
    expect(limit).toBe(15);
  });

  it('falls back to defaults for non-numeric strings', () => {
    const { page, limit } = parsePagination('abc', 'xyz');
    expect(page).toBe(1);
    expect(limit).toBe(20);
  });
});

describe('buildPaginationMeta', () => {
  it('correctly computes totalPages', () => {
    const meta = buildPaginationMeta(100, 1, 20);
    expect(meta.totalPages).toBe(5);
  });

  it('sets hasNextPage and hasPrevPage correctly', () => {
    const first = buildPaginationMeta(50, 1, 10);
    expect(first.hasNextPage).toBe(true);
    expect(first.hasPrevPage).toBe(false);

    const last = buildPaginationMeta(50, 5, 10);
    expect(last.hasNextPage).toBe(false);
    expect(last.hasPrevPage).toBe(true);
  });

  it('handles zero total gracefully', () => {
    const meta = buildPaginationMeta(0, 1, 20);
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNextPage).toBe(false);
  });
});

describe('toPaginatedResult', () => {
  it('wraps items and builds correct meta', () => {
    const items = ['a', 'b', 'c'];
    const result = toPaginatedResult(items, 30, 2, 10);
    expect(result.items).toEqual(items);
    expect(result.meta.page).toBe(2);
    expect(result.meta.totalPages).toBe(3);
  });
});
