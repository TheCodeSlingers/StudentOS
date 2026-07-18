import { PAGINATION } from "../config/constants";

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
  const page = Number(query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Number(query.limit) || PAGINATION.DEFAULT_LIMIT;

  return {
    page: page < 1 ? PAGINATION.DEFAULT_PAGE : page,
    limit:
      limit < 1
        ? 1
        : limit > PAGINATION.MAX_LIMIT
          ? PAGINATION.MAX_LIMIT
          : limit,
  };
};

export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number,
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
