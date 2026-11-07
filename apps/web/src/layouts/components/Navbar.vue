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
  <header
    class="flex h-[var(--tg-navbar-height)] shrink-0 items-center justify-between border-b border-[var(--el-border-color-light)] bg-[var(--el-bg-color)] px-4"
  >
    <div class="flex min-w-0 items-center gap-2">
      <el-button text @click="appStore.toggleSidebar()">
        <el-icon :size="18">
          <Fold v-if="!appStore.sidebarCollapsed" />
          <Expand v-else />
        </el-icon>
      </el-button>
      <Breadcrumb />
    </div>
    <div class="flex items-center gap-3">
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
      <el-button text class="px-2" @click="onToggleLocale">
        {{ appStore.locale === 'zh-CN' ? 'EN' : '中文' }}
      </el-button>
      <el-dropdown trigger="click">
        <span
          class="flex cursor-pointer items-center gap-1.5 text-[var(--el-text-color-regular)] outline-none"
        >
          <el-icon :size="16"><User /></el-icon>
          <span class="max-w-[140px] truncate">{{ auth.displayName }}</span>
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

<!-- 布局样式已迁至模板 utility（ADR-0006：布局归 Tailwind，控件归 Element Plus） -->
