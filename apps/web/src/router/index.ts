import { createRouter, createWebHistory } from 'vue-router';
import { constantRoutes } from './routes';
import { setupGuard } from './guard';
import { reportError } from '@/utils/global-error';

export const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes,
});

setupGuard(router);
// 导航链路异常（异步组件加载失败、守卫抛错等）统一走全局异常通道
router.onError((error) => reportError(error, 'router'));
