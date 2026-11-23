import { Prisma } from '@prisma/client';
import type {
  AiAction as AiActionRow,
  AiConversation as AiConversationRow,
  AiMessage as AiMessageRow,
} from '@prisma/client';
import type { AiAction, AiConversation, AiMessage } from '@tiangong/contracts';
import { TOOL_RESULT_LIMIT } from './ai.constants';
import { redact, stableStringify, truncateText } from './redaction';

const SENSITIVE_KEY = /password|token|secret/i;
const MAX_DEPTH = 12;

export function toConversation(row: AiConversationRow): AiConversation {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toMessage(row: AiMessageRow): AiMessage {
  return {
    id: row.id,
    role: row.role as AiMessage['role'],
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

export function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
}

export function toAction(row: AiActionRow): AiAction {
  return {
    id: row.id,
    conversationId: row.conversationId,
    toolName: row.toolName,
    method: row.method,
    path: row.path,
    params: asRecord(row.payload),
    risk: row.method === 'GET' ? 'read' : 'write',
    status: row.status as AiAction['status'],
    requestId: row.requestId,
    errorCode: row.errorCode,
    result: row.result,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** 模型参数不可信：超过深度上限直接拒绝，避免递归栈被恶意嵌套耗尽。 */
export function hasSensitiveKey(value: unknown, depth = 0): boolean {
  if (depth > MAX_DEPTH) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasSensitiveKey(item, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, item]) => SENSITIVE_KEY.test(key) || hasSensitiveKey(item, depth + 1),
    );
  }
  return false;
}

export function toolContent(result: {
  ok: boolean;
  code: string | null;
  message: string | null;
  data: unknown;
}): string {
  return truncateText(
    stableStringify({
      ok: result.ok,
      code: result.code,
      message: result.message,
      data: redact(result.data),
    }),
    TOOL_RESULT_LIMIT,
  );
}
