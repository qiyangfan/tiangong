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
    <el-card shadow="never">
      <div class="tg-dashboard__welcome">
        <el-icon :size="36" color="var(--el-color-primary)"><Odometer /></el-icon>
        <div>
          <h2 class="tg-dashboard__greeting">
            {{ t('dashboard.greeting', { name: auth.displayName }) }}
          </h2>
          <p class="tg-dashboard__subtitle">{{ t('dashboard.subtitle') }}</p>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="tg-dashboard__card">
      <template #header>{{ t('dashboard.quickLinks') }}</template>
      <div class="tg-dashboard__links">
        <div
          v-for="link in links"
          :key="link.path"
          class="tg-dashboard__link"
          @click="go(link.path)"
        >
          <el-icon :size="20"><component :is="link.icon" /></el-icon>
          <span>{{ link.label }}</span>
        </div>
        <el-empty v-if="links.length === 0" :description="t('common.noData')" :image-size="60" />
      </div>
    </el-card>

    <el-card shadow="never" class="tg-dashboard__card">
      <template #header>{{ t('dashboard.stackTitle') }}</template>
      <span class="tg-dashboard__stack">{{ t('dashboard.stack') }}</span>
    </el-card>
  </div>
</template>

<style scoped>
.tg-dashboard__welcome {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tg-dashboard__greeting {
  margin: 0;
  color: var(--el-text-color-primary);
}

.tg-dashboard__subtitle {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.tg-dashboard__card {
  margin-top: var(--tg-card-gap);
}

.tg-dashboard__links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.tg-dashboard__link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  cursor: pointer;
  color: var(--el-text-color-regular);
  transition: all 0.15s;
}

.tg-dashboard__link:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.tg-dashboard__stack {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
