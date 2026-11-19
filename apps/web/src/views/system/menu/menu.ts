/**
 * 菜单页模型：菜单类型文案/标签色、树形选择数据与提交请求组装。
 * 页面只做编排，表格与弹窗共用这里的口径。
 */
import { reactive, type InjectionKey } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CreateMenuRequest, MenuNode, MenuNodeWithMeta } from '@tiangong/contracts';

type Translate = ReturnType<typeof useI18n>['t'];

export interface TreeSelectNode {
  id: number;
  name: string;
  children: TreeSelectNode[];
}

export interface MenuForm {
  parentId: number;
  name: string;
  menuType: CreateMenuRequest['menuType'];
  path: string;
  component: string;
  perms: string;
  icon: string;
  sort: number;
  visible: boolean;
  enabled: boolean;
  remark: string;
}

export interface MenuDialogState {
  visible: boolean;
  editingId: number | null;
}

/** M 目录 / C 菜单 / F 按钮的展示文案。 */
export function menuTypeText(t: Translate, type: MenuNodeWithMeta['menuType']): string {
  if (type === 'M') {
    return t('menu.typeDir');
  }
  return type === 'C' ? t('menu.typeMenu') : t('menu.typeButton');
}

export function menuTypeTag(type: MenuNodeWithMeta['menuType']): 'primary' | 'success' | 'warning' {
  if (type === 'M') {
    return 'primary';
  }
  return type === 'C' ? 'success' : 'warning';
}

/** 上级菜单选择树：根节点 id=0，名称带类型后缀便于区分。 */
export function buildTreeSelectData(t: Translate, nodes: MenuNode[]): TreeSelectNode[] {
  return nodes.map((n) => ({
    id: n.id,
    name: `${n.name}（${menuTypeText(t, n.menuType)}）`,
    children: buildTreeSelectData(t, n.children),
  }));
}

export function rootTreeSelectData(t: Translate, tree: MenuNode[]): TreeSelectNode[] {
  return [{ id: 0, name: t('menu.rootMenu'), children: buildTreeSelectData(t, tree) }];
}

/** 新建表单：默认目录；在目录下新增默认菜单、菜单下默认按钮。 */
/** 子级类型：目录下只能建菜单、菜单下只能建按钮，根级默认目录。 */
function menuTypeOfChild(parent?: MenuNodeWithMeta): CreateMenuRequest['menuType'] {
  if (parent?.menuType === 'M') {
    return 'C';
  }
  return parent?.menuType === 'C' ? 'F' : 'M';
}

export function fillMenuForm(form: MenuForm, parent?: MenuNodeWithMeta): void {
  const childType = menuTypeOfChild(parent);
  Object.assign(form, {
    parentId: parent?.id ?? 0,
    name: '',
    menuType: childType,
    path: '',
    component: '',
    perms: '',
    icon: '',
    sort: 0,
    visible: true,
    enabled: true,
    remark: '',
  });
}

export function fillMenuFormFromRow(form: MenuForm, row: MenuNodeWithMeta): void {
  Object.assign(form, {
    parentId: row.parentId,
    name: row.name,
    menuType: row.menuType,
    path: row.path ?? '',
    component: row.component ?? '',
    perms: row.perms ?? '',
    icon: row.icon ?? '',
    sort: row.sort,
    visible: row.visible,
    enabled: row.enabled,
    remark: row.remark ?? '',
  });
}

/** 空串视作未填（字段留空即不提交该字段）。 */
function orUndefined(value: string): string | undefined {
  return value === '' ? undefined : value;
}

/** 表单 → 契约请求：与当前类型无关的字段省略，避免覆盖别的类型字段。 */
export function toMenuRequest(form: MenuForm): CreateMenuRequest {
  const isButton = form.menuType === 'F';
  const isDir = form.menuType === 'M';
  return {
    parentId: form.parentId,
    name: form.name,
    menuType: form.menuType,
    sort: form.sort,
    visible: form.visible,
    enabled: form.enabled,
    path: orUndefined(form.path),
    component: isButton ? undefined : orUndefined(form.component),
    perms: isDir ? undefined : orUndefined(form.perms),
    icon: isButton ? undefined : orUndefined(form.icon),
    remark: orUndefined(form.remark),
  };
}

/** 页面 provide、弹窗组件 inject 的菜单表单对象。 */
export const menuFormKey: InjectionKey<MenuForm> = Symbol('menuForm');

export function createMenuForm(): MenuForm {
  return reactive<MenuForm>({
    parentId: 0,
    name: '',
    menuType: 'M',
    path: '',
    component: '',
    perms: '',
    icon: '',
    sort: 0,
    visible: true,
    enabled: true,
    remark: '',
  });
}
