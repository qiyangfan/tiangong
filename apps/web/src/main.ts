import { createPinia } from 'pinia';
import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import App from './App.vue';
import { i18n } from './locales';
import { router } from './router';
import { setupPermissionDirective } from './directive/permission';
import { bindTokenBus } from './utils/token-bus';
import { setupGlobalErrorHandlers } from './utils/global-error';
import { useAppStore } from './stores/app';
import { useAuthStore } from './stores/auth';
import './styles/index.css';

const app = createApp(App);
// 全局异常兜底先行注册：后续装配链路（store 恢复、守卫、挂载）的异常同样被收口
setupGlobalErrorHandlers(app);
app.use(createPinia());

// 主题/语言在挂载前恢复，避免闪烁
useAppStore().init();
app.use(i18n);
app.use(ElementPlus);
setupPermissionDirective(app);

// request 层 ← auth store 桥接（避免模块环）
const auth = useAuthStore();
bindTokenBus({
  getToken: () => auth.accessToken,
  refresh: () => auth.refreshAccessToken(),
  onSessionExpired: (code) => {
    void auth.sessionExpired(code);
  },
});

app.use(router);
app.mount('#app');
