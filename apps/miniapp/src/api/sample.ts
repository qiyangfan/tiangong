import type {
  CreateSampleRequest,
  PageResult,
  SampleRecordItem,
  SampleRecordQuery,
  UpdateSampleRequest,
} from '@tiangong/contracts';
import { http } from '@/utils/request';

export function apiListSamples(query: SampleRecordQuery): Promise<PageResult<SampleRecordItem>> {
  return http.get(`/samples?page=${query.page}&pageSize=${query.pageSize}`);
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
