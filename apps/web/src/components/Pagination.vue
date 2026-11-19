<script setup lang="ts">
import { nextTick, onMounted, ref, watch, type ComponentPublicInstance } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps<{
  total: number;
  page: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  (e: 'update:page' | 'update:pageSize', value: number): void;
  (e: 'change'): void;
}>();

const { t } = useI18n();

// Element Plus 的每页条数选择器不暴露 aria-label，这里在包装层补齐可访问名称
const root = ref<ComponentPublicInstance | null>(null);

function labelPageSize(): void {
  const el = root.value?.$el as HTMLElement | undefined;
  el?.querySelectorAll<HTMLInputElement>('.el-pagination__sizes input').forEach((input) => {
    input.setAttribute('aria-label', t('common.pageSize'));
  });
}

onMounted(() => void nextTick(labelPageSize));
watch(() => t('common.pageSize'), labelPageSize);

function onCurrentChange(page: number): void {
  emit('update:page', page);
  emit('change');
}

function onSizeChange(pageSize: number): void {
  // 翻页尺寸变化回到第一页，避免落在超出范围的页码上
  emit('update:pageSize', pageSize);
  emit('update:page', 1);
  emit('change');
}
</script>

<template>
  <el-pagination
    ref="root"
    class="tg-pagination"
    background
    :current-page="page"
    :page-size="pageSize"
    :page-sizes="[10, 20, 50, 100]"
    :total="total"
    :layout="'total, sizes, prev, pager, next'"
    :aria-label="t('common.total', { total })"
    @current-change="onCurrentChange"
    @size-change="onSizeChange"
  />
</template>
