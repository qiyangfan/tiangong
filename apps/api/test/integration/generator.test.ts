import { afterAll, describe, expect, it } from 'vitest';
import type { GenPreviewFile } from '@tiangong/contracts';
import { EXECUTABLE_DEF, expectedGenPaths } from '../setup/fixtures';
import { adminAuth, nopermAuth, prisma, testHttp } from './context';

const codeOf = (body: unknown): string => (body as { code: string }).code;

const dataOf = <T>(body: unknown): T => (body as { data: T }).data;

const PATHS = expectedGenPaths(EXECUTABLE_DEF.name);

/** 已保存定义 id：创建用例写入，预览与改名用例复用。 */
const state = { defId: 0 };

function createDefinition(name: string = EXECUTABLE_DEF.name) {
  return testHttp()
    .post('/api/v1/gen-definitions')
    .set(adminAuth())
    .send({ ...EXECUTABLE_DEF, name });
}

async function createDefinitionOk(): Promise<number> {
  const create = await createDefinition();
  expect(create.status).toBe(201);
  return dataOf<{ id: number }>(create.body).id;
}

async function expectDuplicateNameRejected(): Promise<void> {
  const dup = await createDefinition();
  expect(dup.status).toBe(409);
  expect(codeOf(dup.body)).toBe('GEN_NAME_TAKEN');
}

function previewDraft(body: object) {
  return testHttp().post('/api/v1/gen-definitions/preview').set(adminAuth()).send(body);
}

describe('代码生成器：定义与预览', () => {
  afterAll(async () => {
    await prisma.genDefinition.deleteMany({ where: { name: EXECUTABLE_DEF.name } });
  });

  it('创建定义 + 已保存定义预览返回 7 件产物（路径定版）', async () => {
    state.defId = await createDefinitionOk();
    await expectDuplicateNameRejected();

    const preview = await testHttp()
      .get(`/api/v1/gen-definitions/${state.defId}/preview`)
      .set(adminAuth());
    expect(preview.status).toBe(200);
    expect(dataOf<GenPreviewFile[]>(preview.body).map((file) => file.path)).toEqual(PATHS);
  });

  it('草稿预览不落库', async () => {
    const draft = await previewDraft(EXECUTABLE_DEF);
    expect(draft.status).toBe(201);
    expect(dataOf<GenPreviewFile[]>(draft.body)).toHaveLength(PATHS.length);
    // 创建用例已落库同一 name；草稿预览不得新增定义
    expect(await prisma.genDefinition.count({ where: { name: EXECUTABLE_DEF.name } })).toBe(1);
  });

  it('enum 无选项被 400 拒绝', async () => {
    const badEnum = await previewDraft({
      ...EXECUTABLE_DEF,
      name: 'it-gen-bad',
      fields: [{ ...enumField(), enumOptions: [] }],
    });
    expect(badEnum.status).toBe(400);
    expect(codeOf(badEnum.body)).toBe('GEN_FIELD_INVALID');
  });

  it('模块名创建后不可变，无权限用户预览被 403 拒绝', async () => {
    const rename = await testHttp()
      .put(`/api/v1/gen-definitions/${state.defId}`)
      .set(adminAuth())
      .send({ name: 'it-gen-renamed' });
    expect(rename.status).toBe(409);

    const denied = await testHttp()
      .get(`/api/v1/gen-definitions/${state.defId}/preview`)
      .set(nopermAuth());
    expect(denied.status).toBe(403);
    expect(codeOf(denied.body)).toBe('AUTH_FORBIDDEN');
  });
});

/** 夹具中的 enum 字段；缺失即夹具与用例约定不符。 */
function enumField() {
  const field = EXECUTABLE_DEF.fields.find((candidate) => candidate.type === 'enum');
  if (!field) {
    throw new Error('fixture definition has no enum field');
  }
  return field;
}
