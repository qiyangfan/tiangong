import type {
  CreateSettingRequest,
  SettingItem,
  SettingListQuery,
  UpdateSettingRequest,
} from '@tiangong/contracts';
import { http, type QueryParams } from '@/utils/request';

export function apiListSettings(query: SettingListQuery): Promise<SettingItem[]> {
  const params: QueryParams = { keyword: query.keyword };
  return http.get('/settings', { params });
}

export function apiCreateSetting(data: CreateSettingRequest): Promise<SettingItem> {
  return http.post('/settings', data);
}

export function apiUpdateSetting(id: number, data: UpdateSettingRequest): Promise<SettingItem> {
  return http.put(`/settings/${id}`, data);
}

export function apiDeleteSetting(id: number): Promise<void> {
  return http.delete(`/settings/${id}`);
}
