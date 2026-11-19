<script setup lang="ts">
import { inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import FormDialog from '@/components/FormDialog.vue';
import { roleFormKey, type RoleDialogState, type RoleForm } from './form';

const { t } = useI18n();

// 表单对象由页面创建并经 provide 下发：字段直接绑定页面状态
const model = inject(roleFormKey) as RoleForm;

const props = defineProps<{
  dialog: RoleDialogState;
  rules: FormRules;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'submit'): void;
}>();

const formRef = ref<FormInstance>();

/** 提交前由页面调用；与 el-form 原生 validate 同语义。 */
async function validate(): Promise<boolean> {
  return (await formRef.value?.validate().catch(() => false)) === true;
}

defineExpose({ validate });
</script>

<template>
  <FormDialog
    :model-value="props.dialog.visible"
    :title="props.dialog.editingId === null ? t('common.add') : t('common.edit')"
    width="480px"
    :loading="props.loading"
    @update:model-value="emit('update:visible', $event)"
    @submit="emit('submit')"
  >
    <el-form ref="formRef" :model="model" :rules="props.rules" label-width="90px">
      <el-form-item :label="t('role.name')" prop="name">
        <el-input v-model.trim="model.name" maxlength="30" />
      </el-form-item>
      <el-form-item :label="t('role.roleKey')" prop="roleKey">
        <el-input
          v-model.trim="model.roleKey"
          :disabled="props.dialog.isBuiltin"
          :placeholder="props.dialog.isBuiltin ? t('role.builtinRoleKeyLocked') : ''"
          maxlength="100"
        />
      </el-form-item>
      <el-form-item :label="t('common.sort')">
        <el-input-number v-model="model.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item :label="t('common.status')">
        <el-switch v-model="model.enabled" />
      </el-form-item>
      <el-form-item :label="t('common.remark')">
        <el-input v-model="model.remark" type="textarea" :rows="2" maxlength="500" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>
