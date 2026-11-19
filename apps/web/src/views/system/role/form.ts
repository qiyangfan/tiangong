/**
 * 角色页表单模型：规则、回填与契约转换集中在同目录，页面只做编排。
 * 规则文案走 useI18n().t，与页面同一翻译口径。
 */
import { reactive, type InjectionKey } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormRules } from 'element-plus';
import type { CreateRoleRequest, RoleItem, UpdateRoleRequest } from '@tiangong/contracts';

type Translate = ReturnType<typeof useI18n>['t'];

/** 角色表单状态：编辑态携带是否内置（内置角色锁定 roleKey 且提交时忽略）。 */
export interface RoleDialogState {
  visible: boolean;
  editingId: number | null;
  isBuiltin: boolean;
}

export interface RoleForm {
  name: string;
  roleKey: string;
  sort: number;
  enabled: boolean;
  remark: string;
  permissionIds: number[];
}

/** 页面 provide、字段组件 inject 的角色表单对象。 */
export const roleFormKey: InjectionKey<RoleForm> = Symbol('roleForm');

export function createRoleForm(): RoleForm {
  return reactive<RoleForm>({
    name: '',
    roleKey: '',
    sort: 0,
    enabled: true,
    remark: '',
    permissionIds: [],
  });
}

export function buildRoleRules(t: Translate): FormRules {
  return {
    name: [
      {
        required: true,
        message: () => t('common.pleaseInput', { field: t('role.name') }),
        trigger: 'blur',
      },
    ],
    roleKey: [
      {
        required: true,
        message: () => t('common.pleaseInput', { field: t('role.roleKey') }),
        trigger: 'blur',
      },
      { pattern: /^[a-z][a-z0-9_]{1,99}$/, message: 'lower snake_case', trigger: 'blur' },
    ],
  };
}

/** 新建传 null；权限另行拉取，此处不预填。 */
export function fillRoleForm(form: RoleForm, row: RoleItem | null): void {
  Object.assign(form, {
    name: row?.name ?? '',
    roleKey: row?.roleKey ?? '',
    sort: row?.sort ?? 0,
    enabled: row?.enabled ?? true,
    remark: row?.remark ?? '',
    permissionIds: [],
  });
}

/** 新建请求：备注留空即省略。 */
export function toCreateRole(form: RoleForm): CreateRoleRequest {
  return {
    name: form.name,
    roleKey: form.roleKey,
    sort: form.sort,
    enabled: form.enabled,
    remark: form.remark === '' ? undefined : form.remark,
    permissionIds: form.permissionIds,
  };
}

/** 更新请求：内置角色不改 roleKey；备注清空即置 null。 */
export function toUpdateRole(form: RoleForm, isBuiltin: boolean): UpdateRoleRequest {
  return {
    name: form.name,
    ...(isBuiltin ? {} : { roleKey: form.roleKey }),
    sort: form.sort,
    enabled: form.enabled,
    remark: form.remark === '' ? null : form.remark,
  };
}

/** 搜索区状态筛选：true/false 与列表查询同一取值口径，清除即不过滤。 */
export const ENABLED_FILTER_OPTIONS = [
  { labelKey: 'common.enabled', value: true },
  { labelKey: 'common.disabled', value: false },
];
