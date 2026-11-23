<script setup lang="ts">
import { nextTick, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChatDotRound, Close, Delete, Promotion } from '@element-plus/icons-vue';
import AiActionCard from '@/components/AiActionCard.vue';
import { useAiChat } from '@/composables/useAiChat';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const { t } = useI18n();
const {
  state,
  messagesRef,
  inputRef,
  canSend,
  canConfirm,
  send,
  confirmAction,
  cancelAction,
  removeConversation,
  close,
} = useAiChat();

function onClose(): void {
  close();
  emit('update:modelValue', false);
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      void nextTick(() => inputRef.value?.focus());
    }
  },
);
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    :with-header="false"
    size="min(440px, 100vw)"
    @close="onClose"
  >
    <div class="flex h-full flex-col">
      <header
        class="flex shrink-0 items-center justify-between border-b border-[var(--el-border-color-light)] pb-3"
      >
        <div class="flex items-center gap-2">
          <el-icon :size="18"><ChatDotRound /></el-icon>
          <span class="font-semibold">{{ t('ai.title') }}</span>
        </div>
        <div class="flex items-center gap-1">
          <el-button
            v-if="state.conversationId !== null"
            text
            circle
            :aria-label="t('ai.deleteConversation')"
            :disabled="state.sending || state.actions.some((action) => action.busy === true)"
            @click="removeConversation"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
          <el-button text circle :aria-label="t('common.close')" @click="onClose">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </header>

      <div
        ref="messagesRef"
        class="min-h-0 flex-1 space-y-3 overflow-y-auto py-3"
        aria-live="polite"
      >
        <el-empty
          v-if="state.messages.length === 0 && state.actions.length === 0"
          :description="t('ai.empty')"
          :image-size="72"
        />
        <div
          v-for="(message, index) in state.messages"
          :key="`m-${index}`"
          :class="message.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
        >
          <div
            class="max-w-[85%] whitespace-pre-wrap break-words px-3 py-2"
            :class="
              message.role === 'user'
                ? 'bg-[var(--el-color-primary)] text-white'
                : 'bg-[var(--el-fill-color-light)] text-[var(--el-text-color-primary)]'
            "
            :style="{ borderRadius: 'var(--el-border-radius-base)' }"
          >
            <template v-if="message.content !== ''">{{ message.content }}</template>
            <span v-else-if="message.pending" class="text-[var(--el-text-color-secondary)]">
              {{ t('ai.thinking') }}
            </span>
          </div>
        </div>

        <AiActionCard
          v-for="action in state.actions"
          :key="`a-${action.id}`"
          :action="action"
          :can-confirm="canConfirm(action)"
          @confirm="confirmAction(action)"
          @cancel="cancelAction(action)"
        />

        <el-alert
          v-if="state.errorText !== ''"
          :title="state.errorText"
          type="error"
          :closable="false"
          show-icon
        />
      </div>

      <footer class="shrink-0 border-t border-[var(--el-border-color-light)] pt-3">
        <el-input
          ref="inputRef"
          v-model="state.input"
          type="textarea"
          :rows="2"
          resize="none"
          :placeholder="t('ai.placeholder')"
          :aria-label="t('ai.placeholder')"
          :disabled="state.disabled"
          @keydown.enter.exact.prevent="send"
        />
        <div class="mt-2 flex items-center justify-between gap-2">
          <span class="text-xs text-[var(--el-text-color-secondary)]">
            {{ state.disabled ? t('ai.disabled') : t('ai.enterHint') }}
          </span>
          <el-button
            type="primary"
            :icon="Promotion"
            :loading="state.sending"
            :disabled="!canSend"
            :aria-label="t('ai.send')"
            @click="send"
          >
            {{ t('ai.send') }}
          </el-button>
        </div>
      </footer>
    </div>
  </el-drawer>
</template>
