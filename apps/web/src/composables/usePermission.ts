import { useAuthStore } from '@/stores/auth';

/** TS 侧权限判断（v-permission 指令与页面逻辑共用同一实现）。 */
export function checkPermi(perms: string | string[]): boolean {
  return useAuthStore().hasPermi(perms);
}
