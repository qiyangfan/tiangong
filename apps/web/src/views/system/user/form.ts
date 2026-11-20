/**
 * 用户页表单规则与回填模型：页面只做编排，规则/合同转换集中在此。
 * 规则文案走 useI18n().t（不回退 global t），与页面同一翻译口径。
 */
import { reactive, type InjectionKey } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormRules } from 'element-plus';
import { passwordSchema } from '@tiangong/contracts';
import type { UserItem } from '@tiangong/contracts';

/** 与页面同一翻译口径的取词函数。 */
type Translate = ReturnType<typeof useI18n>['t'];

/** 页面 provide、字段组件 inject 的用户表单对象。 */
export const userFormKey: InjectionKey<UserForm> = Symbol('userForm');

export interface UserForm {
  username: string;
  nickname: string;
  password: string;
  email: string;
  phone: string;
  roleIds: number[];
  enabled: boolean;
  remark: string;
}

export interface UserDialogState {
  visible: boolean;
  editingId: number | null;
}

/** 新建用户入参：留空的可选字段省略，与契约 optional 语义对齐。 */
export interface CreateUserBody {
  username: string;
  nickname: string;
  password: string;
  email?: string;
  phone?: string;
  roleIds: number[];
  enabled: boolean;
  remark?: string;
}

/** 更新用户入参：清空的可选字段置 null，与契约 partial 语义对齐。 */
export interface UpdateUserBody {
  nickname: string;
  email: string | null;
  phone: string | null;
  roleIds: number[];
  enabled: boolean;
  remark: string | null;
}

export function createUserForm(): UserForm {
  return reactive<UserForm>({
    username: '',
    nickname: '',
    password: '',
    email: '',
    phone: '',
    roleIds: [],
    enabled: true,
    remark: '',
  });
}

export function buildUserRules(t: Translate): FormRules {
  return {
    username: [
      {
        required: true,
        message: () => t('common.pleaseInput', { field: t('user.username') }),
        trigger: 'blur',
      },
      {
        pattern: /^\w{3,30}$/,
        message: '3-30 chars: letters, digits, underscore',
        trigger: 'blur',
      },
    ],
    nickname: [
      {
        required: true,
        message: () => t('common.pleaseInput', { field: t('user.nickname') }),
        trigger: 'blur',
      },
    ],
    password: [
      {
        required: true,
        message: () => t('common.pleaseInput', { field: t('user.password') }),
        trigger: 'blur',
      },
      {
        validator: (_rule, value: string, callback) => {
          if (value !== '' && !passwordSchema.safeParse(value).success) {
            callback(new Error('8+ chars with letters and digits'));
          } else {
            callback();
          }
        },
        trigger: 'blur',
      },
    ],
    email: [{ type: 'email', message: () => t('user.invalidEmail'), trigger: 'blur' }],
  };
}

/** 空表单与只读展示都经此回填，避免新建/编辑两套字面量。 */
export function fillUserForm(form: UserForm, row: UserItem | null): void {
  Object.assign(form, {
    username: row?.username ?? '',
    nickname: row?.nickname ?? '',
    password: '',
    email: row?.email ?? '',
    phone: row?.phone ?? '',
    roleIds: row?.roles.map((r) => r.id) ?? [],
    enabled: row?.enabled ?? true,
    remark: row?.remark ?? '',
  });
}

export function toCreateUser(form: UserForm): CreateUserBody {
  return {
    username: form.username,
    nickname: form.nickname,
    password: form.password,
    ...(form.email === '' ? {} : { email: form.email }),
    ...(form.phone === '' ? {} : { phone: form.phone }),
    roleIds: form.roleIds,
    enabled: form.enabled,
    ...(form.remark === '' ? {} : { remark: form.remark }),
  };
}

export function toUpdateUser(form: UserForm): UpdateUserBody {
  return {
    nickname: form.nickname,
    email: form.email === '' ? null : form.email,
    phone: form.phone === '' ? null : form.phone,
    roleIds: form.roleIds,
    enabled: form.enabled,
    remark: form.remark === '' ? null : form.remark,
  };
}

/** 重置密码弹窗规则（明文口令强度与新建同口径）。 */
export function buildResetRules(t: Translate): FormRules {
  return {
    newPassword: [
      {
        required: true,
        message: () => t('common.pleaseInput', { field: t('user.newPassword') }),
        trigger: 'blur',
      },
      {
        validator: (_rule, value: string, callback) => {
          if (!passwordSchema.safeParse(value).success) {
            callback(new Error('8+ chars with letters and digits'));
          } else {
            callback();
          }
        },
        trigger: 'blur',
      },
    ],
  };
}
