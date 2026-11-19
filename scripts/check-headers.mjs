// 安全响应头冒烟：以真实部署（nginx 镜像）返回头为准，缺失即失败。
const url = process.argv[2];
if (url === undefined) {
  console.error('用法: node scripts/check-headers.mjs <url>');
  process.exit(2);
}

const response = await fetch(url, { redirect: 'manual' });
const headers = response.headers;

const required = [
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
];
const missing = required.filter((name) => !headers.get(name));
const csp = headers.get('content-security-policy') ?? '';
if (!csp.includes("default-src 'self'"))
  missing.push("content-security-policy(default-src 'self')");

if (response.status >= 400) {
  console.error(`HTTP ${response.status} from ${url}`);
}
if (missing.length > 0 || response.status >= 400) {
  console.error(`安全响应头检查失败：${missing.join(', ')}`);
  process.exit(1);
}
console.log(`安全响应头检查通过：${url} (HTTP ${response.status})`);
