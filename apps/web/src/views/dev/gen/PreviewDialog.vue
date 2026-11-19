<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { GenPreviewFile } from '@tiangong/contracts';

const { t } = useI18n();
const visible = defineModel<boolean>({ required: true });
const active = defineModel<string>('active', { required: true });
defineProps<{ files: GenPreviewFile[] }>();

function baseName(p: string): string {
  return p.split('/').slice(-1)[0] ?? p;
}
</script>

<template>
  <el-dialog v-model="visible" :title="t('dev.gen.previewTitle')" width="860px" top="5vh">
    <el-tabs v-model="active">
      <el-tab-pane v-for="f in files" :key="f.path" :label="baseName(f.path)" :name="f.path">
        <div class="tg-form-tip">{{ f.path }}</div>
        <pre
          class="max-h-[60vh] overflow-auto rounded bg-[var(--el-fill-color-light)] p-3 text-xs leading-5"
          >{{ f.content }}</pre>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>
