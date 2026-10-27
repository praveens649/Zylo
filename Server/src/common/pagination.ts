/**
 * Shared pagination helpers — turn a query DTO into Prisma skip/take and a
 * standard list meta block.
 */

export function pageParams(query: { page?: number; limit?: number }) {
  const page = Math.max(query.page ?? 1, 1);
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

export function listMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
