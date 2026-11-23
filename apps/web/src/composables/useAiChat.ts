import { computed, nextTick, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiAiStatus } from '@/api/ai';
import { useAuthStore } from '@/stores/auth';
import { createChatActions } from './ai-chat-actions';
import { createEventHandlers } from './ai-chat-events';
import { createChatState } from './ai-chat-state';

function scrollTo(ref: Ref<HTMLElement | undefined>): void {
  void nextTick(() => {
    const element = ref.value;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  });
}

/** AI 面板入口：组合状态、事件与动作，供抽屉组件直接消费。 */
export function useAiChat() {
  const scope = { t: useI18n().t, auth: useAuthStore() };
  const state = createChatState();
  const refs = {
    messages: ref<HTMLElement>(),
    input: ref<{ focus: () => void }>(),
  };
  const context = {
    state,
    t: scope.t,
    auth: scope.auth,
    scroll: () => {
      scrollTo(refs.messages);
    },
    controller: { current: null as AbortController | null },
  };
  const events = createEventHandlers(context);
  const actions = createChatActions({ ...context, ...events });
  const canSend = computed(() => !state.disabled && !state.sending && state.input.trim() !== '');

  onMounted(async () => {
    try {
      state.disabled = !(await apiAiStatus()).enabled;
    } catch {
      // 状态探测失败不阻断；发送时仍由服务端裁决
    }
    void nextTick(() => refs.input.value?.focus());
  });

  onBeforeUnmount(actions.close);

  return {
    state,
    messagesRef: refs.messages,
    inputRef: refs.input,
    canSend,
    ...events,
    ...actions,
  };
}
