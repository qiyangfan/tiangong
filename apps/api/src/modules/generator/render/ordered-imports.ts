/** 与 Array#sort 默认行为一致的 UTF-16 码元序（产物字节稳定）。 */
function byCodeUnit(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}

/** 生成的 import 列表：码元序排序后按 `,\n  ` 连接。 */
export function orderedImports(list: string[]): string {
  const sorted = [...list].sort(byCodeUnit);
  return sorted.join(',\n  ');
}
