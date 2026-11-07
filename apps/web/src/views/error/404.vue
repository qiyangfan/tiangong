<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <div class="tg-404">
    <el-result
      icon="warning"
      :title="t('error.notFoundTitle')"
      :sub-title="t('error.notFoundDesc')"
    >
      <template #extra>
        <el-button type="primary" @click="router.push('/')">{{ t('error.backHome') }}</el-button>
      </template>
    </el-result>
  </div>
</template>

<style scoped>
.tg-404 {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
