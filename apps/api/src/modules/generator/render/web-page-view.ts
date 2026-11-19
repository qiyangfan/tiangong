import type { GenFieldDef } from '@tiangong/contracts';
import type { GenRenderInput } from './naming';
import { searchableFields } from './naming';

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

function searchSection(def: GenRenderInput): string {
  const searchControls = searchableFields(def.fields)
    .map(searchControl)
    .filter((s): s is string => s !== null)
    .join('\n');
  return `
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
`;
}

function tableSection(def: GenRenderInput): string {
  const columns = def.fields
    .filter((f) => f.inList)
    .map(tableColumn)
    .join('\n');
  return `
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
`;
}

function dialogSection(formItems: string): string {
  return `
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

/** web 页面的 template 段（组合各片段，保持产物字节稳定）。 */
export function renderPageTemplate(def: GenRenderInput): string {
  const formItems = def.fields
    .filter((f) => f.inForm)
    .map(formItem)
    .join('\n');
  return [searchSection(def), tableSection(def), dialogSection(formItems)].join('');
}
