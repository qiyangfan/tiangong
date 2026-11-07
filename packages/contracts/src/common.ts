import { z } from 'zod';

/** 成功业务码（响应 envelope 中 code=0 表示成功）。 */
export const SUCCESS_CODE = 0;

/** 客户端类型：web 管理端 / miniapp 微信小程序。 */
export const clientSchema = z.enum(['web', 'miniapp']);
export type Client = z.infer<typeof clientSchema>;

/** ISO 8601 UTC 时间串（如 2026-11-07T08:00:00.000Z）。 */
export const isoDateTimeSchema = z.string().datetime({ message: 'must be ISO 8601 UTC datetime' });
export type IsoDateTime = z.infer<typeof isoDateTimeSchema>;

/** 分页查询：page>=1，pageSize 1..100，默认 20（API_CONTRACT 契约）。 */
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;

/** 分页结果统一结构。 */
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 成功响应 envelope：{ code: 0, data }。 */
export interface ApiSuccess<T> {
  code: typeof SUCCESS_CODE;
  data: T;
}

/** 错误响应 envelope：{ code: ERROR_CODE, message, data: null, requestId }。 */
export interface ApiError {
  code: string;
  message: string;
  data: null;
  requestId: string;
}

/** 通用 id 参数。 */
export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

/** 通用批量 id 参数（body）。 */
export const idListSchema = z.object({ ids: z.array(z.coerce.number().int().positive()).min(1) });

/** 通用关键词搜索（用于列表页搜索框，服务端按字段 like 匹配）。 */
export const keywordSchema = z.string().trim().max(100).optional();

/**
 * 启用状态过滤。
 * query string 语义解析：'true'/'false' 字符串正确映射，其余值视为未提供；
 * 不能用 z.coerce.boolean()——Boolean('false') === true 会让「停用」筛选永远失效。
 */
export const enabledFilterSchema = z
  .preprocess((v) => {
    if (v === true || v === 'true') {
      return true;
    }
    if (v === false || v === 'false') {
      return false;
    }
    return undefined;
  }, z.boolean().optional());

/** 排序方向。 */
export const sortDirectionSchema = z.enum(['asc', 'desc']);

/** 金额以字符串传输（两位小数），避免浮点精度问题。 */
export const decimalStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'must be a decimal string like "12.34"');
