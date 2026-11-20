/** 生成器定义表单：字段模型、校验规则与契约转换集中在此，页面只做编排。 */
import type { useI18n } from 'vue-i18n';
import type { FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import type { GenDefinitionItem, GenFieldType } from '@tiangong/contracts';

type Translate = ReturnType<typeof useI18n>['t'];

export const FIELD_TYPES: GenFieldType[] = [
  'string',
  'text',
  'integer',
  'decimal',
  'boolean',
  'enum',
  'datetime',
];

/** 字段编辑行：enumOptions 以逗号串编辑，提交时拆分。 */
export interface FieldRow {
  name: string;
  label: string;
  type: GenFieldType;
  required: boolean;
  inList: boolean;
  inForm: boolean;
  searchable: boolean;
  enumText: string;
}

export interface GenForm {
  name: string;
  displayName: string;
  remark: string;
  fields: FieldRow[];
}

/** 提交载荷：字段已转为契约结构。 */
export interface GenRequest {
  name: string;
  displayName: string;
  fields: GenDefinitionItem['fields'];
  remark?: string;
}

export function emptyRow(): FieldRow {
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

/** 新建与编辑共用回填，避免两套字面量。 */
export function fillGenForm(form: GenForm, row: GenDefinitionItem | null): void {
  Object.assign(form, {
    name: row?.name ?? '',
    displayName: row?.displayName ?? '',
    remark: row?.remark ?? '',
    fields:
      row === null
        ? [emptyRow()]
        : row.fields.map((f) => ({
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
}

/** 字段行内校验：与表单主校验分两级，行级错误定位到 fields.N.*。 */
export function buildFieldRules(t: Translate): FormRules {
  return {
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
}

export function buildGenRules(t: Translate): FormRules {
  return {
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
}

/** 表单 → 契约请求（enum 选项拆分；未填行剔除）；字段全空时提示并返回 null。 */
export function toRequest(form: GenForm, t: Translate): GenRequest | null {
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
    ...(form.remark === '' ? {} : { remark: form.remark }),
  };
}
