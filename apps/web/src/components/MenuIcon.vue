<script setup lang="ts">
import { computed, type Component } from 'vue';
import * as Icons from '@element-plus/icons-vue';

const props = defineProps<{ name: string | null | undefined }>();

const iconMap = Icons as unknown as Record<string, Component>;
const ALIASES: Record<string, string> = {
  log: 'Document',
  tool: 'Tools',
};

const icon = computed<Component | undefined>(() => {
  if (!props.name) {
    return undefined;
  }
  const aliased = ALIASES[props.name];
  const pascal = (aliased ?? props.name)
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  return iconMap[pascal] ?? iconMap['Menu'];
});
</script>

<template>
  <el-icon v-if="icon">
    <component :is="icon" />
  </el-icon>
</template>
