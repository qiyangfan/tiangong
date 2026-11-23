import { AppError } from '../../../common/app-error';
import type { AiProvider, AiProviderMessage, AiToolDefinition, ProviderDelta } from './ai-provider';

function messageText(message: AiProviderMessage): string {
  return message.content ?? '';
}

function lastUserText(messages: AiProviderMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role === 'user') {
      return messageText(message);
    }
  }
  return '';
}

function findTool(
  tools: AiToolDefinition[],
  method: 'get' | 'post' | 'delete',
  segment: string,
): AiToolDefinition | undefined {
  return tools.find(
    (tool) => tool.function.name.startsWith(`${method}_`) && tool.function.name.includes(segment),
  );
}

function toolDelta(tool: AiToolDefinition, args: Record<string, unknown>): ProviderDelta[] {
  const serialized = JSON.stringify(args);
  const split = Math.max(1, Math.floor(serialized.length / 2));
  return [
    {
      type: 'tool_call',
      index: 0,
      id: 'call_fake_1',
      name: tool.function.name,
      argumentsDelta: serialized.slice(0, split),
    },
    { type: 'tool_call', index: 0, argumentsDelta: serialized.slice(split) },
  ];
}

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new Error('aborted');
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError(signal));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(abortError(signal));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function nameFrom(text: string): string {
  const match = /(?:名称|name)\s*[:：=]\s*([^\s，,。]+)/i.exec(text);
  return match?.[1] ?? 'E2E-AI-记录';
}

function idFrom(text: string): number | undefined {
  const match = /(?:id|编号)\s*[:：=]\s*(\d+)/i.exec(text);
  return match ? Number(match[1]) : undefined;
}

interface ToolIntent {
  method: 'get' | 'post';
  segment: string;
  args: Record<string, unknown>;
  missingText: string;
}

/**
 * 测试/评测专用确定性 provider：按最后一条用户消息选择工具，不访问网络。
 * 生产环境由 env 校验拒绝 AI_PROVIDER=fake。
 */
export class FakeProvider implements AiProvider {
  async *chat(input: {
    messages: AiProviderMessage[];
    tools: AiToolDefinition[];
    signal: AbortSignal;
  }): AsyncIterable<ProviderDelta> {
    const lastUser = lastUserText(input.messages);
    if (lastUser.includes('__timeout__')) {
      throw new AppError('AI_PROVIDER_ERROR');
    }
    if (input.signal.aborted) {
      throw abortError(input.signal);
    }
    if (input.messages.at(-1)?.role === 'tool') {
      yield* this.afterTool(input.tools, lastUser);
      return;
    }
    yield* this.fromIntent(input.tools, lastUser, input.signal);
  }

  private *afterTool(tools: AiToolDefinition[], lastUser: string): Generator<ProviderDelta> {
    if (lastUser.includes('__loop__')) {
      const tool = findTool(tools, 'get', 'samples');
      if (tool) {
        yield* toolDelta(tool, { page: 1, pageSize: 20 });
        return;
      }
    }
    yield { type: 'text', text: lastUser.includes('查询') ? '查询完成。' : '操作完成。' };
  }

  private async *fromIntent(
    tools: AiToolDefinition[],
    lastUser: string,
    signal: AbortSignal,
  ): AsyncGenerator<ProviderDelta> {
    if (lastUser.includes('__loop__')) {
      yield* this.toolOrText(tools, {
        method: 'get',
        segment: 'samples',
        args: { page: 1, pageSize: 20 },
        missingText: '当前账号没有可用的示例工具。',
      });
      return;
    }
    if (lastUser.includes('__slow__')) {
      yield { type: 'text', text: '第一段' };
      await sleep(300, signal);
      yield { type: 'text', text: '第二段' };
      return;
    }
    yield* this.intent(tools, lastUser);
  }

  private *intent(tools: AiToolDefinition[], lastUser: string): Generator<ProviderDelta> {
    if (/查询|查看/.test(lastUser) && /示例/.test(lastUser)) {
      yield* this.toolOrText(tools, {
        method: 'get',
        segment: 'samples',
        args: { page: 1, pageSize: 20 },
        missingText: '当前账号没有查询示例数据的权限。',
      });
      return;
    }
    if (/创建|新增/.test(lastUser) && /示例/.test(lastUser)) {
      yield* this.createIntent(tools, lastUser);
      return;
    }
    if (/删除/.test(lastUser) && /示例/.test(lastUser)) {
      yield* this.deleteIntent(tools, lastUser);
      return;
    }
    yield { type: 'text', text: '我是天工 AI 助手，可以帮你查询、创建或删除示例数据。' };
  }

  private *createIntent(tools: AiToolDefinition[], lastUser: string): Generator<ProviderDelta> {
    if (lastUser.includes('__write_text__')) {
      yield* this.writeWithText(tools, lastUser);
      return;
    }
    yield* this.toolOrText(tools, {
      method: 'post',
      segment: 'samples',
      args: { name: nameFrom(lastUser), enabled: true },
      missingText: '当前账号没有创建示例数据的权限。',
    });
  }

  private *writeWithText(tools: AiToolDefinition[], lastUser: string): Generator<ProviderDelta> {
    const tool = findTool(tools, 'post', 'samples');
    if (!tool) {
      yield { type: 'text', text: '当前账号没有创建示例数据的权限。' };
      return;
    }
    yield { type: 'text', text: '准备创建。' };
    yield* toolDelta(tool, { name: nameFrom(lastUser), enabled: true });
  }

  private *deleteIntent(tools: AiToolDefinition[], lastUser: string): Generator<ProviderDelta> {
    const tool = findTool(tools, 'delete', 'samples');
    const id = idFrom(lastUser);
    if (tool && id !== undefined) {
      yield* toolDelta(tool, { id });
      return;
    }
    yield {
      type: 'text',
      text: tool ? '请提供要删除的示例数据 ID。' : '当前账号没有删除示例数据的权限。',
    };
  }

  private *toolOrText(tools: AiToolDefinition[], intent: ToolIntent): Generator<ProviderDelta> {
    const tool = findTool(tools, intent.method, intent.segment);
    if (tool) {
      yield* toolDelta(tool, intent.args);
      return;
    }
    yield { type: 'text', text: intent.missingText };
  }
}
