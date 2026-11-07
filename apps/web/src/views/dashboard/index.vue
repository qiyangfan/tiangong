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

function go(path: string): void {
  void router.push(path);
}
</script>

<template>
  <div class="tg-page">
    <!-- 问候横幅：品牌渐变，暗色降低饱和 -->
    <div
      class="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-7 text-white shadow-md dark:from-indigo-500/90 dark:to-violet-500/90"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur"
        >
          <el-icon :size="26"><Odometer /></el-icon>
        </div>
        <div>
          <h2 class="m-0 text-xl font-semibold">
            {{ t('dashboard.greeting', { name: auth.displayName }) }}
          </h2>
          <p class="mt-1 mb-0 text-[13px] text-white/80">
            {{ t('dashboard.subtitle') }}
          </p>
        </div>
      </div>
    </div>

    <el-card shadow="never" class="mt-3">
      <template #header>
        <span class="font-semibold">{{ t('dashboard.quickLinks') }}</span>
      </template>
      <div class="flex flex-wrap gap-3">
        <div
          v-for="link in links"
          :key="link.path"
          class="flex cursor-pointer items-center gap-2.5 rounded-md border border-[var(--el-border-color-light)] px-5 py-3 text-[var(--el-text-color-regular)] transition-colors hover:border-[var(--el-color-primary)] hover:text-[var(--el-color-primary)]"
          @click="go(link.path)"
        >
          <el-icon :size="18"><component :is="link.icon" /></el-icon>
          <span>{{ link.label }}</span>
        </div>
        <el-empty v-if="links.length === 0" :description="t('common.noData')" :image-size="60" />
      </div>
    </el-card>

    <el-card shadow="never" class="mt-3">
      <template #header>
        <span class="font-semibold">{{ t('dashboard.stackTitle') }}</span>
      </template>
      <span class="text-[13px] text-[var(--el-text-color-secondary)]">
        {{ t('dashboard.stack') }}
      </span>
    </el-card>
  </div>
</template>
