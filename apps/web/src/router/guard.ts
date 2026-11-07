import type { Router } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

/**
 * 全局守卫（动态路由三步曲的调度方）：
 * 1. 会话缺失时经 refresh Cookie 恢复（页面刷新场景）；
 * 2. 首次进入时 getInfo → generateRoutes → addRoute，然后 replace 重放目标路由。
 */
export function setupGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore();
    if (to.meta.public) {
      if (to.path === '/login' && auth.isLoggedIn) {
        return { path: '/' };
      }
      return true;
    }

    const restored = await auth.tryRestore();
    if (!restored) {
      return {
        path: '/login',
        query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
        replace: true,
      };
    }

    if (!auth.routesAdded) {
      await auth.ensureRoutes();
      // addRoute 不影响本次导航匹配，replace 重放以命中新路由
      return { ...to, replace: true };
    }
    return true;
  });
}
