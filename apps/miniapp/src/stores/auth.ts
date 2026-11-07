import { defineStore } from 'pinia';
import type { Profile } from '@tiangong/contracts';
import { apiLogout, apiProfile } from '@/api/auth';
import { clearSession, getStoredUser, storeSession, type StoredUser } from '@/utils/auth';

/**
 * 会话态单源：登录写入、身份读取、profile 拉取、登出清理。
 * 凭据持久化仍收敛于 utils/auth.ts，本 store 只维护其上的响应式状态；
 * 401 终局恢复（request.ts）不经此 store，避免模块环。
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as StoredUser | null,
    profile: null as Profile | null,
  }),
  getters: {
    /** 以 store 内身份为准；冷启动需先 restoreUser() 从存储恢复。 */
    isLoggedIn: (state) => state.user !== null,
  },
  actions: {
    /** 登录成功后写入会话并作废上一会话残留态（终局 401 路径不经 logout，profile 可能仍挂旧账号）。 */
    applySession(accessToken: string, refreshToken: string, user: StoredUser): void {
      storeSession(accessToken, refreshToken, user);
      this.user = user;
      this.profile = null;
    },
    /** 从存储恢复会话身份（页面 onShow 时兜底，存储在启动期仍是事实源）。 */
    restoreUser(): void {
      this.user = getStoredUser();
    },
    async refreshProfile(): Promise<void> {
      this.profile = await apiProfile();
    },
    /** 退出登录：服务端吊销尽力而为，本地会话必清理并回登录页。 */
    async logout(): Promise<void> {
      try {
        await apiLogout();
      } catch {
        // 吊销失败（如 refresh 已失效）不阻断本地清理
      }
      clearSession();
      this.user = null;
      this.profile = null;
      uni.reLaunch({ url: '/pages/login/index' });
    },
  },
});
