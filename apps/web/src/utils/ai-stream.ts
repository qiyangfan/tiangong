import { refreshSession, tokenBus } from './token-bus';

/** SSE 事件（data 为原始 JSON 字符串；解析失败由调用方处理）。 */
export interface SseEvent {
  event: string;
  data: string;
}

export interface ParsedFrames {
  events: SseEvent[];
  rest: string;
}

export class SseRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'SseRequestError';
    this.code = code;
    this.status = status;
  }
}

function parseFrame(block: string): SseEvent | undefined {
  let event = '';
  const data: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith(':')) {
      continue;
    }
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      data.push(line.slice('data:'.length).trimStart());
    }
  }
  return event !== '' && data.length > 0 ? { event, data: data.join('\n') } : undefined;
}

/** 按空行分帧；返回未闭合的尾部，供下一个 chunk 续接。 */
export function parseSseFrames(buffer: string): ParsedFrames {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const blocks = normalized.split('\n\n');
  const rest = blocks.pop() ?? '';
  const events = blocks.map(parseFrame).filter((event): event is SseEvent => event !== undefined);
  return { events, rest };
}

interface PumpContext {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  decoder: TextDecoder;
  onEvent: (event: SseEvent) => void;
  buffer: string;
}

function flushFrames(context: PumpContext): void {
  const parsed = parseSseFrames(context.buffer);
  context.buffer = parsed.rest;
  for (const event of parsed.events) {
    context.onEvent(event);
  }
}

function flushTail(context: PumpContext): void {
  context.buffer += context.decoder.decode();
  for (const event of parseSseFrames(`${context.buffer}\n\n`).events) {
    context.onEvent(event);
  }
}

async function pump(context: PumpContext): Promise<void> {
  for (;;) {
    const { done, value } = await context.reader.read();
    if (done) {
      flushTail(context);
      return;
    }
    context.buffer += context.decoder.decode(value, { stream: true });
    flushFrames(context);
  }
}

/** 读取 fetch 响应流并逐事件回调；分帧、半包与 CRLF 在解析器内处理。 */
export async function readSseStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: SseEvent) => void,
): Promise<void> {
  const context: PumpContext = {
    reader: stream.getReader(),
    decoder: new TextDecoder(),
    onEvent,
    buffer: '',
  };
  try {
    await pump(context);
  } finally {
    context.reader.releaseLock();
  }
}

interface PostSseOptions {
  token: string;
  body: unknown;
  signal?: AbortSignal | undefined;
}

function openSse(path: string, options: PostSseOptions, token: string): Promise<Response> {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(options.body),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}

/** POST SSE：axios 不支持流式，这里直接用 fetch + ReadableStream；401 走共享刷新后重试一次。 */
export async function postSse(
  path: string,
  options: PostSseOptions,
  onEvent: (event: SseEvent) => void,
): Promise<void> {
  let response = await openSse(path, options, options.token);
  if (response.status === 401) {
    const refreshed = await refreshSession();
    const nextToken = tokenBus.getToken();
    if (refreshed && nextToken !== null) {
      response = await openSse(path, options, nextToken);
    }
  }
  if (!response.ok || response.body === null) {
    const payload = (await response.json().catch(() => null)) as {
      code?: unknown;
      message?: unknown;
    } | null;
    throw new SseRequestError(
      typeof payload?.code === 'string' ? payload.code : `HTTP_${response.status}`,
      typeof payload?.message === 'string' ? payload.message : response.statusText,
      response.status,
    );
  }
  await readSseStream(response.body, onEvent);
}
