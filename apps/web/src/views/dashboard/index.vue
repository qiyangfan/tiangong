<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { Odometer, User, Avatar, Menu, Collection, Document } from '@element-plus/icons-vue';
import { checkPermi } from '@/composables/usePermission';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

interface QuickLink {
  path: string;
  label: string;
  icon: typeof User;
  perm?: string;
}

const allLinks: QuickLink[] = [
  { path: '/system/user', label: t('quickLinks.users'), icon: User },
  { path: '/system/role', label: t('quickLinks.roles'), icon: Avatar },
  { path: '/system/menu', label: t('quickLinks.menus'), icon: Menu },
  { path: '/system/dict', label: t('quickLinks.dicts'), icon: Collection },
  { path: '/audit/oper-log', label: t('quickLinks.operLogs'), icon: Document },
];
const links = allLinks.filter((l) => !l.perm || checkPermi(l.perm));

// 技术栈名词列表不进 i18n（专有名词，zh/en 一致）
const stackItems = [
  'NestJS 11',
  'Prisma',
  'MySQL 8.4',
  'Vue 3',
  'Element Plus',
  'Tailwind v4',
  'uni-app',
];

function go(path: string): void {
  void router.push(path);
}
</script>

<template>
  <div class="tg-page">
    <!-- 问候横幅：品牌淡底纯色（UI_STYLEGUIDE 门面基准，禁渐变/玻璃） -->
    <div
      class="flex items-center gap-4 rounded-xl border border-[var(--el-border-color-light)] bg-[var(--el-color-primary-light-9)] px-6 py-6"
    >
      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--el-color-primary)] text-white"
      >
        <el-icon :size="22"><Odometer /></el-icon>
      </div>
      <div>
        <h2
          class="m-0 text-[var(--tg-font-size-title)] font-semibold text-[var(--el-text-color-primary)]"
        >
          {{ t('dashboard.greeting', { name: auth.displayName }) }}
        </h2>
        <p class="mb-0 mt-1 text-[var(--tg-font-size-body)] text-[var(--el-text-color-secondary)]">
          {{ t('dashboard.subtitle') }}
        </p>
      </div>
    </div>

    <el-card shadow="never" class="mt-4">
      <template #header>
        <span class="tg-card-title">{{ t('dashboard.quickLinks') }}</span>
      </template>
      <div class="flex flex-wrap gap-3">
        <div
          v-for="link in links"
          :key="link.path"
          class="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--el-border-color-light)] px-4 py-2.5 text-[var(--el-text-color-regular)] transition-colors hover:border-[var(--el-color-primary)] hover:text-[var(--el-color-primary)]"
          @click="go(link.path)"
        >
          <el-icon :size="16"><component :is="link.icon" /></el-icon>
          <span>{{ link.label }}</span>
        </div>
        <el-empty v-if="links.length === 0" :description="t('common.noData')" :image-size="60" />
      </div>
    </el-card>

    <el-card shadow="never" class="mt-4">
      <template #header>
        <span class="tg-card-title">{{ t('dashboard.stackTitle') }}</span>
      </template>
      <div class="flex flex-wrap gap-2">
        <el-tag
          v-for="item in stackItems"
          :key="item"
          type="info"
          effect="plain"
          disable-transitions
        >
          {{ item }}
        </el-tag>
      </div>
    </el-card>
  </div>
</template>
