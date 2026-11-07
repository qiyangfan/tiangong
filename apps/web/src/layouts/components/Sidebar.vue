<script setup lang="ts">
import { useRoute } from 'vue-router';
import type { MenuNode } from '@tiangong/contracts';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import MenuIcon from '@/components/MenuIcon.vue';

const route = useRoute();
const appStore = useAppStore();
const auth = useAuthStore();

/** 服务端已按权限过滤（F 节点不出现在导航树中），这里只做结构渲染。 */
function navNodes(nodes: MenuNode[]): MenuNode[] {
  return nodes.filter((n) => (n.menuType === 'M' || n.menuType === 'C') && n.enabled);
}

function leafIndex(parentPath: string | null | undefined, node: MenuNode): string {
  const path = node.path ?? '';
  if (path.startsWith('/')) {
    return path;
  }
  return `${parentPath?.replace(/\/$/, '') ?? ''}/${path}`;
}
</script>

<template>
  <el-scrollbar class="tg-sidebar__scroll">
    <el-menu
      class="tg-sidebar__menu"
      :default-active="route.path"
      :collapse="appStore.sidebarCollapsed"
      :collapse-transition="false"
      router
    >
      <template v-for="top in navNodes(auth.menus)" :key="top.id">
        <!-- 顶级 C 菜单（如仪表盘）直接渲染为可点击项 -->
        <el-menu-item v-if="top.menuType === 'C'" :index="top.path ?? ''">
          <MenuIcon :name="top.icon" />
          <template #title>{{ top.name }}</template>
        </el-menu-item>
        <el-sub-menu v-else :index="String(top.id)">
          <template #title>
            <MenuIcon :name="top.icon" />
            <span>{{ top.name }}</span>
          </template>
          <el-menu-item
            v-for="child in navNodes(top.children)"
            :key="child.id"
            :index="leafIndex(top.path, child)"
          >
            <template #title>{{ child.name }}</template>
          </el-menu-item>
        </el-sub-menu>
      </template>
    </el-menu>
  </el-scrollbar>
</template>

<style scoped>
.tg-sidebar__scroll {
  flex: 1;
}

/* 菜单激活项品牌化：EP 默认的纯文字高亮改为品牌色块 + 左侧指示条 */
.tg-sidebar__menu {
  border-right: none;
}

.tg-sidebar__menu .el-menu-item.is-active {
  background-color: var(--el-color-primary-light-9);
  border-right: 2px solid var(--el-color-primary);
  font-weight: 600;
}

html.dark .tg-sidebar__menu .el-menu-item.is-active {
  background-color: var(--el-color-primary-light-8);
}

.tg-sidebar__menu:not(.el-menu--collapse) {
  width: 100%;
}
</style>
