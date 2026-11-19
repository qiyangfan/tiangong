<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { PermissionGroup } from '@tiangong/contracts';
import FormDialog from '@/components/FormDialog.vue';

const { t } = useI18n();

/**
 * 已授权限按「资源:动作」键值编辑：页面持有勾选键数组，键与权限点 id 的互转由页面完成。
 */
const props = defineProps<{
  visible: boolean;
  roleName: string;
  groups: PermissionGroup[];
  checked: string[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'update:checked', value: string[]): void;
  (e: 'submit'): void;
}>();

function onChecked(value: string[]): void {
  emit('update:checked', value);
}
</script>

<template>
  <FormDialog
    :model-value="props.visible"
    :title="`${t('role.assignTitle')}：${props.roleName}`"
    width="560px"
    :confirm-text="t('common.save')"
    :loading="props.loading"
    @update:model-value="emit('update:visible', $event)"
    @submit="emit('submit')"
  >
    <el-scrollbar max-height="420px">
      <el-checkbox-group :model-value="props.checked" @update:model-value="onChecked">
        <div v-for="group in props.groups" :key="group.resource" class="tg-role__perm-group">
          <div class="tg-role__perm-group-title">{{ group.name }}（{{ group.resource }}）</div>
          <el-checkbox
            v-for="p in group.permissions"
            :key="p.id"
            :value="`${p.resource}:${p.action}`"
          >
            {{ p.name }}
          </el-checkbox>
        </div>
      </el-checkbox-group>
    </el-scrollbar>
  </FormDialog>
</template>

<style scoped>
.tg-role__perm-group {
  margin-bottom: 12px;
}

.tg-role__perm-group-title {
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--el-text-color-primary);
}
</style>
