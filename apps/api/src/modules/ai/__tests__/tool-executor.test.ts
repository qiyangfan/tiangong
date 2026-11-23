import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ToolCatalogEntry } from '../tools/tool-catalog.service';
import { ToolExecutorService } from '../tools/tool-executor.service';

const entry: ToolCatalogEntry = {
  wireName: 'get_samples',
  toolName: 'GET /samples',
  method: 'GET',
  path: '/samples',
  summary: '示例列表',
  permissions: [],
  parameters: {},
  pathParams: [],
  queryParams: [],
  hasBody: false,
};

function service(): ToolExecutorService {
  return new ToolExecutorService(
    new ConfigService({
      API_SELF_BASE_URL: 'http://127.0.0.1:3000',
      AI_TOOL_TIMEOUT_MS: 1_000,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ToolExecutorService', () => {
  it('成功 envelope 的 data=null 保持 null，不退化为原始 JSON 文本', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await service().execute(entry, {}, 'access-token');

    expect(result).toMatchObject({ ok: true, code: null, data: null });
    const requestUrl = fetchMock.mock.calls[0]?.[0];
    expect(requestUrl).toBeInstanceOf(URL);
    expect((requestUrl as URL).href).toBe('http://127.0.0.1:3000/api/v1/samples');
  });
});
