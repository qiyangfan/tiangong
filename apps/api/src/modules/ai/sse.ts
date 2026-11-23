import type { Response } from 'express';
import type { AiSseEventDataMap, AiSseEventName } from '@tiangong/contracts';

const HEARTBEAT_MS = 15_000;

/** POST SSE 手工响应：固定响应头、15s 心跳、错误收口后由调用方 end。 */
export class SseWriter {
  private heartbeat: NodeJS.Timeout | undefined;
  private closed = false;

  constructor(private readonly res: Response) {}

  start(): void {
    if (this.closed) {
      return;
    }
    this.res.status(200);
    this.res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    this.res.setHeader('Cache-Control', 'no-cache, no-transform');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.setHeader('X-Accel-Buffering', 'no');
    this.res.flushHeaders();
    this.heartbeat = setInterval(() => {
      this.ping();
    }, HEARTBEAT_MS);
    this.heartbeat.unref();
  }

  write<K extends AiSseEventName>(event: K, data: AiSseEventDataMap[K]): void {
    if (this.closed || this.res.writableEnded) {
      return;
    }
    try {
      this.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      this.closed = true;
    }
  }

  end(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = undefined;
    }
    this.closed = true;
    try {
      if (!this.res.writableEnded) {
        this.res.end();
      }
    } catch {
      // 连接已被对端销毁，end 失败无需再上抛
    }
  }

  private ping(): void {
    if (this.closed || this.res.writableEnded) {
      return;
    }
    try {
      this.res.write(': ping\n\n');
    } catch {
      this.closed = true;
    }
  }
}
