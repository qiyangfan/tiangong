import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  parseSseFrames,
  postSse,
  readSseStream,
  SseRequestError,
  type SseEvent,
} from '../ai-stream';
import { bindTokenBus } from '../token-bus';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

function responseOf(body: ReadableStream<Uint8Array> | null, status = 200): Response {
  return { ok: status < 400, status, body } as Response;
}

afterEach(() => {
  bindTokenBus({
    getToken: () => null,
    refresh: () => Promise.resolve(false),
    onSessionExpired: () => {},
  });
  vi.unstubAllGlobals();
});

describe('SSE 分帧', () => {
  it('按空行分帧并保留未闭合尾部', () => {
    const first = parseSseFrames(
      'event: message.delta\ndata: {"text":"a"}\n\nevent: done\ndata: {"status":"completed"}\n\n',
    );
    expect(first.events).toEqual([
      { event: 'message.delta', data: '{"text":"a"}' },
      { event: 'done', data: '{"status":"completed"}' },
    ]);
    expect(first.rest).toBe('');

    const partial = parseSseFrames('event: message.delta\ndata: {"te');
    expect(partial.events).toEqual([]);
    expect(partial.rest).toBe('event: message.delta\ndata: {"te');
  });

  it('兼容 CRLF、注释与多行 data', () => {
    const parsed = parseSseFrames(
      ': ping\r\n\r\nevent: error\r\ndata: {"code":"AI_PROVIDER_ERROR",\r\ndata: "message":"x"}\r\n\r\n',
    );
    expect(parsed.events).toEqual([
      { event: 'error', data: '{"code":"AI_PROVIDER_ERROR",\n"message":"x"}' },
    ]);
  });
});

describe('SSE 流读取', () => {
  it('跨 chunk 半包可续接，error 与 done 顺序保留', async () => {
    const events: SseEvent[] = [];
    await readSseStream(
      streamOf([
        'event: message.delta\ndata: {"text":"你',
        '好"}\n\nevent: error\ndata: {"code":"AI_PROVIDER_ERROR"}\n\nevent: done\ndata: {"status":"failed"}\n\n',
      ]),
      (event) => events.push(event),
    );
    expect(events.map((event) => event.event)).toEqual(['message.delta', 'error', 'done']);
    expect(events[0]?.data).toBe('{"text":"你好"}');
  });

  it('流结束前没有空行时仍吐出最后一帧', async () => {
    const events: SseEvent[] = [];
    await readSseStream(streamOf(['event: done\ndata: {"status":"completed"}']), (event) =>
      events.push(event),
    );
    expect(events).toEqual([{ event: 'done', data: '{"status":"completed"}' }]);
  });
});

describe('POST SSE 成功', () => {
  it('把事件回调给调用方并携带鉴权头', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(responseOf(streamOf(['event: done\ndata: {"status":"completed"}\n\n'])));
    vi.stubGlobal('fetch', fetchMock);
    const events: SseEvent[] = [];
    await postSse(
      '/ai/conversations/1/messages',
      { token: 'access-token', body: { content: 'hi' } },
      (event) => events.push(event),
    );
    expect(events).toEqual([{ event: 'done', data: '{"status":"completed"}' }]);

    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe('/ai/conversations/1/messages');
    const init = call?.[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer access-token');
  });

  it('401 经共享刷新换新 token 后重试一次', async () => {
    const refresh = vi.fn(() => Promise.resolve(true));
    bindTokenBus({ getToken: () => 'new-token', refresh, onSessionExpired: () => {} });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ code: 'AUTH_TOKEN_EXPIRED' }),
      } as Response)
      .mockResolvedValueOnce(
        responseOf(streamOf(['event: done\ndata: {"status":"completed"}\n\n'])),
      );
    vi.stubGlobal('fetch', fetchMock);

    await postSse(
      '/ai/conversations/1/messages',
      { token: 'old-token', body: { content: 'hi' } },
      () => undefined,
    );

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retry = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect((retry.headers as Record<string, string>)['Authorization']).toBe('Bearer new-token');
  });
});

describe('POST SSE 错误', () => {
  it('错误 envelope 映射为 SseRequestError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ code: 'AI_ACTION_CONFLICT', message: 'conflict' }),
      } as Response),
    );
    await expect(
      postSse('/ai/actions/1/confirm', { token: 't', body: {} }, () => undefined),
    ).rejects.toMatchObject({
      name: 'SseRequestError',
      code: 'AI_ACTION_CONFLICT',
      status: 409,
    });
  });

  it('非 JSON 错误与缺失响应体回落到稳定错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.reject(new Error('not json')),
      } as Response),
    );
    await expect(postSse('/ai/x', { token: 't', body: {} }, () => undefined)).rejects.toMatchObject(
      { code: 'HTTP_502', status: 502 },
    );

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
        json: () => Promise.resolve(null),
      } as Response),
    );
    await expect(
      postSse('/ai/x', { token: 't', body: {} }, () => undefined),
    ).rejects.toBeInstanceOf(SseRequestError);
  });
});
