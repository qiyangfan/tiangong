import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../../../common/app-error';
import { redact, stableStringify, truncateText } from '../redaction';
import type { ToolCatalogEntry } from './tool-catalog.service';

export interface ToolExecutionResult {
  ok: boolean;
  status: number;
  code: string | null;
  message: string | null;
  data: unknown;
  requestId: string;
  authExpired: boolean;
}

interface Envelope {
  code?: unknown;
  message?: unknown;
  data?: unknown;
}

const MAX_RESULT_CHARS = 8000;

function primitiveOf(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

function fillPath(path: string, names: string[], args: Record<string, unknown>): string {
  let result = path;
  for (const name of names) {
    const value = primitiveOf(args[name]);
    if (value === undefined || value === '') {
      throw new AppError('VALIDATION_ERROR', `missing path parameter: ${name}`);
    }
    result = result.replace(`{${name}}`, encodeURIComponent(value));
  }
  return result;
}

function shouldAppend(entry: ToolCatalogEntry, key: string): boolean {
  if (entry.queryParams.includes(key)) {
    return true;
  }
  if (entry.method !== 'GET' && entry.method !== 'DELETE') {
    return false;
  }
  return !entry.pathParams.includes(key);
}

function appendQuery(params: URLSearchParams, key: string, value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      appendQuery(params, key, item);
    }
    return;
  }
  const text = primitiveOf(value);
  if (text !== undefined) {
    params.append(key, text);
  }
}

function buildUrl(base: string, entry: ToolCatalogEntry, args: Record<string, unknown>): URL {
  const url = new URL(`/api/v1${fillPath(entry.path, entry.pathParams, args)}`, base);
  for (const [key, value] of Object.entries(args)) {
    if (shouldAppend(entry, key)) {
      appendQuery(url.searchParams, key, value);
    }
  }
  return url;
}

function bodyOf(entry: ToolCatalogEntry, args: Record<string, unknown>): unknown {
  if (!entry.hasBody) {
    return undefined;
  }
  const excluded = new Set([...entry.pathParams, ...entry.queryParams]);
  const body = Object.fromEntries(Object.entries(args).filter(([key]) => !excluded.has(key)));
  return Object.keys(body).length === 0 ? undefined : body;
}

function envelopeOf(raw: string): Envelope | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function successData(envelope: Envelope | undefined, text: string): unknown {
  if (envelope !== undefined) {
    return envelope.data ?? null;
  }
  return text === '' ? null : text;
}

interface SendInput {
  entry: ToolCatalogEntry;
  args: Record<string, unknown>;
  accessToken: string;
  url: URL;
  requestId: string;
}

/** 以调用者 token 自调用平台 API；不直连数据库或 service，保证同权同审计。 */
@Injectable()
export class ToolExecutorService {
  constructor(private readonly config: ConfigService) {}

  async execute(
    entry: ToolCatalogEntry,
    args: Record<string, unknown>,
    accessToken: string,
  ): Promise<ToolExecutionResult> {
    const requestId = randomUUID();
    try {
      const url = buildUrl(this.baseUrl(), entry, args);
      const response = await this.send({ entry, args, accessToken, url, requestId });
      return await this.parseResponse(response, requestId);
    } catch (error) {
      return this.failure(error, requestId);
    }
  }

  private baseUrl(): string {
    return (
      this.config.get<string>('API_SELF_BASE_URL') ??
      `http://127.0.0.1:${String(this.config.get<number>('PORT') ?? 3000)}`
    );
  }

  private async send(input: SendInput): Promise<Response> {
    const body = bodyOf(input.entry, input.args);
    return fetch(input.url, {
      method: input.entry.method,
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'X-Request-Id': input.requestId,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: 'error',
      signal: AbortSignal.timeout(this.config.get<number>('AI_TOOL_TIMEOUT_MS') ?? 15_000),
    });
  }

  private async parseResponse(response: Response, requestId: string): Promise<ToolExecutionResult> {
    const text = await response.text();
    const envelope = envelopeOf(text);
    if (response.ok && (envelope === undefined || envelope.code === 0)) {
      return {
        ok: true,
        status: response.status,
        code: null,
        message: null,
        data: successData(envelope, text),
        requestId,
        authExpired: false,
      };
    }
    return {
      ok: false,
      status: response.status,
      code: typeof envelope?.code === 'string' ? envelope.code : 'INTERNAL_ERROR',
      message: typeof envelope?.message === 'string' ? envelope.message : null,
      data: null,
      requestId,
      authExpired: response.status === 401,
    };
  }

  private failure(error: unknown, requestId: string): ToolExecutionResult {
    return {
      ok: false,
      status: 0,
      code: error instanceof AppError ? error.code : 'INTERNAL_ERROR',
      message: error instanceof AppError ? error.message : 'tool execution failed',
      data: null,
      requestId,
      authExpired: false,
    };
  }
}

/** 给模型与动作卡片的结果摘要：脱敏后截断，不包含令牌与内部异常文本。 */
export function resultSummary(data: unknown): string {
  return truncateText(stableStringify(redact(data)), 500);
}

/** 落库结果：整体序列化超限时只保留摘要，避免无界 JSON。 */
export function storedResult(data: unknown): unknown {
  const redacted = redact(data);
  const serialized = stableStringify(redacted);
  return serialized.length > MAX_RESULT_CHARS
    ? { truncated: true, summary: truncateText(serialized, MAX_RESULT_CHARS) }
    : redacted;
}
