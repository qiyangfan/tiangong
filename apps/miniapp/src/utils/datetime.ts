/** 时间展示单源：页面禁止裸渲染 ISO 串，一律经本模块格式化（dayjs，与 web 同实现同签名）。 */
import dayjs from 'dayjs';

/** ISO 8601 UTC → 本地 'YYYY-MM-DD HH:mm:ss'；空值/非法值返回 '-'。 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return '-';
  }
  const d = dayjs(iso);
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : '-';
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
