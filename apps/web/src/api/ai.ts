import type {
  AiAction,
  AiConversation,
  AiConversationCreateRequest,
  AiStatus,
} from '@tiangong/contracts';
import { http } from '@/utils/request';

export function apiAiStatus(): Promise<AiStatus> {
  return http.get<AiStatus>('/ai/status', { silent: true });
}

export function apiCreateConversation(data: AiConversationCreateRequest): Promise<AiConversation> {
  return http.post<AiConversation>('/ai/conversations', data);
}

export function apiDeleteConversation(id: number): Promise<void> {
  return http.delete(`/ai/conversations/${id}`);
}

export function apiConfirmAction(id: number, ticket: string): Promise<AiAction> {
  return http.post<AiAction>(`/ai/actions/${id}/confirm`, { ticket });
}

export function apiCancelAction(id: number): Promise<AiAction> {
  return http.post<AiAction>(`/ai/actions/${id}/cancel`);
}
