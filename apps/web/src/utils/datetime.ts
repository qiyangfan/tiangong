/** 时间展示单源：页面禁止裸渲染 ISO 串，一律经本模块格式化（dayjs，两端同实现）。 */
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

/** 字节数 → '512 B' / '1.5 KB' / '230 MB'（三位数以上不留小数）。 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  // 第 i 轮除以 1024 落在 KB/MB/GB 档：1KB ≤ value < 1GB，故至少除一次
  let value = bytes;
  let unit = 'B';
  for (const u of ['KB', 'MB', 'GB']) {
    value /= 1024;
    unit = u;
    if (value < 1024) {
      break;
    }
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${unit}`;
}
