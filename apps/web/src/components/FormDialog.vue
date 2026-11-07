<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    /** 宽度档位沿用各页现值（420/440/460/480/500/520/560px） */
    width?: string;
    /** 确定按钮提交中态 */
    loading?: boolean;
    /** 确定按钮文案，默认「提交」；保存语义传 t('common.save') */
    confirmText?: string;
    /** 嵌套场景（如抽屉内弹窗）需置 true */
    appendToBody?: boolean;
  }>(),
  { width: '520px', loading: false, appendToBody: false, confirmText: undefined },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit'): void;
}>();

const { t } = useI18n();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const confirmLabel = computed(() => props.confirmText ?? t('common.submit'));
</script>

<template>
  <!-- 统一表单弹窗（UI_STYLEGUIDE 标准件）：close-on-click-modal 默认关闭，防误点丢输入 -->
  <el-dialog
    v-model="visible"
    :title="title"
    :width="width"
    :close-on-click-modal="false"
    :append-to-body="appendToBody"
  >
    <slot />
    <template #footer>
      <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="loading" @click="emit('submit')">
        {{ confirmLabel }}
      </el-button>
    </template>
  </el-dialog>
</template>
