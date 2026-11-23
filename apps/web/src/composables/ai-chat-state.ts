import { reactive } from 'vue';
import type { ComposerTranslation } from 'vue-i18n';
import type { AiAction } from '@tiangong/contracts';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
}

export interface PanelAction {
  id: number;
  method: string;
  path: string;
  params: Record<string, unknown>;
  risk: 'read' | 'write';
  status: AiAction['status'];
  resultSummary?: string;
  errorCode?: string | null;
  busy?: boolean;
}

export interface ChatState {
  conversationId: number | null;
  messages: ChatMessage[];
  actions: PanelAction[];
  tickets: Record<number, string>;
  input: string;
  sending: boolean;
  disabled: boolean;
  errorText: string;
}

interface ChatAuth {
  accessToken: string | null;
  hasPermi: (permission: string) => boolean;
  sessionExpired: (code?: string) => Promise<void>;
}

export interface ChatContext {
  state: ChatState;
  t: ComposerTranslation;
  auth: ChatAuth;
  scroll: () => void;
  controller: { current: AbortController | null };
}

export function createChatState(): ChatState {
  return reactive<ChatState>({
    conversationId: null,
    messages: [],
    actions: [],
    tickets: {},
    input: '',
    sending: false,
    disabled: false,
    errorText: '',
  });
}

export function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function summaryOf(result: unknown): string {
  const text = typeof result === 'undefined' ? '' : JSON.stringify(result);
  return text.length > 240 ? `${text.slice(0, 240)}…` : text;
}
