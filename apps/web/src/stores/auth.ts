import { defineStore } from 'pinia';
import type { CurrentUser, LoginRequest, MenuNode, Profile } from '@tiangong/contracts';
import { ElMessage } from 'element-plus';
import {
  apiChangePassword,
  apiGetMenus,
  apiGetPermissions,
  apiGetProfile,
  apiLogin,
  apiLogout,
  apiRefresh,
} from '@/api/auth';
import { i18n } from '@/locales';
import { generateRoutes } from '@/router/generator';
import { router } from '@/router';

/** 会话与权限上下文：access token 仅驻内存（刷新页经 refresh Cookie 恢复）。 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: null as string | null,
    user: null as CurrentUser | null,
    profile: null as Profile | null,
    menus: [] as MenuNode[],
    permissions: [] as string[],
    routesAdded: false,
    /** 每次页面生命周期只尝试一次 refresh 恢复，防止导航循环打刷新接口。 */
    restoreAttempted: false,
    /** 过期提示一次性防抖（并发 401 只弹一次）。 */
    expiredNotified: false,
  }),
  getters: {
    isLoggedIn: (state) => state.accessToken !== null,
    displayName: (state) =>
      state.profile?.nickname ?? state.user?.nickname ?? state.user?.username ?? '',
  },
  actions: {
    async login(req: LoginRequest): Promise<void> {
      const res = await apiLogin({ ...req, client: 'web' });
      this.accessToken = res.accessToken;
      this.user = res.user;
      this.permissions = res.user.permissions;
      this.restoreAttempted = true;
      this.expiredNotified = false;
    },

    /** 用 refresh Cookie 换新 access token。 */
    async refreshAccessToken(): Promise<boolean> {
      try {
        const res = await apiRefresh({ client: 'web' });
        this.accessToken = res.accessToken;
        return true;
      } catch {
        return false;
      }
    },

    /** 页面刷新后的会话恢复：refresh → 重建权限/菜单/资料上下文。 */
    async tryRestore(): Promise<boolean> {
      if (this.accessToken !== null) {
        return true;
      }
      if (this.restoreAttempted) {
        return false;
      }
      this.restoreAttempted = true;
      const ok = await this.refreshAccessToken();
      if (!ok) {
        return false;
      }
      try {
        const [menus, perms, profile] = await Promise.all([
          apiGetMenus(),
          apiGetPermissions(),
          apiGetProfile(),
        ]);
        this.menus = menus;
        this.permissions = perms.permissions;
        this.profile = profile;
        return true;
      } catch {
        this.reset();
        return false;
      }
    },

    /** 动态路由三步曲第三步：确保菜单就绪 → 后端菜单树 → addRoute（含 404 兜底）。 */
    async ensureRoutes(): Promise<void> {
      if (this.routesAdded) {
        return;
      }
      // 登录 action 只带回用户与权限；菜单树在此统一拉取（含无权限用户的合法空树）
      if (this.menus.length === 0) {
        this.menus = await apiGetMenus();
      }
      for (const route of generateRoutes(this.menus)) {
        router.addRoute(route);
      }
      router.addRoute({ path: '/:pathMatch(.*)*', name: 'catch-all', redirect: '/404' });
      this.routesAdded = true;
    },

    async logout(): Promise<void> {
      try {
        await apiLogout({ client: 'web' });
      } finally {
        this.reset();
        await router.push('/login');
      }
    },

    /**
     * 会话彻底失效（终局 401）：清理并引导重登，提示一次性。
     * 终局码区分文案：停用/删除（实时查库拒绝）明示联系管理员，避免误导用户重登；
     * 其余（过期/失效）提示重新登录。access 与 refresh 同时失效的窗口期只能提示过期
     * （refresh 端点按设计不泄露账号状态），重登时会得到明确停用提示。
     */
    async sessionExpired(code?: string): Promise<void> {
      const hadSession = this.accessToken !== null || this.user !== null;
      this.reset();
      if (hadSession && !this.expiredNotified) {
        this.expiredNotified = true;
        const disabled = code === 'AUTH_ACCOUNT_DISABLED' || code === 'AUTH_UNAUTHENTICATED';
        ElMessage.warning(i18n.global.t(disabled ? 'error.accountDisabled' : 'layout.sessionExpired'));
      }
      await router.push('/login');
    },

    reset(): void {
      this.accessToken = null;
      this.user = null;
      this.profile = null;
      this.menus = [];
      this.permissions = [];
      this.routesAdded = false;
      this.restoreAttempted = false;
    },

    /** 权限判断：超管通配直通；与后端默认拒绝语义一致。 */
    hasPermi(perms: string | string[]): boolean {
      const list = Array.isArray(perms) ? perms : [perms];
      if (list.length === 0) {
        return true;
      }
      return this.permissions.includes('*:*:*') || list.some((p) => this.permissions.includes(p));
    },

    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
      await apiChangePassword({ oldPassword, newPassword });
      // 改密后服务端全端下线，本地会话一并作废
      this.reset();
      await router.push('/login');
    },

    async reloadProfile(): Promise<void> {
      this.profile = await apiGetProfile();
    },
  },
});
