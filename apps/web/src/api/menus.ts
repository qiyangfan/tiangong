import type {
  CreateMenuRequest,
  MenuNodeWithMeta,
  MenuTree,
  UpdateMenuRequest,
} from '@tiangong/contracts';
import { http } from '@/utils/request';

export function apiGetMenuTree(): Promise<MenuTree> {
  return http.get('/menus');
}

export function apiCreateMenu(data: CreateMenuRequest): Promise<MenuNodeWithMeta> {
  return http.post('/menus', data);
}

export function apiUpdateMenu(id: number, data: UpdateMenuRequest): Promise<MenuNodeWithMeta> {
  return http.put(`/menus/${id}`, data);
}

export function apiDeleteMenu(id: number): Promise<void> {
  return http.delete(`/menus/${id}`);
}
