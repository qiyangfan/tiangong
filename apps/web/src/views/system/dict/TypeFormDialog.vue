<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import type { DictTypeItem } from '@tiangong/contracts';
import { apiCreateDictType, apiUpdateDictType } from '@/api/dict';
import FormDialog from '@/components/FormDialog.vue';

const { t } = useI18n();
const visible = defineModel<boolean>({ required: true });
const props = defineProps<{ editing: DictTypeItem | null }>();
const emit = defineEmits<{ saved: [] }>();

const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive({ name: '', dictKey: '', enabled: true, remark: '' });

const rules: FormRules = {
  name: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('dict.typeName') }),
      trigger: 'blur',
    },
  ],
  dictKey: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('dict.dictKey') }),
      trigger: 'blur',
    },
    { pattern: /^[a-z][a-z0-9_]{1,99}$/, message: 'lower snake_case', trigger: 'blur' },
  ],
};

/** 新建与编辑共用回填，避免两套字面量。 */
function fill(row: DictTypeItem | null): void {
  Object.assign(form, {
    name: row?.name ?? '',
    dictKey: row?.dictKey ?? '',
    enabled: row?.enabled ?? true,
    remark: row?.remark ?? '',
  });
}

watch(visible, (open) => {
  if (open) {
    fill(props.editing);
  }
});

/** 按编辑态分流创建/更新；remark 契约只允许省略，不允许置 null。 */
async function save(): Promise<void> {
  const body = {
    name: form.name,
    enabled: form.enabled,
    remark: form.remark === '' ? undefined : form.remark,
  };
  if (props.editing === null) {
    await apiCreateDictType({ ...body, dictKey: form.dictKey });
  } else {
    await apiUpdateDictType(props.editing.id, body);
  }
  visible.value = false;
  ElMessage.success(t('common.opSuccess'));
  emit('saved');
}

async function submit(): Promise<void> {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) {
    return;
  }
  submitting.value = true;
  try {
    await save();
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <FormDialog
    v-model="visible"
    :title="props.editing === null ? t('dict.addTypeTitle') : t('dict.editTypeTitle')"
    width="480px"
    :loading="submitting"
    @submit="submit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item :label="t('dict.typeName')" prop="name">
        <el-input v-model.trim="form.name" maxlength="100" />
      </el-form-item>
      <el-form-item :label="t('dict.dictKey')" prop="dictKey">
        <el-input
          v-model.trim="form.dictKey"
          :disabled="props.editing !== null"
          maxlength="100"
          placeholder="sys_xxx"
        />
      </el-form-item>
      <el-form-item :label="t('common.status')">
        <el-switch v-model="form.enabled" />
      </el-form-item>
      <el-form-item :label="t('common.remark')">
        <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>
