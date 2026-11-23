import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { createAiProvider } from '../provider/create-provider';

describe('createAiProvider', () => {
  it('AI 关闭时不要求 provider 配置，任何调用 fail-closed', async () => {
    const provider = createAiProvider(new ConfigService({ AI_ENABLED: false }));
    const deltas: unknown[] = [];
    await expect(async () => {
      for await (const delta of provider.chat({
        messages: [],
        tools: [],
        signal: new AbortController().signal,
      })) {
        deltas.push(delta);
      }
    }).rejects.toMatchObject({ code: 'AI_DISABLED' });
    expect(deltas).toEqual([]);
  });
});
