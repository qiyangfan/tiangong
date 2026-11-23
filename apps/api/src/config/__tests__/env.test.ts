import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateEnv } from '../env';

const JWT_SECRET = 'valid_secret_at_least_32_characters!!';

function baseConfig(): Record<string, unknown> {
  return { DATABASE_URL: 'postgresql://localhost/tiangong', JWT_ACCESS_SECRET: JWT_SECRET };
}

/** 捕获 fail-fast：mock exit 改为抛错，便于断言退出码与提示。 */
function spyExit() {
  const errors: string[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
  });
  const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${String(code)})`);
  });
  return { exit, errors };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('validateEnv', () => {
  it('缺少必填变量时退出且提示字段名', () => {
    const { exit, errors } = spyExit();
    expect(() => validateEnv({ JWT_ACCESS_SECRET: JWT_SECRET })).toThrow('process.exit(1)');
    expect(exit).toHaveBeenCalledWith(1);
    expect(errors[0]).toContain('DATABASE_URL');
  });

  it('secret 过短时退出且不回显取值', () => {
    const weak = 'too_short';
    const { exit, errors } = spyExit();
    expect(() => validateEnv({ ...baseConfig(), JWT_ACCESS_SECRET: weak })).toThrow();
    expect(exit).toHaveBeenCalledWith(1);
    expect(errors[0]).toContain('JWT_ACCESS_SECRET');
    expect(errors[0]).not.toContain(weak);
  });

  it('未设置的变量取默认值', () => {
    const env = validateEnv(baseConfig());
    expect(env).toMatchObject({
      ACCESS_TOKEN_TTL: 900,
      REFRESH_TOKEN_TTL: 604800,
      LOGIN_MAX_FAILURES: 5,
      LOGIN_LOCK_MINUTES: 15,
      CORS_ORIGINS: 'http://localhost:5173',
      PORT: 3000,
      METRICS_ENABLED: true,
      STORAGE_DIR: './storage/uploads',
      MAX_UPLOAD_MB: 20,
      NODE_ENV: 'development',
    });
    expect(env.ADMIN_INITIAL_PASSWORD).toBeUndefined();
  });

  it("METRICS_ENABLED 只接受字面 true/false（'false' 不得被当成真值）", () => {
    expect(validateEnv({ ...baseConfig(), METRICS_ENABLED: 'false' }).METRICS_ENABLED).toBe(false);
    const { exit } = spyExit();
    expect(() => validateEnv({ ...baseConfig(), METRICS_ENABLED: '0' })).toThrow();
    expect(exit).toHaveBeenCalledWith(1);
  });
});

describe('AI 配置校验', () => {
  it('AI 默认关闭且不要求 provider 配置', () => {
    const env = validateEnv(baseConfig());
    expect(env).toMatchObject({
      AI_ENABLED: false,
      AI_PROVIDER: 'openai-compatible',
      AI_MAX_TOKENS: 2048,
      AI_PROVIDER_TIMEOUT_MS: 60_000,
      AI_TOOL_TIMEOUT_MS: 15_000,
    });
  });

  it('AI 开启但缺 provider 配置时启动失败', () => {
    const { exit, errors } = spyExit();
    expect(() => validateEnv({ ...baseConfig(), AI_ENABLED: 'true' })).toThrow('process.exit(1)');
    expect(exit).toHaveBeenCalledWith(1);
    expect(errors[0]).toContain('AI_PROVIDER_BASE_URL');
  });

  it('AI 开启且 provider 配置完整时通过', () => {
    const env = validateEnv({
      ...baseConfig(),
      AI_ENABLED: 'true',
      AI_PROVIDER_BASE_URL: 'http://127.0.0.1:8787/v1',
      AI_PROVIDER_API_KEY: 'test-key',
      AI_MODEL: 'test-model',
    });
    expect(env.AI_ENABLED).toBe(true);
  });

  it('fake provider 仅允许非生产环境', () => {
    const fakeConfig = {
      ...baseConfig(),
      AI_ENABLED: 'true',
      AI_PROVIDER: 'fake',
    };
    expect(validateEnv({ ...fakeConfig, NODE_ENV: 'test' }).AI_PROVIDER).toBe('fake');
    const { exit } = spyExit();
    expect(() => validateEnv({ ...fakeConfig, NODE_ENV: 'production' })).toThrow('process.exit(1)');
    expect(exit).toHaveBeenCalledWith(1);
  });
});

describe('AI 生产环境 provider 校验', () => {
  it('AI 关闭时仍拒绝 fake provider', () => {
    const { exit, errors } = spyExit();
    expect(() =>
      validateEnv({
        ...baseConfig(),
        AI_ENABLED: 'false',
        AI_PROVIDER: 'fake',
        NODE_ENV: 'production',
      }),
    ).toThrow('process.exit(1)');
    expect(exit).toHaveBeenCalledWith(1);
    expect(errors[0]).toContain('AI_PROVIDER');
  });
});
