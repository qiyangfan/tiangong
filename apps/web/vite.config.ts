import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import istanbul from 'vite-plugin-istanbul';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // 显式进程环境优先（vite 8 loadEnv 不合并 process.env；e2e 依赖 env 注入切换代理目标）
  const target =
    process.env['VITE_DEV_PROXY_TARGET'] ?? env['VITE_DEV_PROXY_TARGET'] ?? 'http://localhost:3000';
  // e2e 覆盖率：仅在显式开启时插桩，日常 dev/build 产物不含探针
  const coveragePlugin =
    process.env['VITE_COVERAGE'] === '1'
      ? [
          istanbul({
            include: ['src/**/*.ts', 'src/**/*.vue'],
            exclude: ['src/**/__tests__/**'],
            extension: ['.ts', '.vue'],
            requireEnv: false,
          }),
        ]
      : [];
  return {
    plugins: [vue(), tailwindcss(), ...coveragePlugin],
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
