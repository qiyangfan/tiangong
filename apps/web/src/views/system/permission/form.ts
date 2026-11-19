/** 权限点表单规则：页面只做编排，文案走页面同一 useI18n 口径。 */
import type { useI18n } from 'vue-i18n';
import type { FormRules } from 'element-plus';

type Translate = ReturnType<typeof useI18n>['t'];

export function buildPermissionRules(t: Translate): FormRules {
  return {
    resource: [
      {
        required: true,
        message: () => t('common.pleaseInput', { field: t('permission.resource') }),
        trigger: 'blur',
      },
      { pattern: /^[a-z][a-z0-9-]{1,63}$/, message: 'lower kebab-case', trigger: 'blur' },
    ],
    action: [
      {
        required: true,
        message: () => t('common.pleaseInput', { field: t('permission.action') }),
        trigger: 'blur',
      },
      { pattern: /^[a-z][a-z0-9-]{1,31}$/, message: 'lower kebab-case', trigger: 'blur' },
    ],
    name: [
      {
        required: true,
        message: () => t('common.pleaseInput', { field: t('permission.name') }),
        trigger: 'blur',
      },
    ],
  };
}
