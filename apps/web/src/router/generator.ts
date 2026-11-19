import type { RouteComponent, RouteRecordRaw } from 'vue-router';
import type { MenuNode } from '@tiangong/contracts';
import MainLayout from '@/layouts/MainLayout.vue';

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

/** M 目录：Layout 壳承载子菜单，重定向到首个可见子菜单。 */
function toDirRoute(m: MenuNode): RouteRecordRaw | undefined {
  const children = toChildRoutes(m.children);
  if (children.length === 0) {
    return undefined;
  }
  const dirPath = m.path ?? `/dir-${m.id}`;
  const firstChildPath = children[0]?.path ?? '';
  return {
    path: dirPath,
    name: `dir-${m.id}`,
    component: MainLayout,
    meta: { title: m.name, icon: m.icon ?? undefined },
    children,
    redirect: joinPath(dirPath, firstChildPath),
  };
}

/** 顶层 C 菜单：Layout 壳下挂单条视图路由。 */
function toTopMenuRoute(m: MenuNode): RouteRecordRaw {
  const menuPath = m.path ?? `/menu-${m.id}`;
  return {
    path: menuPath,
    name: `top-menu-${m.id}`,
    component: MainLayout,
    meta: { title: m.name, icon: m.icon ?? undefined },
    children: [
      {
        path: '',
        name: `menu-${m.id}`,
        component: viewLoader(m.component ?? ''),
        meta: { title: m.name, icon: m.icon ?? undefined },
      },
    ],
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
