import type { FileItem, FileListQuery, PageResult, UploadResponse } from '@tiangong/contracts';
import { http, type QueryParams } from '@/utils/request';

function toParams(query: FileListQuery): QueryParams {
  return {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword,
    suffix: query.suffix,
  };
}

export function apiListFiles(query: FileListQuery): Promise<PageResult<FileItem>> {
  return http.get('/files', { params: toParams(query) });
}

export function apiUploadFile(file: File): Promise<UploadResponse> {
  const data = new FormData();
  data.append('file', file);
  // FormData 由 axios 自动生成 multipart 边界，不可手动指定 Content-Type
  return http.post('/files', data);
}

/** 授权下载：带 token 拉取二进制流再触发浏览器保存（下载端点非 envelope）。 */
export async function apiDownloadFile(item: FileItem): Promise<void> {
  const blob = await http.get<Blob>(`/files/${item.id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = item.originalName;
  a.click();
  URL.revokeObjectURL(url);
}

export function apiDeleteFile(id: number): Promise<void> {
  return http.delete(`/files/${id}`);
}
