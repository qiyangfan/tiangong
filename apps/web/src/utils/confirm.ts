import { ElMessageBox } from 'element-plus';
import { i18n } from '@/locales';

/**
 * 确认框单源（UI_STYLEGUIDE 标准件）：type 与按钮文案全仓统一，调用方只传内容文案。
 * 用户取消时 reject，调用方沿用 `try { await confirmBox(...) } catch { return }` 模式。
 */
export function confirmBox(content: string): Promise<void> {
  const { t } = i18n.global;
  return ElMessageBox.confirm(content, t('common.tip'), {
    type: 'warning',
    confirmButtonText: t('common.confirm'),
    cancelButtonText: t('common.cancel'),
  }).then(() => undefined);
}

/** 删除类确认：全仓统一的删除确认框（内容固定 common.confirmDelete）。 */
export function confirmDelete(): Promise<void> {
  return confirmBox(i18n.global.t('common.confirmDelete'));
}
