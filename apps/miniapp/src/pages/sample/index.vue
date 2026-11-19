<template>
  <wd-config-provider :theme-vars="wotThemeVars">
    <view class="min-h-screen bg-page p-3 pb-6">
      <view v-if="loading && items.length === 0" class="py-15 text-center text-caption text-ink-3">
        {{ t('common.loading') }}
      </view>
      <view v-else-if="items.length === 0" class="py-15 text-center text-caption text-ink-3">
        {{ t('common.noData') }}
      </view>
      <view v-else class="flex flex-col gap-3">
        <view
          v-for="row in items"
          :key="row.id"
          class="rounded-card bg-surface py-3.5 px-4"
          @click="openEdit(row)"
        >
          <view class="flex justify-between items-center">
            <text class="text-body font-semibold text-ink">{{ row.name }}</text>
            <text
              class="text-caption px-2 py-1 rounded-full"
              :class="row.enabled ? 'text-success bg-success-bg' : 'text-ink-3 bg-page'"
            >
              {{ row.enabled ? t('common.enabled') : t('common.disabled') }}
            </text>
          </view>
          <view class="mt-2 flex justify-between text-ink-3 text-caption">
            <text>{{ t('sample.amountLabel') }} {{ row.amount ?? '-' }}</text>
            <text>{{ formatDateTime(row.updatedAt) }}</text>
          </view>
        </view>
      </view>
      <view v-if="hasMore" class="mt-3 text-center text-primary text-body" @click="loadMore">
        {{ t('sample.loadMore') }}
      </view>
      <wd-button
        block
        size="large"
        :round="false"
        custom-class="mt-4 rounded-control"
        @click="openCreate"
      >
        {{ t('sample.create') }}
      </wd-button>

      <!-- 编辑弹层：遮罩点击关闭、层级与滚动锁定由 wd-popup 承担 -->
      <wd-popup v-model="dialogVisible" position="center" custom-style="width: 654rpx;">
        <view class="rounded-card bg-surface py-5 px-4 flex flex-col gap-3">
          <text class="text-dialog-title font-bold text-ink">
            {{ editingId === null ? t('sample.create') : t('sample.edit') }}
          </text>
          <wd-input
            v-model="form.name"
            custom-class="rounded-control bg-page h-11.5 px-3"
            no-border
            :placeholder="t('sample.namePlaceholder')"
            :maxlength="100"
          />
          <wd-input
            v-model="form.amountText"
            custom-class="rounded-control bg-page h-11.5 px-3"
            no-border
            type="digit"
            :placeholder="t('sample.amountPlaceholder')"
          />
          <view class="flex justify-between items-center text-body text-ink">
            <text>{{ t('sample.enabledLabel') }}</text>
            <wd-switch v-model="form.enabled" />
          </view>
          <view class="flex items-center gap-2">
            <wd-button
              v-if="editingId !== null"
              plain
              type="error"
              :round="false"
              custom-class="rounded-control"
              @click="onDelete"
            >
              {{ t('common.delete') }}
            </wd-button>
            <view class="flex-1" />
            <wd-button
              plain
              type="info"
              :round="false"
              custom-class="rounded-control"
              @click="dialogVisible = false"
            >
              {{ t('common.cancel') }}
            </wd-button>
            <wd-button
              :loading="submitting"
              :round="false"
              custom-class="rounded-control"
              @click="onSubmit"
            >
              {{ t('common.save') }}
            </wd-button>
          </view>
        </view>
      </wd-popup>
    </view>
  </wd-config-provider>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SampleRecordItem } from '@tiangong/contracts';
import { apiCreateSample, apiDeleteSample, apiListSamples, apiUpdateSample } from '@/api/sample';
import { useAppStore } from '@/stores/app';
import { wotThemeVars } from '@/theme';
import { formatDateTime } from '@/utils/datetime';

const { t } = useI18n();
const appStore = useAppStore();

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
  appStore.syncChrome('sample');
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
    void uni.showToast({ title: t('sample.invalidAmount'), icon: 'none' });
    throw new Error('invalid amount');
  }
  return value.toFixed(2);
}

/** 按编辑态分流创建/更新；amount 已由 formatAmount 规范化。 */
function persist(name: string, amount: string | undefined, enabled: boolean): Promise<unknown> {
  if (editingId.value === null) {
    return apiCreateSample({ name, amount, enabled });
  }
  return apiUpdateSample(editingId.value, { name, amount, enabled });
}

/** 名称必填校验：返回 trim 后的名称，非法时提示并返回 null。 */
function validateName(): string | null {
  const name = form.value.name.trim();
  if (name === '') {
    void uni.showToast({ title: t('sample.nameRequired'), icon: 'none' });
    return null;
  }
  return name;
}

/** 提交成功路径：落库、关闭弹窗、提示并刷新首屏。 */
async function saveForm(name: string): Promise<void> {
  const amount = formatAmount(form.value.amountText.trim());
  await persist(name, amount, form.value.enabled);
  dialogVisible.value = false;
  void uni.showToast({ title: t('common.opSuccess'), icon: 'success' });
  await loadFirst();
}

async function onSubmit(): Promise<void> {
  if (submitting.value) {
    return;
  }
  const name = validateName();
  if (name === null) {
    return;
  }
  submitting.value = true;
  try {
    await saveForm(name);
  } finally {
    // 失败（本地校验抛错 / 请求类错误）的提示分别由 formatAmount 与 request 层负责，此处只复位提交态
    submitting.value = false;
  }
}

async function onDelete(): Promise<void> {
  if (editingId.value === null) {
    return;
  }
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: t('common.tip'),
      content: t('common.confirmDelete'),
      success: (res) => resolve(res.confirm),
    });
  });
  if (!confirmed) {
    return;
  }
  await apiDeleteSample(editingId.value);
  dialogVisible.value = false;
  void uni.showToast({ title: t('common.opSuccess'), icon: 'success' });
  await loadFirst();
}
</script>
