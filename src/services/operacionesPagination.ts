export const OPERACIONES_PAGE_SIZE = 4;

export type PaginatedSlice<T> = {
  items: T[];
  page: number;
  totalPages: number;
  totalItems: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export function paginateList<T>(
  items: T[],
  page: number,
  pageSize = OPERACIONES_PAGE_SIZE,
): PaginatedSlice<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    totalItems,
    hasPrevious: safePage > 1,
    hasNext: safePage < totalPages,
  };
}
