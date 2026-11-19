<script setup lang="ts">
import { inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import type { RoleItem } from '@tiangong/contracts';
import FormDialog from '@/components/FormDialog.vue';
import { userFormKey, type UserForm } from './form';

const { t } = useI18n();

// 表单对象由页面创建并经 provide 下发：字段直接双向绑定页面状态，不另起一份拷贝
const model = inject(userFormKey) as UserForm;

const props = defineProps<{
  visible: boolean;
  rules: FormRules;
  /** null 表示新建；非空时用户名锁定且不展示密码项 */
  editingId: number | null;
  roleOptions: RoleItem[];
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
    :model-value="props.visible"
    :title="props.editingId === null ? t('user.createTitle') : t('user.editTitle')"
    width="520px"
    :loading="props.loading"
    @update:model-value="emit('update:visible', $event)"
    @submit="emit('submit')"
  >
    <el-form ref="formRef" :model="model" :rules="props.rules" label-width="90px">
      <el-form-item :label="t('user.username')" prop="username">
        <el-input
          v-model.trim="model.username"
          :disabled="props.editingId !== null"
          maxlength="30"
        />
      </el-form-item>
      <el-form-item :label="t('user.nickname')" prop="nickname">
        <el-input v-model.trim="model.nickname" maxlength="30" />
      </el-form-item>
      <el-form-item v-if="props.editingId === null" :label="t('user.password')" prop="password">
        <el-input v-model="model.password" type="password" show-password maxlength="72" />
      </el-form-item>
      <el-form-item :label="t('user.email')" prop="email">
        <el-input v-model.trim="model.email" maxlength="100" />
      </el-form-item>
      <el-form-item :label="t('user.phone')" prop="phone">
        <el-input v-model.trim="model.phone" maxlength="20" />
      </el-form-item>
      <el-form-item :label="t('user.roleLabel')">
        <el-select v-model="model.roleIds" multiple style="width: 100%">
          <el-option
            v-for="r in props.roleOptions"
            :key="r.id"
            :label="r.name"
            :value="r.id"
            :disabled="!r.enabled"
          />
        </el-select>
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
