import { PageQuery, PageResult } from '@tiangong/contracts';

/** 分页计算（Prisma skip/take）。 */
export function pageBounds(query: PageQuery): { skip: number; take: number } {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

/** 组装分页结果 envelope data。 */
export function pageResult<T>(items: T[], total: number, query: PageQuery): PageResult<T> {
  return { items, total, page: query.page, pageSize: query.pageSize };
}
