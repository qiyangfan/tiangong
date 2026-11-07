import type {
  CreateDictItemRequest,
  CreateDictTypeRequest,
  DictItem,
  DictItemListQuery,
  DictOption,
  DictTypeItem,
  DictTypeListQuery,
  PageResult,
  UpdateDictItemRequest,
  UpdateDictTypeRequest,
} from '@tiangong/contracts';
import { http, type QueryParams } from '@/utils/request';

function typeParams(query: DictTypeListQuery): QueryParams {
  return {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword,
    enabled: query.enabled === undefined ? undefined : String(query.enabled),
  };
}

export function apiListDictTypes(query: DictTypeListQuery): Promise<PageResult<DictTypeItem>> {
  return http.get('/dict-types', { params: typeParams(query) });
}

export function apiCreateDictType(data: CreateDictTypeRequest): Promise<DictTypeItem> {
  return http.post('/dict-types', data);
}

export function apiUpdateDictType(id: number, data: UpdateDictTypeRequest): Promise<DictTypeItem> {
  return http.patch(`/dict-types/${id}`, data);
}

export function apiDeleteDictType(id: number): Promise<void> {
  return http.delete(`/dict-types/${id}`);
}

/** 某类型下全部字典项（裸数组，非分页）。 */
export function apiListDictItems(query: DictItemListQuery): Promise<DictItem[]> {
  const params: QueryParams = {
    enabled: query.enabled === undefined ? undefined : String(query.enabled),
  };
  return http.get(`/dict-types/${query.dictKey}/items`, { params });
}

export function apiCreateDictItem(data: CreateDictItemRequest): Promise<DictItem> {
  return http.post('/dict-items', data);
}

export function apiUpdateDictItem(id: number, data: UpdateDictItemRequest): Promise<DictItem> {
  return http.patch(`/dict-items/${id}`, data);
}

export function apiDeleteDictItem(id: number): Promise<void> {
  return http.delete(`/dict-items/${id}`);
}

/** useDict 消费：登录即可读，无需字典管理权限。 */
export function apiGetDictOptions(dictKey: string): Promise<DictOption[]> {
  return http.get(`/dicts/${dictKey}/options`);
}
