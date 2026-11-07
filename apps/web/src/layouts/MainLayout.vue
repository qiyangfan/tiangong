<script setup lang="ts">
import { useAppStore } from '@/stores/app';
import Sidebar from './components/Sidebar.vue';
import Navbar from './components/Navbar.vue';

const appStore = useAppStore();
</script>

<template>
  <div class="tg-layout">
    <aside class="tg-sidebar" :class="{ 'is-collapsed': appStore.sidebarCollapsed }">
      <div class="tg-logo">
        <span v-if="!appStore.sidebarCollapsed" class="tg-logo__text">天工</span>
        <span v-else class="tg-logo__text">天</span>
      </div>
      <Sidebar />
    </aside>
    <div class="tg-body">
      <Navbar />
      <main class="tg-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.tg-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.tg-sidebar {
  width: var(--tg-sidebar-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--el-menu-bg-color, var(--el-bg-color));
  border-right: 1px solid var(--el-border-color-light);
  transition: width 0.2s;
}

.tg-sidebar.is-collapsed {
  width: var(--tg-sidebar-collapsed-width);
}

.tg-logo {
  height: var(--tg-navbar-height);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tg-logo-bg);
  color: var(--tg-logo-text);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 2px;
  flex-shrink: 0;
}

.tg-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tg-content {
  flex: 1;
  overflow: auto;
  background: var(--el-bg-color-page);
}
</style>
