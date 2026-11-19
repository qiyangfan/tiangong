import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { reportError } from '@/utils/global-error';

type AuthStore = ReturnType<typeof useAuthStore>;

/** 公共页分流：返回需要跳转的目标，放行时为 null。 */
function publicRedirect(to: RouteLocationNormalized, auth: AuthStore): RouteLocationRaw | null {
  return to.path === '/login' && auth.isLoggedIn ? { path: '/' } : null;
}

/** 未认证时转登录页并带回跳地址；根路径不携带 redirect。 */
function toLogin(to: RouteLocationNormalized): RouteLocationRaw {
  return {
    path: '/login',
    query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
    replace: true,
  };
}

/** 首次导航装载动态路由；菜单加载失败时中止导航留在原地。 */
async function loadDynamicRoutes(auth: AuthStore): Promise<boolean> {
  try {
    await auth.ensureRoutes();
    return true;
  } catch (err) {
    // 菜单加载失败多为瞬时故障：中止导航留在原地（URL 不变可重试）；
    // 会话失效的跳转由 request 层终局 401 语义负责，此处不重复处理
    reportError(err, 'router:ensureRoutes');
    return false;
  }
}

/**
 * 全局守卫（动态路由三步曲的调度方）：
 * 1. 会话缺失时经 refresh Cookie 恢复（页面刷新场景）；
 * 2. 首次进入时 getInfo → generateRoutes → addRoute，然后 replace 重放目标路由。
 */
export function setupGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore();
    // 会话恢复先行：已登录用户整页落到 /login（内存 token 空、refresh Cookie 有效）
    // 也必须先恢复再分流，否则会被留在登录页。tryRestore 内部防重入，无 Cookie 只探测一次。
    const restored = await auth.tryRestore();

    if (to.meta.public) {
      return publicRedirect(to, auth) ?? true;
    }
    if (!restored) {
      return toLogin(to);
    }
    if (auth.routesAdded) {
      return true;
    }
    // addRoute 不影响本次导航匹配，replace 重放以命中新路由；
    // 仅首次装路由后重放，否则每次导航都会再重定向一次自身
    return (await loadDynamicRoutes(auth)) ? { ...to, replace: true } : false;
  });
}
