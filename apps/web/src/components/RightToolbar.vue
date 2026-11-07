<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Hide, Operation, Refresh, Search } from '@element-plus/icons-vue';

export interface ToolbarColumn {
  key: string;
  label: string;
}

const props = defineProps<{
  columns?: ToolbarColumn[];
  visibleCols?: Record<string, boolean>;
  showSearch?: boolean;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'update:visibleCols', value: Record<string, boolean>): void;
  (e: 'update:showSearch', value: boolean): void;
}>();

const { t } = useI18n();

function toggleColumn(key: string, checked: boolean | string | number): void {
  emit('update:visibleCols', { ...(props.visibleCols ?? {}), [key]: Boolean(checked) });
}

function isChecked(key: string): boolean {
  return props.visibleCols?.[key] ?? true;
}
</script>

<template>
  <div class="tg-right-toolbar">
    <el-tooltip v-if="showSearch !== undefined" :content="t('common.search')" placement="top">
      <el-button
        circle
        :icon="showSearch ? Search : Hide"
        @click="emit('update:showSearch', !showSearch)"
      />
    </el-tooltip>
    <el-tooltip :content="t('common.refresh')" placement="top">
      <el-button circle :icon="Refresh" @click="emit('refresh')" />
    </el-tooltip>
    <el-popover
      v-if="columns && columns.length > 0"
      placement="bottom-end"
      width="140"
      trigger="click"
    >
      <template #reference>
        <el-button circle :icon="Operation" />
      </template>
      <el-checkbox
        v-for="col in columns"
        :key="col.key"
        :model-value="isChecked(col.key)"
        @change="(v: boolean | string | number) => toggleColumn(col.key, v)"
      >
        {{ col.label }}
      </el-checkbox>
    </el-popover>
  </div>
</template>

<style scoped>
.tg-right-toolbar {
  display: flex;
  gap: 8px;
}
</style>
