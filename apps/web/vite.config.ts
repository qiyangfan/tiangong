import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // 显式进程环境优先（vite 8 loadEnv 不合并 process.env；e2e 依赖 env 注入切换代理目标）
  const target = process.env.VITE_DEV_PROXY_TARGET ?? env.VITE_DEV_PROXY_TARGET ?? 'http://localhost:3000';
  return {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // dev 联调：浏览器同源请求 /api/*，由 vite 转发到本地 API（Cookie 随同源自动携带）
      proxy: {
        '/api': { target, changeOrigin: true },
      },
    },
  };
});
