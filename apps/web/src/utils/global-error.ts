import type { App } from 'vue';
import { ElMessage } from 'element-plus';
import { i18n } from '@/locales';

/** 提示节流窗口：窗口内的后续异常只进控制台，不重复弹提示。 */
const NOTIFY_THROTTLE_MS = 3_000;

let lastNotifiedAt = 0;

/**
 * 全局异常兜底单点：原始异常全量进控制台（保留堆栈），用户提示节流。
 * 外部上报渠道（如 Sentry）后续在此收口接入。
 */
export function reportError(err: unknown, source: string): void {
  console.error(`[global-error][${source}]`, err);
  const now = Date.now();
  if (now - lastNotifiedAt < NOTIFY_THROTTLE_MS) {
    return;
  }
  lastNotifiedAt = now;
  ElMessage.error(i18n.global.t('error.unexpected'));
}

/**
 * 全局异常兜底注册：Vue 渲染/生命周期异常、Vue 之外的 Promise 拒绝（含守卫中止）、
 * window 同步错误三入口统一走 reportError。
 * 资源加载失败也触发 error 事件但无错误信息，按事件形态过滤不报。
 */
export function setupGlobalErrorHandlers(app: App): void {
  app.config.errorHandler = (err, _instance, info) => {
    reportError(err, `vue:${info}`);
  };
  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, 'unhandledrejection');
  });
  window.addEventListener('error', (event) => {
    const errEvent = event as ErrorEvent;
    if (typeof errEvent.message === 'string' && errEvent.message !== '') {
      reportError(errEvent.error ?? errEvent.message, 'window.error');
    }
  });
}
