import type { ComposerTranslation } from 'vue-i18n';

const ERROR_KEYS: Record<string, string> = {
  AI_DISABLED: 'ai.error.disabled',
  AI_PROVIDER_ERROR: 'ai.error.provider',
  AI_CONFIRMATION_REQUIRED: 'ai.error.confirmationRequired',
  AI_CONFIRMATION_EXPIRED: 'ai.error.confirmationExpired',
  AI_ACTION_CONFLICT: 'ai.error.conflict',
  AI_TOOL_LOOP_LIMIT: 'ai.error.loopLimit',
  AI_SESSION_NOT_FOUND: 'ai.error.sessionNotFound',
  AI_ACTION_NOT_FOUND: 'ai.error.actionNotFound',
  AUTH_FORBIDDEN: 'ai.error.forbidden',
  AUTH_RATE_LIMITED: 'ai.error.rateLimited',
  VALIDATION_ERROR: 'ai.error.validation',
};

/** 稳定错误码 → 本地化文案；未收录的码回落调用方文案或通用失败提示。 */
export function localizedAiError(
  t: ComposerTranslation,
  code: string | null | undefined,
  fallback?: string,
): string {
  const key = code === null || code === undefined ? undefined : ERROR_KEYS[code];
  return key === undefined ? (fallback ?? t('ai.error.generic')) : t(key);
}
