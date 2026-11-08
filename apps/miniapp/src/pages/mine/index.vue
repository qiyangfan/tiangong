<template>
  <wd-config-provider :theme-vars="wotThemeVars">
    <view class="min-h-screen bg-page p-3 flex flex-col gap-3">
      <view class="rounded-card bg-surface py-5 px-4 flex flex-col gap-2">
        <text class="text-title font-bold text-ink">{{ authStore.profile?.nickname ?? authStore.user?.nickname ?? '-' }}</text>
        <text class="text-caption text-ink-3">{{ authStore.profile?.username ?? authStore.user?.username ?? '' }}</text>
      </view>
      <wd-cell-group border custom-class="rounded-card overflow-hidden">
        <wd-cell :title="t('mine.language')" clickable @click="onToggleLocale">
          <text class="text-body text-primary">{{ localeLabel }}</text>
        </wd-cell>
        <wd-cell :title="t('mine.email')" :value="authStore.profile?.email ?? '-'" />
        <wd-cell
          :title="t('mine.createdAt')"
          :value="authStore.profile ? formatDateTime(authStore.profile.createdAt) : '-'"
        />
        <wd-cell
          :title="t('mine.lastLoginAt')"
          :value="authStore.profile?.lastLoginAt ? formatDateTime(authStore.profile.lastLoginAt) : '-'"
        />
      </wd-cell-group>
      <wd-button
        block
        size="large"
        plain
        type="error"
        :round="false"
        custom-class="mt-6 rounded-control"
        :loading="loggingOut"
        @click="onLogout"
      >
        {{ t('mine.logout') }}
      </wd-button>
    </view>
  </wd-config-provider>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { LOCALE_LABELS, useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { wotThemeVars } from '@/theme';
import { formatDateTime } from '@/utils/datetime';

const { t } = useI18n();
const appStore = useAppStore();
const authStore = useAuthStore();
const loggingOut = ref(false);
const localeLabel = computed(() => LOCALE_LABELS[appStore.locale]);

onShow(() => {
  appStore.syncChrome('mine');
  // 存储是启动期事实源，store 惰性恢复；profile 拉取失败由 request 层提示，不重复弹全局异常
  authStore.restoreUser();
  authStore.refreshProfile().catch(() => undefined);
});

function onToggleLocale(): void {
  appStore.toggleLocale();
  appStore.syncChrome('mine');
}

async function onLogout(): Promise<void> {
  loggingOut.value = true;
  try {
    await authStore.logout();
  } finally {
    loggingOut.value = false;
  }
}
</script>
