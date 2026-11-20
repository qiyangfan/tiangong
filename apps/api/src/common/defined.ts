/**
 * 去掉值为 undefined 的键。
 * Prisma 入参在 exactOptionalPropertyTypes 下不接受显式 undefined，而 zod 的可选字段
 * 解析结果是 `T | undefined`；运行时 Prisma 本就把 undefined 视作「未提供」，
 * 这里把类型与运行时统一成同一语义。
 */
export function defined<T extends object>(input: T): { [K in keyof T]: Exclude<T[K], undefined> } {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }
  return output as { [K in keyof T]: Exclude<T[K], undefined> };
}
