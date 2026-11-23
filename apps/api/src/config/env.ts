import { z } from 'zod';

/**
 * 环境变量契约：缺关键 secret 时启动即失败（fail-fast），且不回显任何值。
 */
const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
    ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL: z.coerce.number().int().positive().default(604800),
    LOGIN_MAX_FAILURES: z.coerce.number().int().positive().default(5),
    LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    PORT: z.coerce.number().int().positive().default(3000),
    // 仅接受字面 true/false，避免 coerce.boolean 把 'false' 误判为 true
    METRICS_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    ADMIN_INITIAL_PASSWORD: z.string().optional(),
    STORAGE_DIR: z.string().default('./storage/uploads'),
    MAX_UPLOAD_MB: z.coerce.number().int().positive().default(20),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    AI_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    AI_PROVIDER: z.enum(['openai-compatible', 'fake']).default('openai-compatible'),
    AI_PROVIDER_BASE_URL: z.url().optional(),
    AI_PROVIDER_API_KEY: z.string().min(1).optional(),
    AI_MODEL: z.string().min(1).optional(),
    AI_MAX_TOKENS: z.coerce.number().int().positive().max(32768).default(2048),
    AI_PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
    AI_TOOL_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
    API_SELF_BASE_URL: z.url().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER === 'fake') {
      if (env.NODE_ENV === 'production') {
        ctx.addIssue({
          code: 'custom',
          path: ['AI_PROVIDER'],
          message: 'fake provider is only allowed outside production',
        });
      }
      return;
    }
    if (!env.AI_ENABLED) {
      return;
    }
    for (const key of ['AI_PROVIDER_BASE_URL', 'AI_PROVIDER_API_KEY', 'AI_MODEL'] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'required when AI_ENABLED=true',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

/** @nestjs/config 校验入口：解析失败打印字段级原因（不含值）并终止启动。 */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    console.error(`[env] environment validation failed:\n${issues.join('\n')}`);
    process.exit(1);
  }
  return parsed.data;
}
