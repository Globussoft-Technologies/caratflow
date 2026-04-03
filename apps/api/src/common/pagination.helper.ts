import type { PaginatedResult, Pagination } from '@caratflow/shared-types';

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function parsePagination(query: PaginationQuery): {
  skip: number;
  take: number;
  orderBy: Record<string, 'asc' | 'desc'> | undefined;
  page: number;
  limit: number;
} {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const skip = (page - 1) * limit;
  const orderBy = query.sortBy
    ? { [query.sortBy]: query.sortOrder ?? 'desc' }
    : undefined;

  return { skip, take: limit, orderBy, page, limit };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}
