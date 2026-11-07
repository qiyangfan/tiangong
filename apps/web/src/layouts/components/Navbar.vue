<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Fold, Expand, Moon, Sunny, User, ArrowDown } from '@element-plus/icons-vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import Breadcrumb from './Breadcrumb.vue';

const router = useRouter();
const { t } = useI18n();
const appStore = useAppStore();
const auth = useAuthStore();

async function onLogout(): Promise<void> {
  try {
    await ElMessageBox.confirm(t('layout.logoutConfirm'), t('common.tip'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    });
  } catch {
    return;
  }
  await auth.logout();
}

function onProfile(): void {
  void router.push('/profile');
}

function onToggleLocale(): void {
  appStore.toggleLocale();
  ElMessage.success(t('layout.langSwitched'));
}
</script>

<template>
  <header class="tg-navbar">
    <div class="tg-navbar__left">
      <el-button text @click="appStore.toggleSidebar()">
        <el-icon :size="18">
          <Fold v-if="!appStore.sidebarCollapsed" />
          <Expand v-else />
        </el-icon>
      </el-button>
      <Breadcrumb />
    </div>
    <div class="tg-navbar__right">
      <el-tooltip
        :content="appStore.theme === 'dark' ? t('layout.light') : t('layout.dark')"
        placement="bottom"
      >
        <el-button text circle @click="appStore.toggleTheme()">
          <el-icon :size="18">
            <Sunny v-if="appStore.theme === 'dark'" />
            <Moon v-else />
          </el-icon>
        </el-button>
      </el-tooltip>
      <el-button text class="tg-navbar__lang" @click="onToggleLocale">
        {{ appStore.locale === 'zh-CN' ? 'EN' : '中文' }}
      </el-button>
      <el-dropdown trigger="click">
        <span class="tg-navbar__user">
          <el-icon :size="16"><User /></el-icon>
          <span class="tg-navbar__username">{{ auth.displayName }}</span>
          <el-icon :size="12"><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="onProfile">{{ t('layout.profile') }}</el-dropdown-item>
            <el-dropdown-item divided @click="onLogout">{{ t('layout.logout') }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<style scoped>
.tg-navbar {
  height: var(--tg-navbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.tg-navbar__left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tg-navbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tg-navbar__lang {
  padding: 0 8px;
}

.tg-navbar__user {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--el-text-color-regular);
  outline: none;
}

.tg-navbar__username {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
