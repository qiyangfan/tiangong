import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * e2e 运行参数单源：config / global-setup / tests 共用。
 * 端口与日常 dev（3000/5173）隔离，避免 reuseExistingServer 误连开发服务。
 */
export const API_PORT = 3001;
export const WEB_PORT = 5174;
export const API_URL = `http://localhost:${API_PORT}`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;
export const API_BASE = `${API_URL}/api/v1`;

/** e2e 数据源：与集成测试同一约定（TEST_DATABASE_URL 覆盖，默认本地共享栈 tiangong_test）。 */
export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? 'mysql://tiangong:tiangong_dev@127.0.0.1:3307/tiangong_test';

export const E2E_ADMIN = { username: 'admin', password: 'TestAdmin1pw' } as const;

/** 零权限 fixture（用后即删；键名与集成套件的 noperm 区分）。 */
export const E2E_NOPERM = {
  username: 'e2e_noperm',
  password: 'E2eNoperm1pw',
  roleName: 'e2e 零权限角色',
  roleKey: 'e2e_noperm_role',
} as const;

/** api dev 进程环境：强制指向 tiangong_test 与固定测试密钥，进程 env 优先于任何 .env 文件。 */
export function apiServerEnv(): Record<string, string> {
  // playwright webServer.env 要求 string 值；过滤继承自 process.env 的 undefined 项
  const inherited: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      inherited[key] = value;
    }
  }
  return {
    ...inherited,
    PORT: String(API_PORT),
    DATABASE_URL: TEST_DB_URL,
    ADMIN_INITIAL_PASSWORD: E2E_ADMIN.password,
    JWT_ACCESS_SECRET: 'e2e_access_secret_at_least_32_chars_long!!',
    STORAGE_DIR: path.join(tmpdir(), 'tiangong-e2e-storage'),
  };
}
