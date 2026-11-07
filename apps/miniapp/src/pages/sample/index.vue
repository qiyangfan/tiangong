<template>
  <view class="sample-page">
    <view v-if="loading && items.length === 0" class="sample-tip">加载中…</view>
    <view v-else-if="items.length === 0" class="sample-tip">暂无数据</view>
    <view v-else class="sample-list">
      <view v-for="row in items" :key="row.id" class="sample-card" @click="openEdit(row)">
        <view class="sample-head">
          <text class="sample-name">{{ row.name }}</text>
          <text class="sample-tag" :class="row.enabled ? 'is-on' : 'is-off'">
            {{ row.enabled ? '启用' : '停用' }}
          </text>
        </view>
        <view class="sample-meta">
          <text>金额 {{ row.amount ?? '-' }}</text>
          <text>{{ formatDate(row.updatedAt) }}</text>
        </view>
      </view>
    </view>
    <view v-if="hasMore" class="sample-more" @click="loadMore">加载更多</view>
    <button class="sample-add" @click="openCreate">新增记录</button>

    <!-- 编辑弹层 -->
    <view v-if="dialogVisible" class="dlg-mask" @click.self="dialogVisible = false">
      <view class="dlg">
        <text class="dlg-title">{{ editingId === null ? '新增记录' : '修改记录' }}</text>
        <input v-model="form.name" class="dlg-input" placeholder="名称（必填）" :maxlength="100" />
        <input v-model="form.amountText" class="dlg-input" placeholder="金额（可选，如 12.30）" type="digit" />
        <view class="dlg-switch-row">
          <text>启用</text>
          <switch :checked="form.enabled" color="#2f5d9e" @change="(e: any) => (form.enabled = e.detail.value)" />
        </view>
        <view class="dlg-actions">
          <button v-if="editingId !== null" class="dlg-btn is-danger" @click="onDelete">删除</button>
          <view class="dlg-spacer" />
          <button class="dlg-btn" @click="dialogVisible = false">取消</button>
          <button class="dlg-btn is-primary" :loading="submitting" @click="onSubmit">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import type { SampleRecordItem } from '@tiangong/contracts';
import { apiCreateSample, apiDeleteSample, apiListSamples, apiUpdateSample } from '@/api/sample';

const PAGE_SIZE = 20;
const loading = ref(false);
const items = ref<SampleRecordItem[]>([]);
const total = ref(0);
const page = ref(1);
const hasMore = ref(false);

async function loadFirst(): Promise<void> {
  page.value = 1;
  loading.value = true;
  try {
    const res = await apiListSamples({ page: 1, pageSize: PAGE_SIZE });
    items.value = res.items;
    total.value = res.total;
    hasMore.value = res.items.length < res.total;
  } finally {
    loading.value = false;
  }
}

async function loadMore(): Promise<void> {
  const next = page.value + 1;
  const res = await apiListSamples({ page: next, pageSize: PAGE_SIZE });
  items.value = [...items.value, ...res.items];
  page.value = next;
  hasMore.value = items.value.length < res.total;
}

onShow(() => {
  void loadFirst();
});

const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const submitting = ref(false);
const form = ref({ name: '', amountText: '', enabled: true });

function openCreate(): void {
  editingId.value = null;
  form.value = { name: '', amountText: '', enabled: true };
  dialogVisible.value = true;
}

function openEdit(row: SampleRecordItem): void {
  editingId.value = row.id;
  form.value = { name: row.name, amountText: row.amount ?? '', enabled: row.enabled };
  dialogVisible.value = true;
}

function formatAmount(raw: string): string | undefined {
  if (raw === '') {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    uni.showToast({ title: '金额格式不正确', icon: 'none' });
    throw new Error('invalid amount');
  }
  return value.toFixed(2);
}

async function onSubmit(): Promise<void> {
  if (submitting.value) {
    return;
  }
  if (form.value.name.trim() === '') {
    uni.showToast({ title: '请输入名称', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const amount = formatAmount(form.value.amountText.trim());
    if (editingId.value === null) {
      await apiCreateSample({ name: form.value.name.trim(), amount, enabled: form.value.enabled });
    } else {
      await apiUpdateSample(editingId.value, {
        name: form.value.name.trim(),
        amount,
        enabled: form.value.enabled,
      });
    }
    dialogVisible.value = false;
    uni.showToast({ title: '操作成功', icon: 'success' });
    await loadFirst();
  } catch (err) {
    if (!(err instanceof Error && err.message === 'invalid amount')) {
      // 错误提示由 request 层 toast
    }
  } finally {
    submitting.value = false;
  }
}

async function onDelete(): Promise<void> {
  if (editingId.value === null) {
    return;
  }
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '提示',
      content: '确认删除该记录？删除后不可恢复。',
      success: (res) => resolve(res.confirm),
    });
  });
  if (!confirmed) {
    return;
  }
  await apiDeleteSample(editingId.value);
  dialogVisible.value = false;
  uni.showToast({ title: '操作成功', icon: 'success' });
  await loadFirst();
}

function formatDate(iso: string): string {
  return iso.replace('T', ' ').slice(0, 16);
}
</script>

<style scoped>
.sample-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 48rpx;
  background-color: #f6f7f9;
}
.sample-tip {
  padding: 120rpx 0;
  text-align: center;
  color: #8a8f99;
  font-size: 28rpx;
}
.sample-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.sample-card {
  border-radius: 20rpx;
  background-color: #ffffff;
  padding: 28rpx 32rpx;
}
.sample-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sample-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #26292f;
}
.sample-tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}
.sample-tag.is-on {
  color: #3d7a4f;
  background-color: #e8f3ec;
}
.sample-tag.is-off {
  color: #8a8f99;
  background-color: #eef0f3;
}
.sample-meta {
  margin-top: 16rpx;
  display: flex;
  justify-content: space-between;
  color: #8a8f99;
  font-size: 24rpx;
}
.sample-more {
  margin-top: 24rpx;
  text-align: center;
  color: #2f5d9e;
  font-size: 28rpx;
}
.sample-add {
  margin-top: 32rpx;
  border-radius: 16rpx;
  background-color: #2f5d9e;
  color: #ffffff;
  font-size: 32rpx;
}
.dlg-mask {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  z-index: 10;
}
.dlg {
  width: 100%;
  border-radius: 24rpx;
  background-color: #ffffff;
  padding: 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.dlg-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #26292f;
}
.dlg-input {
  height: 84rpx;
  padding: 0 24rpx;
  border-radius: 14rpx;
  background-color: #f6f7f9;
  font-size: 28rpx;
}
.dlg-switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
  color: #26292f;
}
.dlg-actions {
  display: flex;
  gap: 16rpx;
  align-items: center;
}
.dlg-spacer {
  flex: 1;
}
.dlg-btn {
  font-size: 28rpx;
  padding: 0 28rpx;
  margin: 0;
  border-radius: 14rpx;
  background-color: #f6f7f9;
  color: #26292f;
}
.dlg-btn.is-primary {
  background-color: #2f5d9e;
  color: #ffffff;
}
.dlg-btn.is-danger {
  background-color: #fbeaed;
  color: #c2455c;
}
</style>
