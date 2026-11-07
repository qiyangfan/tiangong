<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  total: number;
  page: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  (e: 'update:page', value: number): void;
  (e: 'update:pageSize', value: number): void;
  (e: 'change'): void;
}>();

const { t } = useI18n();

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
