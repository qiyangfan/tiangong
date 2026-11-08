<template>
  <wd-config-provider :theme-vars="wotThemeVars">
    <view class="min-h-screen flex flex-col justify-center bg-page px-6">
      <view class="flex flex-col items-center mb-12">
        <text class="text-title font-bold text-primary">{{ t('login.title') }}</text>
        <text class="mt-2 text-caption text-ink-3">{{ t('login.subtitle') }}</text>
      </view>
      <view class="flex flex-col gap-4">
        <wd-input
          v-model="username"
          custom-class="rounded-control bg-surface h-11.5 px-3.5"
          no-border
          :placeholder="t('login.usernamePlaceholder')"
          :maxlength="30"
          confirm-type="next"
        />
        <wd-input
          v-model="password"
          custom-class="rounded-control bg-surface h-11.5 px-3.5"
          no-border
          show-password
          :placeholder="t('login.passwordPlaceholder')"
          :maxlength="72"
          confirm-type="done"
          @confirm="onLogin"
        />
        <wd-button
          block
          size="large"
          :round="false"
          custom-class="mt-2 rounded-control"
          :loading="loading"
          :disabled="!username || !password"
          @click="onLogin"
        >
          {{ loading ? t('login.loggingIn') : t('login.loginBtn') }}
        </wd-button>
      </view>
    </view>
  </wd-config-provider>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiLogin } from '@/api/auth';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { wotThemeVars } from '@/theme';

const { t } = useI18n();
const appStore = useAppStore();
const authStore = useAuthStore();
const username = ref('');
const password = ref('');
const loading = ref(false);

onShow(() => {
  appStore.syncChrome('login');
});

async function onLogin(): Promise<void> {
  if (loading.value || !username.value || !password.value) {
    return;
  }
  loading.value = true;
  try {
    const res = await apiLogin({
      username: username.value.trim(),
      password: password.value,
      client: 'miniapp',
    });
    // miniapp 端 refresh 经响应体下发并落本地存储
    authStore.applySession(res.accessToken, res.refreshToken ?? '', {
      id: res.user.id,
      username: res.user.username,
      nickname: res.user.nickname,
    });
    uni.reLaunch({ url: '/pages/sample/index' });
  } catch (err) {
    const e = err as { message?: string };
    uni.showToast({ title: e.message || t('login.loginFailed'), icon: 'none' });
  } finally {
    loading.value = false;
  }
}
</script>
