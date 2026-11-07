/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API 基础路径（dev 走同源代理，生产走 nginx 反代）。 */
  readonly VITE_API_BASE_URL: string;
  /** dev 代理目标（vite.config.ts 消费）。 */
  readonly VITE_DEV_PROXY_TARGET?: string;
}
