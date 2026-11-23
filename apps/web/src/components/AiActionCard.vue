<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AiAction } from '@tiangong/contracts';
import { localizedAiError } from '@/composables/ai-errors';
import type { PanelAction } from '@/composables/ai-chat-state';

const props = defineProps<{ action: PanelAction; canConfirm: boolean }>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();

const { t } = useI18n();

const STATUS_KEYS: Record<AiAction['status'], string> = {
  draft: 'ai.statusAwaiting',
  awaiting_confirmation: 'ai.statusAwaiting',
  executing: 'ai.statusExecuting',
  executed: 'ai.statusExecuted',
  failed: 'ai.statusFailed',
  cancelled: 'ai.statusCancelled',
};

const label = computed(() => t(STATUS_KEYS[props.action.status]));
const tagType = computed<'info' | 'warning' | 'success' | 'danger'>(() => {
  if (props.action.status === 'executed') {
    return 'success';
  }
  if (props.action.status === 'failed') {
    return 'danger';
  }
  return props.action.status === 'cancelled' ? 'info' : 'warning';
});
const paramsText = computed(() => JSON.stringify(props.action.params, null, 2));
const errorText = computed(() => localizedAiError(t, props.action.errorCode));
</script>

<template>
  <el-card shadow="never" class="tg-ai-action">
    <div class="flex items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <el-tag size="small" :type="action.risk === 'read' ? 'info' : 'warning'">
          {{ action.risk === 'read' ? t('ai.riskRead') : t('ai.riskWrite') }}
        </el-tag>
        <span class="truncate font-mono text-xs">{{ action.method }} {{ action.path }}</span>
      </div>
      <el-tag size="small" :type="tagType">{{ label }}</el-tag>
    </div>
    <pre
      class="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words bg-[var(--el-fill-color-light)] p-2 text-xs text-[var(--el-text-color-regular)]"
      :style="{ borderRadius: 'var(--el-border-radius-base)' }"
      >{{ paramsText }}</pre>
    <div
      v-if="action.resultSummary !== undefined && action.resultSummary !== ''"
      class="mt-2 break-words text-xs text-[var(--el-text-color-secondary)]"
    >
      {{ action.resultSummary }}
    </div>
    <div v-if="action.errorCode" class="mt-2 text-xs text-[var(--el-color-danger)]">
      {{ errorText }}
    </div>
    <div v-if="action.status === 'awaiting_confirmation'" class="mt-2 flex gap-2">
      <el-button
        type="primary"
        size="small"
        :disabled="!canConfirm"
        :loading="action.busy === true"
        :title="canConfirm || action.busy === true ? undefined : t('ai.noPermission')"
        @click="emit('confirm')"
      >
        {{ t('ai.confirm') }}
      </el-button>
      <el-button size="small" :disabled="action.busy === true" @click="emit('cancel')">
        {{ t('ai.cancel') }}
      </el-button>
    </div>
  </el-card>
</template>

<style scoped>
.tg-ai-action :deep(.el-card__body) {
  padding: 12px;
}
</style>
