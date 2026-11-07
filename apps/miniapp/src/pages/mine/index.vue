<template>
  <view class="mine-page">
    <view class="mine-card">
      <text class="mine-name">{{ profile?.nickname ?? user?.nickname ?? '-' }}</text>
      <text class="mine-username">{{ profile?.username ?? user?.username ?? '' }}</text>
    </view>
    <view class="mine-card mine-rows">
      <view class="mine-row">
        <text class="mine-label">邮箱</text>
        <text class="mine-value">{{ profile?.email ?? '-' }}</text>
      </view>
      <view class="mine-row">
        <text class="mine-label">注册时间</text>
        <text class="mine-value">{{ profile ? formatDate(profile.createdAt) : '-' }}</text>
      </view>
      <view class="mine-row">
        <text class="mine-label">最近登录</text>
        <text class="mine-value">{{ profile?.lastLoginAt ? formatDate(profile.lastLoginAt) : '-' }}</text>
      </view>
    </view>
    <button class="mine-logout" :loading="loggingOut" @click="onLogout">退出登录</button>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import type { Profile } from '@tiangong/contracts';
import { apiLogout, apiProfile } from '@/api/auth';
import { clearSession, getStoredUser, type StoredUser } from '@/utils/auth';

const user = ref<StoredUser | null>(null);
const profile = ref<Profile | null>(null);
const loggingOut = ref(false);

onShow(() => {
  user.value = getStoredUser();
  void apiProfile().then((p) => {
    profile.value = p;
  });
});

function formatDate(iso: string): string {
  return iso.replace('T', ' ').slice(0, 16);
}

function onLogout(): void {
  loggingOut.value = true;
  apiLogout()
    .catch(() => undefined)
    .finally(() => {
      clearSession();
      loggingOut.value = false;
      uni.reLaunch({ url: '/pages/login/index' });
    });
}
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  padding: 24rpx;
  background-color: #f6f7f9;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.mine-card {
  border-radius: 20rpx;
  background-color: #ffffff;
  padding: 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.mine-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #26292f;
}
.mine-username {
  font-size: 26rpx;
  color: #8a8f99;
}
.mine-rows {
  gap: 24rpx;
}
.mine-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.mine-label {
  font-size: 28rpx;
  color: #8a8f99;
}
.mine-value {
  font-size: 28rpx;
  color: #26292f;
}
.mine-logout {
  margin-top: 48rpx;
  border-radius: 16rpx;
  background-color: #ffffff;
  color: #c2455c;
  font-size: 32rpx;
}
</style>
