/** 用户列表表格的 props 契约（页面传入，表格只负责渲染并向外抛事件）。 */
import type { UserItem } from '@tiangong/contracts';

export interface UserTableProps {
  rows: UserItem[];
  loading: boolean;
}

/** 表格向外抛出的事件：行操作回传整行，页面据此开弹窗或发起删改。 */
export interface UserTableEmits {
  (e: 'edit' | 'resetPassword' | 'delete', row: UserItem): void;
  (e: 'toggleEnabled', row: UserItem, enabled: boolean): void;
}
