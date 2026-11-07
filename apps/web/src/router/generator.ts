import type { RouteRecordRaw } from 'vue-router';
import type { MenuNode } from '@tiangong/contracts';
import MainLayout from '@/layouts/MainLayout.vue';

/**
 * 后端 component 字符串 → 懒加载组件映射（RuoYi import.meta.glob 模式）。
 * 命中失败回落 404 页，避免白屏。
 */
const viewModules = import.meta.glob('../views/**/*.vue');
const FALLBACK_VIEW = '../views/error/404.vue';

function viewLoader(component: string): () => Promise<unknown> {
  const loader = viewModules[`../views/${component}.vue`];
  return (loader ?? viewModules[FALLBACK_VIEW]) as () => Promise<unknown>;
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

/** 动态路由三步曲第二步：后端菜单树 → 路由表（M 目录承载 Layout，C 菜单挂视图）。 */
export function generateRoutes(menus: MenuNode[]): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [];
  for (const m of menus) {
    if (!m.enabled || m.menuType === 'F') {
      continue;
    }
    if (m.menuType === 'M') {
      const children = toChildRoutes(m.children);
      if (children.length === 0) {
        continue;
      }
      const dirPath = m.path ?? `/dir-${m.id}`;
      const firstChildPath = children[0]?.path ?? '';
      routes.push({
        path: dirPath,
        name: `dir-${m.id}`,
        component: MainLayout,
        meta: { title: m.name, icon: m.icon ?? undefined },
        children,
        redirect: joinPath(dirPath, firstChildPath),
      });
    } else {
      const menuPath = m.path ?? `/menu-${m.id}`;
      routes.push({
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
      });
    }
  }
  return routes;
}
