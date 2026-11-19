<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Delete, Plus, View } from '@element-plus/icons-vue';
import type { GenDefinitionItem, GenPreviewFile } from '@tiangong/contracts';
import { apiCreateGenDefinition, apiPreviewGenDraft, apiUpdateGenDefinition } from '@/api/gen';
import FormDialog from '@/components/FormDialog.vue';
import PreviewDialog from './PreviewDialog.vue';
import {
  buildFieldRules,
  buildGenRules,
  emptyRow,
  FIELD_TYPES,
  fillGenForm,
  toRequest,
  type GenForm,
  type GenRequest,
} from './form';

const { t } = useI18n();
const visible = defineModel<boolean>({ required: true });
const props = defineProps<{ editing: GenDefinitionItem | null }>();
const emit = defineEmits<{ saved: [] }>();

const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive<GenForm>({ name: '', displayName: '', remark: '', fields: [emptyRow()] });
const rules = buildGenRules(t);
const fieldRules = buildFieldRules(t);

watch(visible, (open) => {
  if (open) {
    fillGenForm(form, props.editing);
  }
});

function addField(): void {
  form.fields.push(emptyRow());
}

function removeField(index: number): void {
  form.fields.splice(index, 1);
}

/** 校通过后转契约请求；未通过或字段全空返回 null。 */
async function checkedRequest(): Promise<GenRequest | null> {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) {
    return null;
  }
  return toRequest(form, t);
}

/** 按编辑态分流创建/更新；编辑态不允许改模块名。 */
async function save(request: GenRequest): Promise<void> {
  if (props.editing === null) {
    await apiCreateGenDefinition(request);
  } else {
    await apiUpdateGenDefinition(props.editing.id, { ...request, name: undefined });
  }
  visible.value = false;
  ElMessage.success(t('common.opSuccess'));
  emit('saved');
}

async function submit(): Promise<void> {
  const request = await checkedRequest();
  if (request === null) {
    return;
  }
  submitting.value = true;
  try {
    await save(request);
  } finally {
    submitting.value = false;
  }
}

const previewVisible = ref(false);
const previewFiles = ref<GenPreviewFile[]>([]);
const previewActive = ref('');

/** 编辑中的草稿直接预览（先过校验）。 */
async function onPreviewDraft(): Promise<void> {
  const request = await checkedRequest();
  if (request === null) {
    return;
  }
  previewFiles.value = await apiPreviewGenDraft(request);
  previewActive.value = previewFiles.value[0]?.path ?? '';
  previewVisible.value = true;
}
</script>

<template>
  <FormDialog
    v-model="visible"
    :title="props.editing === null ? t('dev.gen.addTitle') : t('dev.gen.editTitle')"
    width="960px"
    :loading="submitting"
    :confirm-text="t('common.save')"
    @submit="submit"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item :label="t('dev.gen.moduleName')" prop="name">
        <el-input
          v-model.trim="form.name"
          :disabled="props.editing !== null"
          maxlength="50"
          placeholder="user-profile"
        />
        <div class="tg-form-tip">{{ t('dev.gen.moduleTip') }}</div>
      </el-form-item>
      <el-form-item :label="t('dev.gen.displayName')" prop="displayName">
        <el-input v-model.trim="form.displayName" maxlength="50" />
      </el-form-item>
      <el-form-item :label="t('dev.gen.fields')">
        <el-table :data="form.fields" size="small" class="w-full">
          <el-table-column :label="t('dev.gen.fieldName')" min-width="130">
            <template #default="{ $index }">
              <el-form-item :rules="fieldRules.name" :prop="`fields.${$index}.name`" class="mb-0">
                <el-input v-model.trim="form.fields[$index]!.name" placeholder="userName" />
              </el-form-item>
            </template>
          </el-table-column>
          <el-table-column :label="t('dev.gen.label')" min-width="120">
            <template #default="{ $index }">
              <el-form-item :rules="fieldRules.label" :prop="`fields.${$index}.label`" class="mb-0">
                <el-input v-model.trim="form.fields[$index]!.label" />
              </el-form-item>
            </template>
          </el-table-column>
          <el-table-column :label="t('dev.gen.fieldType')" width="110">
            <template #default="{ $index }">
              <el-select v-model="form.fields[$index]!.type" size="small">
                <el-option
                  v-for="ft in FIELD_TYPES"
                  :key="ft"
                  :label="t(`dev.gen.fieldTypes.${ft}`)"
                  :value="ft"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column
            v-if="form.fields.some((f) => f.type === 'enum')"
            :label="t('dev.gen.enumOptions')"
            min-width="140"
          >
            <template #default="{ $index }">
              <el-input
                v-if="form.fields[$index]!.type === 'enum'"
                v-model.trim="form.fields[$index]!.enumText"
                size="small"
                placeholder="a,b,c"
              />
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column :label="t('dev.gen.required')" width="70" align="center">
            <template #default="{ $index }">
              <el-switch v-model="form.fields[$index]!.required" size="small" />
            </template>
          </el-table-column>
          <el-table-column :label="t('dev.gen.inList')" width="70" align="center">
            <template #default="{ $index }">
              <el-switch v-model="form.fields[$index]!.inList" size="small" />
            </template>
          </el-table-column>
          <el-table-column :label="t('dev.gen.inForm')" width="70" align="center">
            <template #default="{ $index }">
              <el-switch v-model="form.fields[$index]!.inForm" size="small" />
            </template>
          </el-table-column>
          <el-table-column :label="t('dev.gen.searchable')" width="70" align="center">
            <template #default="{ $index }">
              <el-switch v-model="form.fields[$index]!.searchable" size="small" />
            </template>
          </el-table-column>
          <el-table-column width="50" align="center">
            <template #default="{ $index }">
              <el-button
                link
                type="danger"
                :icon="Delete"
                :disabled="form.fields.length <= 1"
                @click="removeField($index)"
              />
            </template>
          </el-table-column>
        </el-table>
        <el-button class="mt-2" size="small" :icon="Plus" @click="addField">
          {{ t('dev.gen.addField') }}
        </el-button>
      </el-form-item>
      <el-form-item :label="t('common.remark')">
        <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" />
      </el-form-item>
      <el-form-item label-width="0">
        <el-button v-permission="'gen:preview'" :icon="View" @click="onPreviewDraft">
          {{ t('dev.gen.preview') }}
        </el-button>
      </el-form-item>
    </el-form>
  </FormDialog>

  <PreviewDialog v-model="previewVisible" v-model:active="previewActive" :files="previewFiles" />
</template>
