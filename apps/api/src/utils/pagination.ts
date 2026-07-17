export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  workspaceId?: string;
  page?: string | number;
  limit?: string | number;
}

export const parsePagination = (query: PaginationQuery) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;

  return {
    page: page < 1 ? 1 : page,
    limit: limit < 1 ? 1 : limit > 100 ? 100 : limit,
  };
};

export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
