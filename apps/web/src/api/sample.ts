import type {
  CreateSampleRequest,
  PageResult,
  SampleRecordItem,
  SampleRecordQuery,
  UpdateSampleRequest,
} from '@tiangong/contracts';
import { http, type QueryParams } from '@/utils/request';

function toParams(query: SampleRecordQuery): QueryParams {
  return {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword,
    category: query.category,
    enabled: query.enabled === undefined ? undefined : String(query.enabled),
  };
}

export function apiListSamples(query: SampleRecordQuery): Promise<PageResult<SampleRecordItem>> {
  return http.get('/samples', { params: toParams(query) });
}

export function apiGetSample(id: number): Promise<SampleRecordItem> {
  return http.get(`/samples/${id}`);
}

export function apiCreateSample(data: CreateSampleRequest): Promise<SampleRecordItem> {
  return http.post('/samples', data);
}

export function apiUpdateSample(id: number, data: UpdateSampleRequest): Promise<SampleRecordItem> {
  return http.put(`/samples/${id}`, data);
}

export function apiDeleteSample(id: number): Promise<void> {
  return http.delete(`/samples/${id}`);
}
