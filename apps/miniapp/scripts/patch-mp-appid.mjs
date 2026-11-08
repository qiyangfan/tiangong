import { readFileSync, writeFileSync, existsSync } from 'node:fs';

/**
 * 构建后把环境变量 MP_WEIXIN_APPID 注入 dist 的 project.config.json。
 * manifest.json 是静态文件引用不了环境变量，仓库内 appid 恒为官方占位 touristappid；
 * 测试号/正式 appid 属人员与环境相关配置，一律经 .env 注入（未设置则保持占位，构建不失败）。
 */
const CONFIG_PATH = new URL('../dist/build/mp-weixin/project.config.json', import.meta.url);

try {
  process.loadEnvFile();
} catch {
  // .env 不存在时静默跳过（CI 等场景经真实环境变量注入）
}

const appid = process.env.MP_WEIXIN_APPID;
if (!appid) {
  console.log('[patch-mp-appid] MP_WEIXIN_APPID 未设置，保留 touristappid 占位');
  process.exit(0);
}
if (!existsSync(CONFIG_PATH)) {
  console.error('[patch-mp-appid] 未找到产物 project.config.json，请先执行 uni build');
  process.exit(1);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
config.appid = appid;
writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
console.log(`[patch-mp-appid] appid -> ${appid}`);
