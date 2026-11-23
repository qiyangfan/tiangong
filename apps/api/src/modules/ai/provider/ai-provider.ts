export const AI_PROVIDER = Symbol('AI_PROVIDER');

interface AiToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface AiProviderMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string | undefined;
  tool_calls?: AiToolCall[] | undefined;
}

export interface AiToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export type ProviderDelta =
  | { type: 'text'; text: string }
  | {
      type: 'tool_call';
      index: number;
      id?: string | undefined;
      name?: string | undefined;
      argumentsDelta: string;
    };

export interface AiProvider {
  chat(input: {
    messages: AiProviderMessage[];
    tools: AiToolDefinition[];
    signal: AbortSignal;
  }): AsyncIterable<ProviderDelta>;
}
