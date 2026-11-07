import { createSSRApp } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';
import { i18n } from '@/locales';
import { useAppStore } from '@/stores/app';
import { reportError } from '@/utils/global-error';
import 'uno.css';

export function createApp() {
  const app = createSSRApp(App);
  // 装配顺序对齐 web：pinia 最先，持久化语言在 use(i18n) 前恢复，防首帧文案闪烁
  app.use(createPinia());
  useAppStore().init();
  app.use(i18n);
  // Vue 层异常（渲染/setup/事件回调）兜底；uni 运行时错误由 App.vue 的 onError 收口
  app.config.errorHandler = (err, _instance, info) => {
    reportError(err, `vue:${info}`);
  };
  return {
    app,
  };
}
