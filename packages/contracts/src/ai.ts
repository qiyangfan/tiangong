import { z } from 'zod';
import { isoDateTimeSchema } from './common.js';

/** AI 动作风险：仅由 HTTP 方法决定（GET=read，其余=write），不引入策略引擎。 */
export const aiRiskSchema = z.enum(['read', 'write']);
export type AiRisk = z.infer<typeof aiRiskSchema>;

export const aiActionStatusSchema = z.enum([
  'draft',
  'awaiting_confirmation',
  'executing',
  'executed',
  'failed',
  'cancelled',
]);
export type AiActionStatus = z.infer<typeof aiActionStatusSchema>;

export const aiMessageRoleSchema = z.enum(['user', 'assistant', 'tool']);
export type AiMessageRole = z.infer<typeof aiMessageRoleSchema>;

export const aiConversationCreateRequestSchema = z.object({
  title: z.string().trim().max(100).optional(),
});
export type AiConversationCreateRequest = z.infer<typeof aiConversationCreateRequestSchema>;

export const aiMessageRequestSchema = z.object({
  content: z.string().trim().min(1).max(8000),
});
export type AiMessageRequest = z.infer<typeof aiMessageRequestSchema>;

/** ticket 允许缺省：服务端据此返回 AI_CONFIRMATION_REQUIRED，而不是笼统的 400。 */
export const aiConfirmRequestSchema = z.object({
  ticket: z.string().min(1).optional(),
});
export type AiConfirmRequest = z.infer<typeof aiConfirmRequestSchema>;

export const aiConversationSchema = z.strictObject({
  id: z.number().int(),
  title: z.string(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type AiConversation = z.infer<typeof aiConversationSchema>;

export const aiMessageSchema = z.strictObject({
  id: z.number().int(),
  role: aiMessageRoleSchema,
  content: z.string(),
  createdAt: isoDateTimeSchema,
});
export type AiMessage = z.infer<typeof aiMessageSchema>;

export const aiActionSchema = z.strictObject({
  id: z.number().int(),
  conversationId: z.number().int(),
  toolName: z.string(),
  method: z.string(),
  path: z.string(),
  params: z.record(z.string(), z.unknown()),
  risk: aiRiskSchema,
  status: aiActionStatusSchema,
  requestId: z.string().nullable(),
  errorCode: z.string().nullable(),
  result: z.unknown(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type AiAction = z.infer<typeof aiActionSchema>;

export const aiConversationDetailSchema = z.strictObject({
  conversation: aiConversationSchema,
  messages: z.array(aiMessageSchema),
  actions: z.array(aiActionSchema),
});
export type AiConversationDetail = z.infer<typeof aiConversationDetailSchema>;

export const aiStatusSchema = z.strictObject({ enabled: z.boolean() });
export type AiStatus = z.infer<typeof aiStatusSchema>;

/** SSE 事件名与 data 形状；`done` 必须是最后一个事件。 */
export const aiMessageDeltaEventSchema = z.strictObject({ text: z.string() });
export const aiActionProposedEventSchema = z.strictObject({
  actionId: z.number().int(),
  method: z.string(),
  path: z.string(),
  params: z.record(z.string(), z.unknown()),
  risk: aiRiskSchema,
  confirmationTicket: z.string().optional(),
  expiresAt: isoDateTimeSchema.optional(),
});
export const aiActionExecutedEventSchema = z.strictObject({
  actionId: z.number().int(),
  status: z.literal('executed'),
  resultSummary: z.string(),
});
export const aiActionFailedEventSchema = z.strictObject({
  actionId: z.number().int(),
  code: z.string(),
});
export const aiErrorEventSchema = z.strictObject({
  code: z.string(),
  message: z.string(),
});
export const aiDoneEventSchema = z.strictObject({
  status: z.enum(['completed', 'awaiting_confirmation', 'failed']),
});

export const AI_SSE_EVENT_NAMES = [
  'message.delta',
  'action.proposed',
  'action.executed',
  'action.failed',
  'error',
  'done',
] as const;

export type AiSseEventName = (typeof AI_SSE_EVENT_NAMES)[number];

export interface AiSseEventDataMap {
  'message.delta': z.infer<typeof aiMessageDeltaEventSchema>;
  'action.proposed': z.infer<typeof aiActionProposedEventSchema>;
  'action.executed': z.infer<typeof aiActionExecutedEventSchema>;
  'action.failed': z.infer<typeof aiActionFailedEventSchema>;
  error: z.infer<typeof aiErrorEventSchema>;
  done: z.infer<typeof aiDoneEventSchema>;
}

export type AiSseEvent = {
  [K in AiSseEventName]: { event: K; data: AiSseEventDataMap[K] };
}[AiSseEventName];

export const aiSseEventDataSchemas = {
  'message.delta': aiMessageDeltaEventSchema,
  'action.proposed': aiActionProposedEventSchema,
  'action.executed': aiActionExecutedEventSchema,
  'action.failed': aiActionFailedEventSchema,
  error: aiErrorEventSchema,
  done: aiDoneEventSchema,
} as const;
