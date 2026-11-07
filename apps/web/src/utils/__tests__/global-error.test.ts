import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'vue';

// 全局异常兜底契约：三入口统一走 reportError（全量控制台 + 节流提示）、
// 资源加载失败形态（无 message 的 error 事件）不按异常上报。锁行为，不断言文案。
const elMessageError = vi.hoisted(() => vi.fn());
vi.mock('element-plus', () => ({ ElMessage: { error: elMessageError } }));
vi.mock('@/locales', () => ({ i18n: { global: { t: (key: string) => key } } }));

const listeners = new Map<string, (event: unknown) => void>();
const consoleError = vi.fn();

// reportError 含模块级节流状态：每用例 resetModules 动态导入，避免状态跨用例残留
let reportError: typeof import('@/utils/global-error').reportError;
let setupGlobalErrorHandlers: typeof import('@/utils/global-error').setupGlobalErrorHandlers;

function setup(): App {
  const app = { config: {} } as unknown as App;
  setupGlobalErrorHandlers(app);
  return app;
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  listeners.clear();
  vi.stubGlobal('window', {
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      listeners.set(type, handler);
    },
  });
  vi.spyOn(console, 'error').mockImplementation(consoleError);
  elMessageError.mockClear();
  consoleError.mockClear();
  ({ reportError, setupGlobalErrorHandlers } = await import('@/utils/global-error'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('reportError', () => {
  it('全量进控制台；节流窗口内只弹一条提示', () => {
    reportError(new Error('a'), 'vue:setup');
    reportError(new Error('b'), 'unhandledrejection');

    expect(consoleError).toHaveBeenCalledTimes(2);
    expect(elMessageError).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(3_000);
    reportError(new Error('c'), 'window.error');
    expect(elMessageError).toHaveBeenCalledTimes(2);
  });
});

describe('setupGlobalErrorHandlers', () => {
  it('errorHandler 与 unhandledrejection 统一走 reportError（含 source 标记）', () => {
    const app = setup();

    (app.config.errorHandler as NonNullable<App['config']['errorHandler']>)(
      new Error('v'),
      null,
      'setup',
    );
    listeners.get('unhandledrejection')?.({ reason: new Error('p') });

    // 同一节流窗口：两条异常合并为一条提示
    expect(elMessageError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls.some((args) => String(args[0]).includes('vue:setup'))).toBe(
      true,
    );
    expect(
      consoleError.mock.calls.some((args) => String(args[0]).includes('unhandledrejection')),
    ).toBe(true);
    expect(listeners.has('error')).toBe(true);
  });

  it('资源加载失败形态（无 message 的 error 事件）不按异常上报', () => {
    setup();

    listeners.get('error')?.({ message: '' });
    listeners.get('error')?.({});

    expect(elMessageError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('window.error 带错误信息时按异常上报', () => {
    setup();

    listeners.get('error')?.({ message: 'boom', error: new Error('boom') });

    expect(elMessageError).toHaveBeenCalledTimes(1);
  });
});
