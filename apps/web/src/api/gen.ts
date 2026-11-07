import type {
  GenDefinitionItem,
  GenDefinitionListQuery,
  GenDefinitionRequest,
  GenDefinitionUpdate,
  GenPreviewFile,
} from '@tiangong/contracts';
import { http, type QueryParams } from '@/utils/request';

export function apiListGenDefinitions(keyword: string): Promise<GenDefinitionItem[]> {
  const query: GenDefinitionListQuery = { keyword: keyword === '' ? undefined : keyword };
  return http.get('/gen-definitions', { params: query as QueryParams });
}

export function apiCreateGenDefinition(data: GenDefinitionRequest): Promise<GenDefinitionItem> {
  return http.post('/gen-definitions', data);
}

export function apiUpdateGenDefinition(
  id: number,
  data: GenDefinitionUpdate,
): Promise<GenDefinitionItem> {
  return http.patch(`/gen-definitions/${id}`, data);
}

export function apiDeleteGenDefinition(id: number): Promise<void> {
  return http.delete(`/gen-definitions/${id}`);
}

/** 草稿预览：以当前表单内容渲染，不落库。 */
export function apiPreviewGenDraft(data: GenDefinitionRequest): Promise<GenPreviewFile[]> {
  return http.post('/gen-definitions/preview', data);
}

/** 已保存定义预览：与 CLI 落盘字节一致。 */
export function apiPreviewGenById(id: number): Promise<GenPreviewFile[]> {
  return http.get(`/gen-definitions/${id}/preview`);
}
