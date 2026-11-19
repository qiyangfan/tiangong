import type { RouteComponent, RouteRecordRaw } from 'vue-router';
import type { MenuNode } from '@tiangong/contracts';

/**
 * 后端 component 字符串 → 懒加载组件映射（RuoYi import.meta.glob 模式）。
 * 命中失败回落 404 页，避免白屏。
 */
const viewModules = import.meta.glob<RouteComponent>('../views/**/*.vue');
const FALLBACK_VIEW = '../views/error/404.vue';

/** 可选访问的加载器字典：页面文件缺失时为 undefined，由调用处回落。 */
const optionalViewModules: Partial<Record<string, RouteComponent>> = viewModules;

/** 兜底页与 glob 字面量同源，运行时必然命中；断言只用于收窄可选的字典访问。 */
function viewLoader(component: string): RouteComponent {
  const loader =
    optionalViewModules[`../views/${component}.vue`] ?? optionalViewModules[FALLBACK_VIEW];
  return loader as RouteComponent;
}

function joinPath(parent: string, child: string): string {
  const p = parent.endsWith('/') ? parent : `${parent}/`;
  return child.startsWith('/') ? child : `${p}${child}`;
}

function toChildRoutes(nodes: MenuNode[]): RouteRecordRaw[] {
  return nodes
    .filter((n) => n.menuType === 'C' && n.enabled)
    .map((n) => ({
      path: n.path ?? `menu-${n.id}`,
      name: `menu-${n.id}`,
      component: viewLoader(n.component ?? ''),
      meta: { title: n.name, icon: n.icon ?? undefined },
    }));
}

/** 绝对路径便于作为 layout 根路由的 child 注册（vue-router 允许 child 使用绝对路径）。 */
function absolutePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/** M 目录：无自身组件，子路由直接渲染在 layout 壳内。 */
function toDirRoute(m: MenuNode): RouteRecordRaw | undefined {
  const children = toChildRoutes(m.children);
  if (children.length === 0) {
    return undefined;
  }
  const dirPath = absolutePath(m.path ?? `/dir-${m.id}`);
  const firstChildPath = children[0]?.path ?? '';
  return {
    path: dirPath,
    name: `dir-${m.id}`,
    meta: { title: m.name, icon: m.icon ?? undefined },
    children,
    redirect: joinPath(dirPath, firstChildPath),
  };
}

/** 顶层 C 菜单：直接作为 layout 的子路由（单一 layout 实例，跨菜单不重挂载）。 */
function toTopMenuRoute(m: MenuNode): RouteRecordRaw {
  const menuPath = absolutePath(m.path ?? `/menu-${m.id}`);
  return {
    path: menuPath,
    name: `menu-${m.id}`,
    component: viewLoader(m.component ?? ''),
    meta: { title: m.name, icon: m.icon ?? undefined },
  };
}

/** 动态路由三步曲第二步：后端菜单树 → 路由表（M 目录承载 Layout，C 菜单挂视图）。 */
export function generateRoutes(menus: MenuNode[]): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [];
  for (const m of menus) {
    if (!m.enabled || m.menuType === 'F') {
      continue;
    }
    const route = m.menuType === 'M' ? toDirRoute(m) : toTopMenuRoute(m);
    if (route) {
      routes.push(route);
    }
  }
  return routes;
}
