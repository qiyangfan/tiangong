<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Search, RefreshLeft } from '@element-plus/icons-vue';

defineEmits<{
  (e: 'search'): void;
  (e: 'reset'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <!-- 统一搜索区（UI_STYLEGUIDE 标准件）：各页字段经默认插槽传入 -->
  <el-card shadow="never" class="tg-search-card">
    <el-form inline @submit.prevent>
      <slot />
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="$emit('search')">
          {{ t('common.search') }}
        </el-button>
        <el-button :icon="RefreshLeft" @click="$emit('reset')">{{ t('common.reset') }}</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>
