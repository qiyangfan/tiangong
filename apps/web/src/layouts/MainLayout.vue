<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import Sidebar from './components/Sidebar.vue';
import Navbar from './components/Navbar.vue';

const AiPanel = defineAsyncComponent(() => import('@/components/AiPanel.vue'));

const appStore = useAppStore();
const auth = useAuthStore();
const aiOpen = ref(false);
const aiMounted = ref(false);

function openAi(): void {
  aiMounted.value = true;
  aiOpen.value = true;
}

function onLogout(): void {
  void auth.logout();
}
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <aside
      class="flex shrink-0 flex-col border-r border-[var(--el-border-color-light)] bg-[var(--el-bg-color)] transition-[width] duration-200"
      :style="{
        width: appStore.sidebarCollapsed
          ? 'var(--tg-sidebar-collapsed-width)'
          : 'var(--tg-sidebar-width)',
      }"
    >
      <!-- logo 区：品牌色纯底白字（UI_STYLEGUIDE 门面基准，禁渐变） -->
      <div
        class="flex h-[var(--tg-navbar-height)] shrink-0 items-center justify-center bg-[var(--el-color-primary)] text-white"
      >
        <span class="text-lg font-semibold tracking-[8px] [text-indent:8px]">
          {{ appStore.sidebarCollapsed ? '天' : '天工' }}
        </span>
      </div>
      <Sidebar :menus="auth.menus" />
    </aside>
    <div class="flex min-w-0 flex-1 flex-col">
      <Navbar :display-name="auth.displayName" @logout="onLogout" @open-ai="openAi" />
      <main class="flex-1 overflow-auto bg-[var(--el-bg-color-page)]">
        <router-view />
      </main>
    </div>
    <AiPanel v-if="aiMounted" v-model="aiOpen" />
  </div>
</template>
