import type { Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SseWriter } from '../sse';

function responseWithFailingWrite(): { res: Response; end: ReturnType<typeof vi.fn> } {
  const end = vi.fn();
  const res = {
    status: vi.fn(),
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(() => {
      throw new Error('socket closed');
    }),
    end,
    writableEnded: false,
  } as unknown as Response;
  return { res, end };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SseWriter', () => {
  it('写失败后 end 仍清理心跳并关闭响应', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const { res, end } = responseWithFailingWrite();
    const writer = new SseWriter(res);

    writer.start();
    writer.write('done', { status: 'completed' });
    writer.end();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(end).toHaveBeenCalled();
  });
});
