import type { GenFieldDef } from '@tiangong/contracts';
import type { GenRenderInput } from './naming';
import { pascalCase, searchableFields } from './naming';

/** 搜索区控件（searchable 且 string/text → input；enum → select）。 */
function searchControl(field: GenFieldDef): string | null {
  if (!field.searchable) {
    return null;
  }
  if (field.type === 'enum') {
    return `      <el-form-item :label="L.${field.name}">
        <el-select v-model="query.${field.name}" clearable style="width: 160px">
          <el-option v-for="o in FIELD_OPTIONS.${field.name}" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>`;
  }
  if (field.type === 'string' || field.type === 'text') {
    return `      <el-form-item :label="L.${field.name}">
        <el-input
          v-model.trim="query.${field.name}"
          clearable
          style="width: 200px"
          @keyup.enter="onSearch"
        />
      </el-form-item>`;
  }
  return null;
}

/** 表格列渲染（inList）。 */
function tableColumn(field: GenFieldDef): string {
  const label = `"L.${field.name}"`;
  if (field.type === 'enum') {
    return `        <el-table-column :label=${label} width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" disable-transitions>{{ enumLabel('${field.name}', row.${field.name}) }}</el-tag>
          </template>
        </el-table-column>`;
  }
  if (field.type === 'boolean') {
    return `        <el-table-column :label=${label} width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.${field.name} ? 'success' : 'info'" size="small" disable-transitions>
              {{ row.${field.name} ? t('common.enabled') : t('common.disabled') }}
            </el-tag>
          </template>
        </el-table-column>`;
  }
  if (field.type === 'datetime') {
    return `        <el-table-column :label=${label} min-width="160">
          <template #default="{ row }">{{ row.${field.name} ? formatDateTime(row.${field.name}) : '-' }}</template>
        </el-table-column>`;
  }
  const align = field.type === 'decimal' || field.type === 'integer' ? ' align="right"' : '';
  const width = field.type === 'decimal' || field.type === 'integer' ? ' width="120"' : '';
  return `        <el-table-column :label=${label} prop="${field.name}"${width} min-width="140" show-overflow-tooltip${align} />`;
}

/** 表单控件（inForm）。 */
function formItem(field: GenFieldDef): string {
  const label = `:label="L.${field.name}"`;
  const prop = `prop="${field.name}"`;
  const required = field.required ? ` :rules="rules.${field.name}"` : '';
  switch (field.type) {
    case 'string':
      return `        <el-form-item ${label} ${prop}${required}>
          <el-input v-model.trim="form.${field.name}" maxlength="100" />
        </el-form-item>`;
    case 'text':
      return `        <el-form-item ${label} ${prop}${required}>
          <el-input v-model.trim="form.${field.name}" type="textarea" :rows="2" maxlength="2000" />
        </el-form-item>`;
    case 'integer':
      return `        <el-form-item ${label} ${prop}${required}>
          <el-input-number v-model="form.${field.name}" :precision="0" :step="1" controls-position="right" style="width: 100%" />
        </el-form-item>`;
    case 'decimal':
      return `        <el-form-item ${label} ${prop}${required}>
          <el-input-number v-model="form.${field.name}" :min="0" :precision="2" :step="1" controls-position="right" style="width: 100%" />
        </el-form-item>`;
    case 'boolean':
      return `        <el-form-item ${label} ${prop}${required}>
          <el-switch v-model="form.${field.name}" />
        </el-form-item>`;
    case 'enum':
      return `        <el-form-item ${label} ${prop}${required}>
          <el-select v-model="form.${field.name}" clearable style="width: 100%">
            <el-option v-for="o in FIELD_OPTIONS.${field.name}" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>`;
    case 'datetime':
      return `        <el-form-item ${label} ${prop}${required}>
          <el-date-picker v-model="form.${field.name}" type="datetime" value-format="x" style="width: 100%" />
        </el-form-item>`;
  }
}

/** 表单初始值行。 */
function formValueInit(field: GenFieldDef): string {
  switch (field.type) {
    case 'string':
    case 'text':
    case 'enum':
      return `  ${field.name}: '',`;
    case 'integer':
    case 'decimal':
      return `  ${field.name}: undefined as number | undefined,`;
    case 'boolean':
      return `  ${field.name}: true,`;
    case 'datetime':
      return `  ${field.name}: '' as string | number,`;
  }
}

/** 提交时的字段转换（decimal→定长小数串；datetime→ISO）。 */
function submitConvert(field: GenFieldDef): string {
  switch (field.type) {
    case 'string':
    case 'text':
    case 'enum':
      return `      ${field.name}: form.${field.name} === '' ? undefined : form.${field.name},`;
    case 'integer':
      return `      ${field.name}: form.${field.name},`;
    case 'decimal':
      return `      ${field.name}: form.${field.name} === undefined ? undefined : form.${field.name}.toFixed(2),`;
    case 'boolean':
      return `      ${field.name}: form.${field.name},`;
    case 'datetime':
      return `      ${field.name}: form.${field.name} === '' ? undefined : new Date(form.${field.name} as string | number).toISOString(),`;
  }
}

function requiredRule(field: GenFieldDef): string {
  return `  ${field.name}: [
    { required: true, message: () => t('common.pleaseInput', { field: L.${field.name} }), trigger: 'blur' },
  ],`;
}

/** enum 字段的选项常量行。 */
function enumOptionConst(field: GenFieldDef): string {
  const entries = field.enumOptions.map((o) => `  { label: '${o}', value: '${o}' },`).join('\n');
  return `  ${field.name}: [
${entries}
  ],`;
}

function labelConst(def: GenRenderInput, locale: 'zh' | 'en'): string {
  const lines = def.fields.map((f) => `  ${f.name}: '${f.label}',`).join('\n');
  const titles =
    locale === 'zh'
      ? `  addTitle: '新增${def.displayName}',
  editTitle: '修改${def.displayName}',`
      : `  addTitle: 'Add ${def.displayName}',
  editTitle: 'Edit ${def.displayName}',`;
  return `const ${locale === 'zh' ? 'ZH' : 'EN'}: LabelMap = {
${lines}
${titles}
};`;
}

/** web api 封装产物。 */
export function renderWebApi(def: GenRenderInput): string {
  const pascal = pascalCase(def.name);
  return `import type {
  Create${pascal}Request,
  ${pascal}Item,
  ${pascal}Query,
  PageResult,
  Update${pascal}Request,
} from '@tiangong/contracts';
import { http, type QueryParams } from '@/utils/request';

export function apiList${pascal}(query: ${pascal}Query): Promise<PageResult<${pascal}Item>> {
  return http.get('/${def.name}', { params: query as QueryParams });
}

export function apiGet${pascal}(id: number): Promise<${pascal}Item> {
  return http.get(\`/${def.name}/\${id}\`);
}

export function apiCreate${pascal}(data: Create${pascal}Request): Promise<${pascal}Item> {
  return http.post('/${def.name}', data);
}

export function apiUpdate${pascal}(id: number, data: Update${pascal}Request): Promise<${pascal}Item> {
  return http.patch(\`/${def.name}/\${id}\`, data);
}

export function apiDelete${pascal}(id: number): Promise<void> {
  return http.delete(\`/${def.name}/\${id}\`);
}
`;
}

/** web 五段式页面产物。字段标签走 locale 驱动的本地映射（生成器不注入 locales 源文件），公共键走全局 t()。 */
export function renderWebPage(def: GenRenderInput): string {
  const pascal = pascalCase(def.name);
  const searchControls = searchableFields(def.fields)
    .map(searchControl)
    .filter((s): s is string => s !== null)
    .join('\n');
  const listFields = def.fields.filter((f) => f.inList);
  const formFields = def.fields.filter((f) => f.inForm);
  const columns = listFields.map(tableColumn).join('\n');
  const formItems = formFields.map(formItem).join('\n');
  const formInit = formFields.map(formValueInit).join('\n');
  const submitLines = formFields.map(submitConvert).join('\n');
  const requiredFields = formFields.filter(
    (f) => f.required && !['boolean', 'datetime'].includes(f.type),
  );
  const rules = requiredFields.map(requiredRule).join('\n');
  const enumConsts = def.fields.filter((f) => f.type === 'enum').map(enumOptionConst).join('\n');
  const hasEnum = def.fields.some((f) => f.type === 'enum');

  const searchReset = searchableFields(def.fields)
    .map((f) => `  query.${f.name} = '';`)
    .join('\n');
  const queryListLines = searchableFields(def.fields)
    .map((f) => `      ${f.name}: query.${f.name} === '' ? undefined : query.${f.name},`)
    .join('\n');

  return `<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { ${pascal}Item } from '@tiangong/contracts';
import {
  apiCreate${pascal},
  apiDelete${pascal},
  apiList${pascal},
  apiUpdate${pascal},
} from '@/api/${def.name}';
import FormDialog from '@/components/FormDialog.vue';
import Pagination from '@/components/Pagination.vue';
import RightToolbar from '@/components/RightToolbar.vue';
import SearchForm from '@/components/SearchForm.vue';
import { confirmDelete } from '@/utils/confirm';
import { formatDateTime } from '@/utils/datetime';

const { t, locale } = useI18n();

// 代码生成器产物：字段文案随元数据生成，按当前 locale 选择；公共键走全局 i18n
interface LabelMap {
  [key: string]: string;
}
${labelConst(def, 'zh')}

${labelConst(def, 'en')}
const L = computed<LabelMap>(() => (locale.value === 'en' ? EN : ZH));
${
  hasEnum
    ? `
const FIELD_OPTIONS: Record<string, Array<{ label: string; value: string }>> = {
${enumConsts}
};

function enumLabel(field: string, value: string | null | undefined): string {
  const hit = FIELD_OPTIONS[field]?.find((o) => o.value === value);
  return hit?.label ?? (value ?? '-');
}
`
    : ''
}
const loading = ref(false);
const rows = ref<${pascal}Item[]>([]);
const total = ref(0);
const showSearch = ref(true);
const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
${searchableFields(def.fields)
  .map((f) => `  ${f.name}: '',`)
  .join('\n')}
});

async function getList(): Promise<void> {
  loading.value = true;
  try {
    const res = await apiList${pascal}({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword === '' ? undefined : query.keyword,
${queryListLines}
    });
    rows.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  query.page = 1;
  void getList();
}

function onReset(): void {
  query.keyword = '';
${searchReset}
  onSearch();
}

const dialog = reactive({ visible: false, editingId: null as number | null });
const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive({
${formInit}
});

const rules: FormRules = {
${rules}
};

function openCreate(): void {
  dialog.editingId = null;
  Object.assign(form, {
${formInit}
  });
  dialog.visible = true;
}

function openEdit(row: ${pascal}Item): void {
  dialog.editingId = row.id;
  Object.assign(form, {
${formFields
  .map(
    (f) =>
      `    ${f.name}: (row.${f.name} ?? ${f.type === 'boolean' ? 'true' : "''"}) as never,`,
  )
  .join('\n')}
  });
  dialog.visible = true;
}

async function submit(): Promise<void> {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) {
    return;
  }
  submitting.value = true;
  try {
    const payload = {
${submitLines}
    };
    if (dialog.editingId === null) {
      await apiCreate${pascal}(payload);
    } else {
      await apiUpdate${pascal}(dialog.editingId, payload);
    }
    dialog.visible = false;
    ElMessage.success(t('common.opSuccess'));
    await getList();
  } finally {
    submitting.value = false;
  }
}

async function onDelete(row: ${pascal}Item): Promise<void> {
  try {
    await confirmDelete();
  } catch {
    return;
  }
  await apiDelete${pascal}(row.id);
  ElMessage.success(t('common.opSuccess'));
  if (rows.value.length === 1 && query.page > 1) {
    query.page -= 1;
  }
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
          v-model.trim="query.keyword"
          clearable
          style="width: 200px"
          @keyup.enter="onSearch"
        />
      </el-form-item>
${searchControls}
    </SearchForm>

    <el-card shadow="never" class="tg-table-card">
      <div class="tg-toolbar">
        <div class="tg-toolbar__actions">
          <el-button v-permission="'${def.name}:create'" type="primary" :icon="Plus" @click="openCreate">
            {{ t('common.add') }}
          </el-button>
        </div>
        <RightToolbar v-model:show-search="showSearch" @refresh="getList" />
      </div>

      <el-table v-loading="loading" :data="rows" row-key="id">
        <el-table-column label="ID" prop="id" width="80" />
${columns}
        <el-table-column :label="t('common.updatedAt')" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'${def.name}:update'" link type="primary" @click="openEdit(row)">
              {{ t('common.edit') }}
            </el-button>
            <el-button v-permission="'${def.name}:delete'" link type="danger" @click="onDelete(row)">
              {{ t('common.delete') }}
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="t('common.noData')" :image-size="60" />
        </template>
      </el-table>

      <Pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        @change="getList"
      />
    </el-card>

    <FormDialog
      v-model="dialog.visible"
      :title="dialog.editingId === null ? L.addTitle : L.editTitle"
      width="520px"
      :loading="submitting"
      @submit="submit"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
${formItems}
      </el-form>
    </FormDialog>
  </div>
</template>
`;
}
