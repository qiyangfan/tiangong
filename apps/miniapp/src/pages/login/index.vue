<template>
  <view class="login-page">
    <view class="login-brand">
      <text class="login-title">天工</text>
      <text class="login-subtitle">通用后台脚手架 · 移动端</text>
    </view>
    <view class="login-form">
      <input
        v-model="username"
        class="login-input"
        placeholder="账号"
        :maxlength="30"
        confirm-type="next"
      />
      <input
        v-model="password"
        class="login-input"
        placeholder="密码"
        password
        :maxlength="72"
        confirm-type="done"
        @confirm="onLogin"
      />
      <button class="login-btn" :disabled="loading || !username || !password" @click="onLogin">
        {{ loading ? '登录中…' : '登录' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { apiLogin } from '@/api/auth';
import { storeSession } from '@/utils/auth';

const username = ref('');
const password = ref('');
const loading = ref(false);

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
    storeSession(res.accessToken, res.refreshToken ?? '', {
      id: res.user.id,
      username: res.user.username,
      nickname: res.user.nickname,
    });
    uni.reLaunch({ url: '/pages/sample/index' });
  } catch (err) {
    const e = err as { message?: string };
    uni.showToast({ title: e.message || '登录失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 48rpx;
  background-color: #f6f7f9;
}
.login-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 96rpx;
}
.login-title {
  font-size: 64rpx;
  font-weight: 700;
  color: #2f5d9e;
}
.login-subtitle {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #8a8f99;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}
.login-input {
  height: 92rpx;
  padding: 0 28rpx;
  border-radius: 16rpx;
  background-color: #ffffff;
  font-size: 30rpx;
}
.login-btn {
  margin-top: 16rpx;
  border-radius: 16rpx;
  background-color: #2f5d9e;
  color: #ffffff;
  font-size: 32rpx;
}
.login-btn[disabled] {
  opacity: 0.55;
  color: #ffffff;
}
</style>
