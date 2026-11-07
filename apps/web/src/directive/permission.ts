import type { App, Directive } from 'vue';
import { checkPermi } from '@/composables/usePermission';

/**
 * v-permission="'system:user:create'" / v-permission="['a','b']"
 * 无权限时移除节点（RuoYi v-hasPermi 语义；仅控显隐，真正的鉴权在 API 层）。
 */
const permissionDirective: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    if (!checkPermi(binding.value)) {
      el.parentNode?.removeChild(el);
    }
  },
};

export function setupPermissionDirective(app: App): void {
  app.directive('permission', permissionDirective);
}
