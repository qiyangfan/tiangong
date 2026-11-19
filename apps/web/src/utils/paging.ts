/** 分页展示单源：删除后的页码回退判定集中在此，避免各页各写一份边界规则。 */

/** 删除成功后是否回退一页：当前页只剩被删的那一行且不在首页时回退，避免停留在空页。 */
export function shouldStepBack(page: number, rowCount: number): boolean {
  return rowCount === 1 && page > 1;
}
