import { tmpdir } from 'node:os';
import path from 'node:path';
import { ADMIN_PASSWORD } from './fixtures';

export const STORAGE_DIR = path.join(tmpdir(), 'tiangong-it-storage');

/**
 * 在任何应用模块被加载前固定测试环境。
 * 本模块进 vitest setupFiles，先于测试文件与其 import 的 AppModule 求值。
 */
function prepareEnv(): void {
  process.env['DATABASE_URL'] =
    process.env['TEST_DATABASE_URL'] ??
    'mysql://tiangong:tiangong_dev@127.0.0.1:3307/tiangong_test';
  process.env['ADMIN_INITIAL_PASSWORD'] = ADMIN_PASSWORD;
  process.env['JWT_ACCESS_SECRET'] ??= 'test_access_secret_at_least_32_chars_long!!';
  process.env['NODE_ENV'] = 'test';
  process.env['STORAGE_DIR'] = STORAGE_DIR;
}

prepareEnv();
