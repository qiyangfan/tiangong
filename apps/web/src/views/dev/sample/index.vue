<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="tg-page">
    <el-card shadow="never">
      <el-result icon="info" :title="t('dev.sampleTitle')" :sub-title="t('dev.sampleDesc')" />
    </el-card>
  </div>
</template>
