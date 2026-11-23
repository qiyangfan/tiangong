export const AI_ACTION_STATUS = {
  draft: 'draft',
  awaiting: 'awaiting_confirmation',
  executing: 'executing',
  executed: 'executed',
  failed: 'failed',
  cancelled: 'cancelled',
} as const;

export const CONFIRMATION_TTL_MS = 300_000;
export const MAX_MODEL_ROUNDS = 8;
export const MAX_TOOL_CALLS = 16;
export const MESSAGE_CONTENT_LIMIT = 16_000;
export const TOOL_RESULT_LIMIT = 8_000;
export const CONTEXT_MESSAGE_LIMIT = 20;
export const CONTEXT_CHAR_LIMIT = 32_000;
export const AI_MESSAGE_RATE_LIMIT = 10;
export const AI_CONFIRM_RATE_LIMIT = 20;
export const AI_RATE_WINDOW_MS = 60_000;
