import { z } from 'zod';

/** 响应契约断言单源：成功 envelope、分页容器与统一错误体。 */
export type ContractSchema = z.ZodType;

export const success = <T extends ContractSchema>(data: T) =>
  z.strictObject({ code: z.literal(0), data });

export const page = <T extends ContractSchema>(item: T) =>
  z.strictObject({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });

export const errorEnvelope = z.strictObject({
  code: z.string().min(1),
  message: z.string(),
  data: z.null(),
  requestId: z.string().min(1),
});

export function expectContract(schema: ContractSchema, body: unknown, label: string): void {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new Error(`${label} 响应与契约不符：${JSON.stringify(result.error.issues, null, 2)}`);
  }
}

export function idOf(body: unknown): number {
  return (body as { data: { id: number } }).data.id;
}
