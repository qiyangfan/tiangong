/** 时间展示单源：页面禁止裸渲染 ISO 串，一律经本模块格式化。 */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** ISO 8601 UTC → 本地 'YYYY-MM-DD HH:mm:ss'；空值/非法值返回 '-'。 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return '-';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '-';
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** ISO 8601 UTC → 本地 'YYYY-MM-DD'；空值/非法值返回 '-'。 */
export function formatDate(iso: string | null | undefined): string {
  const full = formatDateTime(iso);
  return full === '-' ? '-' : full.slice(0, 10);
}

/** 毫秒耗时 → '12 ms' / '1.2 s'。 */
export function formatCost(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}
