/** 全局 router 实例的惰性绑定：store 只依赖本模块，避免 stores/auth ↔ router/index 静态循环。 */
import type { Router } from 'vue-router';

let instance: Router | null = null;

/** 由 router/index 在实例创建后调用。 */
export function bindRouter(router: Router): void {
  instance = router;
}

export function useRouterInstance(): Router {
  if (instance === null) {
    throw new Error('router is not bound yet');
  }
  return instance;
}
