import type { GenFieldDef } from '@tiangong/contracts';
import type { GenRenderInput } from './naming';
import { pascalCase, searchableFields } from './naming';

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

/** 编辑回填表达式：数值可空字段回 undefined（与提交端 undefined 判断配套），文本/时间回空串。 */
function editInitExpr(field: GenFieldDef): string {
  switch (field.type) {
    case 'boolean':
      return `row.${field.name}`;
    case 'integer':
      return `(row.${field.name} === null ? undefined : row.${field.name})`;
    case 'decimal':
      return `(row.${field.name} === null ? undefined : Number(row.${field.name}))`;
    default:
      return `(row.${field.name} ?? '')`;
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
  const trigger = field.type === 'datetime' ? 'change' : 'blur';
  return `  ${field.name}: [
    { required: true, message: () => t('common.pleaseInput', { field: L.${field.name} }), trigger: '${trigger}' },
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

function scriptHead(def: GenRenderInput, pascal: string): string {
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
`;
}

function scriptEnumHelpers(def: GenRenderInput): string {
  if (!def.fields.some((f) => f.type === 'enum')) {
    return '';
  }
  const enumConsts = def.fields
    .filter((f) => f.type === 'enum')
    .map(enumOptionConst)
    .join('\n');
  return `
const FIELD_OPTIONS: Record<string, Array<{ label: string; value: string }>> = {
${enumConsts}
};

function enumLabel(field: string, value: string | null | undefined): string {
  const hit = FIELD_OPTIONS[field]?.find((o) => o.value === value);
  return hit?.label ?? (value ?? '-');
}
`;
}

function scriptState(def: GenRenderInput, pascal: string): string {
  return `
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
`;
}

function scriptMethods(def: GenRenderInput, pascal: string): string {
  const searchReset = searchableFields(def.fields)
    .map((f) => `  query.${f.name} = '';`)
    .join('\n');
  const queryListLines = searchableFields(def.fields)
    .map((f) => `      ${f.name}: query.${f.name} === '' ? undefined : query.${f.name},`)
    .join('\n');
  return `
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
`;
}

function scriptDialog(def: GenRenderInput, pascal: string): string {
  const formFields = def.fields.filter((f) => f.inForm);
  const formInit = formFields.map(formValueInit).join('\n');
  const requiredFields = formFields.filter((f) => f.required && f.type !== 'boolean');
  const rules = requiredFields.map(requiredRule).join('\n');
  return `
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
${formFields.map((f) => `    ${f.name}: ${editInitExpr(f)} as never,`).join('\n')}
  });
  dialog.visible = true;
}
`;
}

function scriptActions(def: GenRenderInput, pascal: string): string {
  const submitLines = def.fields
    .filter((f) => f.inForm)
    .map(submitConvert)
    .join('\n');
  return `
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
`;
}

function scriptMount(): string {
  return `
onMounted(() => {
  void getList();
});
</script>
`;
}

/** web 页面的 script 段（组合各片段，保持产物字节稳定）。 */
export function renderPageScript(def: GenRenderInput): string {
  const pascal = pascalCase(def.name);
  return [
    scriptHead(def, pascal),
    scriptEnumHelpers(def),
    scriptState(def, pascal),
    scriptMethods(def, pascal),
    scriptDialog(def, pascal),
    scriptActions(def, pascal),
    scriptMount(),
  ].join('');
}
