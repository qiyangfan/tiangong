<script setup lang="ts">
import { computed } from 'vue';
import type { DictOption } from '@tiangong/contracts';

const props = defineProps<{
  options: DictOption[];
  value: string | number | null | undefined;
}>();

const matched = computed(() => props.options.find((o) => o.value === String(props.value ?? '')));
</script>

<template>
  <el-tag v-if="matched" :type="matched.tagType ?? 'info'" disable-transitions>
    {{ matched.label }}
  </el-tag>
  <span v-else>{{ value ?? '-' }}</span>
</template>
