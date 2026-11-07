import { i18n } from '@/locales';

/** 提示节流窗口：窗口内的后续异常只进控制台，不重复弹提示。 */
const NOTIFY_THROTTLE_MS = 3000;

let lastNotifiedAt = 0;

/** 全局异常兜底单点：原始异常全量进控制台（保留堆栈），用户提示节流。 */
export function reportError(err: unknown, source: string): void {
  console.error(`[global-error][${source}]`, err);
  const now = Date.now();
  if (now - lastNotifiedAt < NOTIFY_THROTTLE_MS) {
    return;
  }
  lastNotifiedAt = now;
  uni.showToast({ title: i18n.global.t('common.unexpectedError'), icon: 'none' });
}
