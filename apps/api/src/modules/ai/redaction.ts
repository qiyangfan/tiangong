const SENSITIVE_KEY = /password|token|secret/i;
const MAX_DEPTH = 12;

/** 递归按 key 脱敏；用于发送给模型前、落库前与动作卡片展示。 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) {
    return '[TRUNCATED]';
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? '[MASKED]' : redact(item, depth + 1),
      ]),
    );
  }
  return value;
}

/** 确定性 JSON：对象键排序后再序列化，用于参数摘要与幂等比较。 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortValue(item)]),
    );
  }
  return value;
}

const TRUNCATION_MARKER = '…[truncated]';

/** 截断后总长度不超过 max；max 短于标记时不追加标记，避免越过列宽/字符预算。 */
export function truncateText(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  if (max <= TRUNCATION_MARKER.length) {
    return text.slice(0, max);
  }
  return `${text.slice(0, max - TRUNCATION_MARKER.length)}${TRUNCATION_MARKER}`;
}
