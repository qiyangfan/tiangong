import type {
  LoginLogItem,
  LoginLogQuery,
  OperLogItem,
  OperLogQuery,
  PageResult,
} from '@tiangong/contracts';
import { http, type QueryParams } from '@/utils/request';

function operParams(query: OperLogQuery): QueryParams {
  return {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword,
    username: query.username,
    status: query.status,
    businessType: query.businessType,
  };
}

function loginParams(query: LoginLogQuery): QueryParams {
  return {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword,
    username: query.username,
    status: query.status,
  };
}

export function apiListOperLogs(query: OperLogQuery): Promise<PageResult<OperLogItem>> {
  return http.get('/oper-logs', { params: operParams(query) });
}

export function apiListLoginLogs(query: LoginLogQuery): Promise<PageResult<LoginLogItem>> {
  return http.get('/login-logs', { params: loginParams(query) });
}
