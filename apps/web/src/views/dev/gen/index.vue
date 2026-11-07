<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Delete, Plus, View } from '@element-plus/icons-vue';
import type { GenDefinitionItem, GenFieldType, GenPreviewFile } from '@tiangong/contracts';
import {
  apiCreateGenDefinition,
  apiDeleteGenDefinition,
  apiListGenDefinitions,
  apiPreviewGenById,
  apiPreviewGenDraft,
  apiUpdateGenDefinition,
} from '@/api/gen';
import FormDialog from '@/components/FormDialog.vue';
import RightToolbar from '@/components/RightToolbar.vue';
import SearchForm from '@/components/SearchForm.vue';
import { confirmDelete } from '@/utils/confirm';
import { formatDateTime } from '@/utils/datetime';

const { t } = useI18n();

const FIELD_TYPES: GenFieldType[] = [
  'string',
  'text',
  'integer',
  'decimal',
  'boolean',
  'enum',
  'datetime',
];

/** 字段编辑行：enumOptions 以逗号串编辑，提交时拆分。 */
interface FieldRow {
  name: string;
  label: string;
  type: GenFieldType;
  required: boolean;
  inList: boolean;
  inForm: boolean;
  searchable: boolean;
  enumText: string;
}

function emptyRow(): FieldRow {
  return {
    name: '',
    label: '',
    type: 'string',
    required: true,
    inList: true,
    inForm: true,
    searchable: false,
    enumText: '',
  };
}

const loading = ref(false);
const rows = ref<GenDefinitionItem[]>([]);
const keyword = ref('');
const showSearch = ref(true);

async function getList(): Promise<void> {
  loading.value = true;
  try {
    rows.value = await apiListGenDefinitions(keyword.value);
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  void getList();
}

function onReset(): void {
  keyword.value = '';
  onSearch();
}

const dialog = reactive({ visible: false, editingId: null as number | null });
const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive({ name: '', displayName: '', remark: '', fields: [] as FieldRow[] });

const fieldRules: FormRules = {
  name: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('dev.gen.fieldName') }),
      trigger: 'blur',
    },
    { pattern: /^[a-z][a-zA-Z0-9]*$/, message: 'lower camelCase', trigger: 'blur' },
  ],
  label: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('dev.gen.label') }),
      trigger: 'blur',
    },
  ],
};

const rules: FormRules = {
  name: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('dev.gen.moduleName') }),
      trigger: 'blur',
    },
    { pattern: /^[a-z][a-z0-9-]*$/, message: 'kebab-case', trigger: 'blur' },
  ],
  displayName: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('dev.gen.displayName') }),
      trigger: 'blur',
    },
  ],
};

function openCreate(): void {
  dialog.editingId = null;
  Object.assign(form, { name: '', displayName: '', remark: '', fields: [emptyRow()] });
  dialog.visible = true;
}

function openEdit(row: GenDefinitionItem): void {
  dialog.editingId = row.id;
  Object.assign(form, {
    name: row.name,
    displayName: row.displayName,
    remark: row.remark ?? '',
    fields: row.fields.map((f) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      required: f.required,
      inList: f.inList,
      inForm: f.inForm,
      searchable: f.searchable,
      enumText: f.enumOptions.join(','),
    })),
  });
  dialog.visible = true;
}

function addField(): void {
  form.fields.push(emptyRow());
}

function removeField(index: number): void {
  form.fields.splice(index, 1);
}

/** 表单 → 契约请求（enum 选项拆分；未填行剔除）。 */
function toRequest():
  | { name: string; displayName: string; fields: GenDefinitionItem['fields']; remark?: string }
  | null {
  const fields = form.fields
    .filter((f) => f.name !== '' || f.label !== '')
    .map((f) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      required: f.required,
      inList: f.inList,
      inForm: f.inForm,
      searchable: f.searchable,
      enumOptions:
        f.type === 'enum'
          ? f.enumText
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
    }));
  if (fields.length === 0) {
    ElMessage.warning(t('dev.gen.fields'));
    return null;
  }
  return {
    name: form.name,
    displayName: form.displayName,
    fields,
    remark: form.remark === '' ? undefined : form.remark,
  };
}

async function submit(): Promise<void> {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) {
    return;
  }
  const request = toRequest();
  if (request === null) {
    return;
  }
  submitting.value = true;
  try {
    if (dialog.editingId === null) {
      await apiCreateGenDefinition(request);
    } else {
      await apiUpdateGenDefinition(dialog.editingId, { ...request, name: undefined });
    }
    dialog.visible = false;
    ElMessage.success(t('common.opSuccess'));
    await getList();
  } finally {
    submitting.value = false;
  }
}

// ---- 预览 ----
const previewVisible = ref(false);
const previewFiles = ref<GenPreviewFile[]>([]);
const previewActive = ref('');

function baseName(p: string): string {
  return p.split('/').slice(-1)[0] ?? p;
}

async function onPreview(row: GenDefinitionItem): Promise<void> {
  previewFiles.value = await apiPreviewGenById(row.id);
  previewActive.value = baseName(previewFiles.value[0]?.path ?? '');
  previewVisible.value = true;
}

/** 编辑中的草稿直接预览（先过校验）。 */
async function onPreviewDraft(): Promise<void> {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) {
    return;
  }
  const request = toRequest();
  if (request === null) {
    return;
  }
  previewFiles.value = await apiPreviewGenDraft(request);
  previewActive.value = baseName(previewFiles.value[0]?.path ?? '');
  previewVisible.value = true;
}

async function onDelete(row: GenDefinitionItem): Promise<void> {
  try {
    await confirmDelete();
  } catch {
    return;
  }
  await apiDeleteGenDefinition(row.id);
  ElMessage.success(t('common.opSuccess'));
  await getList();
}

onMounted(() => {
  void getList();
});
</script>

<template>
  <div class="tg-page">
    <SearchForm v-show="showSearch" @search="onSearch" @reset="onReset">
      <el-form-item :label="t('common.keyword')">
        <el-input
          v-model.trim="keyword"
          :placeholder="t('dev.gen.moduleName') + '/' + t('dev.gen.displayName')"
          clearable
          style="width: 220px"
          @keyup.enter="onSearch"
        />
      </el-form-item>
    </SearchForm>

    <el-card shadow="never" class="tg-table-card">
      <div class="tg-toolbar">
        <div class="tg-toolbar__actions">
          <el-button v-permission="'gen:create'" type="primary" :icon="Plus" @click="openCreate">
            {{ t('common.add') }}
          </el-button>
        </div>
        <RightToolbar v-model:show-search="showSearch" @refresh="getList" />
      </div>

      <el-table v-loading="loading" :data="rows" row-key="id">
        <el-table-column :label="t('dev.gen.moduleName')" prop="name" min-width="140">
          <template #default="{ row }">
            <span class="font-mono">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('dev.gen.displayName')" prop="displayName" min-width="140" />
        <el-table-column :label="t('dev.gen.fields')" width="90" align="center">
          <template #default="{ row }">{{ row.fields.length }}</template>
        </el-table-column>
        <el-table-column
          :label="t('common.remark')"
          prop="remark"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column :label="t('common.updatedAt')" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              v-permission="'gen:preview'"
              link
              type="primary"
              :icon="View"
              @click="onPreview(row)"
            >
              {{ t('dev.gen.preview') }}
            </el-button>
            <el-button v-permission="'gen:update'" link type="primary" @click="openEdit(row)">
              {{ t('common.edit') }}
            </el-button>
            <el-button v-permission="'gen:delete'" link type="danger" @click="onDelete(row)">
              {{ t('common.delete') }}
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="t('common.noData')" :image-size="60" />
        </template>
      </el-table>
    </el-card>

    <FormDialog
      v-model="dialog.visible"
      :title="dialog.editingId === null ? t('dev.gen.addTitle') : t('dev.gen.editTitle')"
      width="960px"
      :loading="submitting"
      :confirm-text="t('common.save')"
      @submit="submit"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item :label="t('dev.gen.moduleName')" prop="name">
          <el-input
            v-model.trim="form.name"
            :disabled="dialog.editingId !== null"
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
                <el-form-item
                  :rules="fieldRules.name"
                  :prop="`fields.${$index}.name`"
                  class="mb-0"
                >
                  <el-input v-model.trim="form.fields[$index]!.name" placeholder="userName" />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column :label="t('dev.gen.label')" min-width="120">
              <template #default="{ $index }">
                <el-form-item
                  :rules="fieldRules.label"
                  :prop="`fields.${$index}.label`"
                  class="mb-0"
                >
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

    <el-dialog v-model="previewVisible" :title="t('dev.gen.previewTitle')" width="860px" top="5vh">
      <el-tabs v-model="previewActive">
        <el-tab-pane
          v-for="f in previewFiles"
          :key="f.path"
          :label="baseName(f.path)"
          :name="baseName(f.path)"
        >
          <div class="tg-form-tip">{{ f.path }}</div>
          <pre class="max-h-[60vh] overflow-auto rounded bg-[var(--el-fill-color-light)] p-3 text-xs leading-5">{{ f.content }}</pre>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>
