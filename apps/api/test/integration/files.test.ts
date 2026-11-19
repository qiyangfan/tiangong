import { describe, expect, it } from 'vitest';
import type { SettingItem, UploadResponse } from '@tiangong/contracts';
import { type FileObject } from '@prisma/client';
import { adminAuth, nopermAuth, prisma, testHttp } from './context';

const codeOf = (body: unknown): string => (body as { code: string }).code;

function dataOf<T>(body: unknown): T {
  return (body as { data: T }).data;
}

const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('tiangong-it-fixture'),
]);

/** 上传用例产生的文件 id，供下载授权与删除用例引用。 */
const state = { uploadedId: 0 };

function download(id: number) {
  return testHttp()
    .get(`/api/v1/files/${id}/download`)
    .set(adminAuth())
    .responseType('arraybuffer');
}

/** 存储键服务端生成：随机 hex + 日期分区，不包含原始文件名的任何分量。 */
async function expectServerGeneratedStorageKey(id: number): Promise<void> {
  const meta = await findFileObject(id);
  expect(meta.storageKey).toMatch(/^2\d{3}\/\d{2}\/\d{2}\/[0-9a-f]{32}\.png$/);
  expect(meta.createdBy).toBeTruthy();
}

/** 落库元数据：存储键与所有者在响应体不回传，只能读库校验。 */
async function findFileObject(id: number): Promise<FileObject> {
  const row = await prisma.fileObject.findUnique({ where: { id } });
  if (!row) {
    throw new Error(`file_object ${id} not persisted`);
  }
  return row;
}

function upload(filename: string, contentType: string, content: Buffer = PNG_BYTES) {
  return testHttp()
    .post('/api/v1/files')
    .set(adminAuth())
    .attach('file', content, { filename, contentType });
}

/** 下载流与上传字节一致，且以 attachment + UTF-8 文件名回传。 */
async function expectDownloadMatches(id: number): Promise<void> {
  const down = await download(id);
  expect(down.status).toBe(200);
  expect(down.headers['content-type']).toBe('image/png');
  expect(Buffer.from(down.body as ArrayBuffer).equals(PNG_BYTES)).toBe(true);
  expect(down.headers['content-disposition']).toContain("filename*=UTF-8''");
}

async function uploadOk(filename: string): Promise<UploadResponse> {
  const res = await upload(filename, 'image/png');
  expect(res.status).toBe(201);
  return dataOf<UploadResponse>(res.body);
}

async function findUploadLimitSetting(): Promise<SettingItem> {
  const list = await testHttp().get('/api/v1/settings').set(adminAuth());
  const setting = dataOf<SettingItem[]>(list.body).find(
    (item) => item.settingKey === 'sys.file.maxSizeMb',
  );
  if (!setting) {
    throw new Error('settings missing sys.file.maxSizeMb');
  }
  return setting;
}

async function setUploadLimit(settingsId: number, value: string): Promise<void> {
  const res = await testHttp()
    .put(`/api/v1/settings/${settingsId}`)
    .set(adminAuth())
    .send({ value });
  expect(res.status).toBe(200);
}

describe('文件模块：上传与下载', () => {
  it('上传成功：随机存储键 + 元数据（ID/类型/大小/所有者）+ 下载流字节一致', async () => {
    const uploaded = await uploadOk('测试图.png');
    state.uploadedId = uploaded.id;
    expect(uploaded.originalName).toBe('测试图.png');
    expect(uploaded.sizeBytes).toBe(PNG_BYTES.length);
    expect(uploaded.url).toBe(`/api/v1/files/${uploaded.id}/download`);

    await expectServerGeneratedStorageKey(uploaded.id);
    await expectDownloadMatches(uploaded.id);
  });

  it('路径遍历文件名被剥离为 basename，写不进存储目录之外', async () => {
    const uploaded = await uploadOk('../../evil.png');
    expect(uploaded.originalName).toBe('evil.png');
  });

  it('无权限用户上传/下载被 403 拒绝（授权下载验收）', async () => {
    const up = await testHttp()
      .post('/api/v1/files')
      .set(nopermAuth())
      .attach('file', PNG_BYTES, { filename: 'x.png', contentType: 'image/png' });
    expect(up.status).toBe(403);
    expect(codeOf(up.body)).toBe('AUTH_FORBIDDEN');

    const down = await testHttp()
      .get(`/api/v1/files/${state.uploadedId}/download`)
      .set(nopermAuth());
    expect(down.status).toBe(403);
    expect(codeOf(down.body)).toBe('AUTH_FORBIDDEN');
  });
});

describe('文件模块：类型与大小限制', () => {
  it.each([
    { label: '扩展名不在白名单', filename: 'evil.exe', contentType: 'application/x-msdownload' },
    { label: 'Content-Type 与扩展名冲突', filename: 'note.png', contentType: 'text/plain' },
  ])('$label 返回 415 FILE_TYPE_REJECTED', async ({ filename, contentType }) => {
    const up = await upload(filename, contentType, Buffer.from('MZfake'));
    expect(up.status).toBe(415);
    expect(codeOf(up.body)).toBe('FILE_TYPE_REJECTED');
  });

  it('缺 file 字段返回 400 VALIDATION_ERROR', async () => {
    const res = await testHttp().post('/api/v1/files').set(adminAuth());
    expect(res.status).toBe(400);
    expect(codeOf(res.body)).toBe('VALIDATION_ERROR');
  });

  it('超过系统参数上限返回 413 FILE_TOO_LARGE（设置读缓存生效）', async () => {
    const setting = await findUploadLimitSetting();
    await setUploadLimit(setting.id, '1');
    const big = Buffer.alloc(1.5 * 1024 * 1024, 0x61);
    const up = await upload('big.png', 'image/png', big);
    expect(up.status).toBe(413);
    expect(codeOf(up.body)).toBe('FILE_TOO_LARGE');
    await setUploadLimit(setting.id, '20');
  });
});

describe('文件模块：删除', () => {
  it('删除后元数据消失且下载 404 FILE_NOT_FOUND', async () => {
    const uploaded = await uploadOk('todelete.png');
    const del = await testHttp().delete(`/api/v1/files/${uploaded.id}`).set(adminAuth());
    expect(del.status).toBe(200);
    const down = await testHttp().get(`/api/v1/files/${uploaded.id}/download`).set(adminAuth());
    expect(down.status).toBe(404);
    expect(codeOf(down.body)).toBe('FILE_NOT_FOUND');
    state.uploadedId = 0;
  });
});
