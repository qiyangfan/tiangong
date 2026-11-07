<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { DictItem, DictTypeItem, TagType } from '@tiangong/contracts';
import {
  apiCreateDictItem,
  apiCreateDictType,
  apiDeleteDictItem,
  apiDeleteDictType,
  apiListDictItems,
  apiListDictTypes,
  apiUpdateDictItem,
  apiUpdateDictType,
} from '@/api/dict';
import FormDialog from '@/components/FormDialog.vue';
import Pagination from '@/components/Pagination.vue';
import RightToolbar from '@/components/RightToolbar.vue';
import SearchForm from '@/components/SearchForm.vue';
import { confirmDelete } from '@/utils/confirm';

const { t } = useI18n();

// ---- 左：字典类型 ----
const loading = ref(false);
const rows = ref<DictTypeItem[]>([]);
const total = ref(0);
const showSearch = ref(true);
const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  enabled: undefined as boolean | undefined,
});

async function getList(): Promise<void> {
  loading.value = true;
  try {
    const res = await apiListDictTypes({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword === '' ? undefined : query.keyword,
      enabled: query.enabled,
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
  query.enabled = undefined;
  onSearch();
}

const typeDialog = reactive({ visible: false, editingId: null as number | null });
const typeFormRef = ref<FormInstance>();
const typeSubmitting = ref(false);
const typeForm = reactive({ name: '', dictKey: '', enabled: true, remark: '' });

const typeRules: FormRules = {
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

function openCreateType(): void {
  typeDialog.editingId = null;
  Object.assign(typeForm, { name: '', dictKey: '', enabled: true, remark: '' });
  typeDialog.visible = true;
}

function openEditType(row: DictTypeItem): void {
  typeDialog.editingId = row.id;
  Object.assign(typeForm, {
    name: row.name,
    dictKey: row.dictKey,
    enabled: row.enabled,
    remark: row.remark ?? '',
  });
  typeDialog.visible = true;
}

async function submitType(): Promise<void> {
  const ok = await typeFormRef.value?.validate().catch(() => false);
  if (!ok) {
    return;
  }
  typeSubmitting.value = true;
  try {
    if (typeDialog.editingId === null) {
      await apiCreateDictType({
        name: typeForm.name,
        dictKey: typeForm.dictKey,
        enabled: typeForm.enabled,
        remark: typeForm.remark === '' ? undefined : typeForm.remark,
      });
    } else {
      // 契约约束：字典类型 remark 不可置 null（partial 语义只能省略）
      await apiUpdateDictType(typeDialog.editingId, {
        name: typeForm.name,
        enabled: typeForm.enabled,
        remark: typeForm.remark === '' ? undefined : typeForm.remark,
      });
    }
    typeDialog.visible = false;
    ElMessage.success(t('common.opSuccess'));
    await getList();
  } finally {
    typeSubmitting.value = false;
  }
}

async function onDeleteType(row: DictTypeItem): Promise<void> {
  try {
    await confirmDelete();
  } catch {
    return;
  }
  await apiDeleteDictType(row.id);
  ElMessage.success(t('common.opSuccess'));
  if (rows.value.length === 1 && query.page > 1) {
    query.page -= 1;
  }
  await getList();
}

// ---- 右：字典项（抽屉） ----
const itemsDrawer = reactive({ visible: false, dictKey: '', dictName: '' });
const items = ref<DictItem[]>([]);
const itemsLoading = ref(false);

async function loadItems(): Promise<void> {
  itemsLoading.value = true;
  try {
    items.value = await apiListDictItems({ dictKey: itemsDrawer.dictKey });
  } finally {
    itemsLoading.value = false;
  }
}

function openItems(row: DictTypeItem): void {
  itemsDrawer.dictKey = row.dictKey;
  itemsDrawer.dictName = row.name;
  itemsDrawer.visible = true;
  void loadItems();
}

const itemDialog = reactive({ visible: false, editingId: null as number | null });
const itemFormRef = ref<FormInstance>();
const itemSubmitting = ref(false);
const itemForm = reactive({
  label: '',
  value: '',
  tagType: null as TagType | null,
  sort: 0,
  isDefault: false,
  enabled: true,
  remark: '',
});

const itemRules: FormRules = {
  label: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('dict.label') }),
      trigger: 'blur',
    },
  ],
  value: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('dict.value') }),
      trigger: 'blur',
    },
  ],
};

const tagTypeOptions: TagType[] = ['primary', 'success', 'info', 'warning', 'danger'];

function openCreateItem(): void {
  itemDialog.editingId = null;
  Object.assign(itemForm, {
    label: '',
    value: '',
    tagType: null,
    sort: 0,
    isDefault: false,
    enabled: true,
    remark: '',
  });
  itemDialog.visible = true;
}

function openEditItem(row: DictItem): void {
  itemDialog.editingId = row.id;
  Object.assign(itemForm, {
    label: row.label,
    value: row.value,
    tagType: row.tagType,
    sort: row.sort,
    isDefault: row.isDefault,
    enabled: row.enabled,
    remark: row.remark ?? '',
  });
  itemDialog.visible = true;
}

async function submitItem(): Promise<void> {
  const ok = await itemFormRef.value?.validate().catch(() => false);
  if (!ok) {
    return;
  }
  itemSubmitting.value = true;
  try {
    if (itemDialog.editingId === null) {
      await apiCreateDictItem({
        dictKey: itemsDrawer.dictKey,
        label: itemForm.label,
        value: itemForm.value,
        tagType: itemForm.tagType,
        sort: itemForm.sort,
        isDefault: itemForm.isDefault,
        enabled: itemForm.enabled,
        remark: itemForm.remark === '' ? undefined : itemForm.remark,
      });
    } else {
      await apiUpdateDictItem(itemDialog.editingId, {
        label: itemForm.label,
        value: itemForm.value,
        tagType: itemForm.tagType,
        sort: itemForm.sort,
        isDefault: itemForm.isDefault,
        enabled: itemForm.enabled,
        remark: itemForm.remark === '' ? undefined : itemForm.remark,
      });
    }
    itemDialog.visible = false;
    ElMessage.success(t('common.opSuccess'));
    await loadItems();
  } finally {
    itemSubmitting.value = false;
  }
}

async function onDeleteItem(row: DictItem): Promise<void> {
  try {
    await confirmDelete();
  } catch {
    return;
  }
  await apiDeleteDictItem(row.id);
  ElMessage.success(t('common.opSuccess'));
  await loadItems();
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
          :placeholder="t('dict.typeName') + '/' + t('dict.dictKey')"
          clearable
          style="width: 200px"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item :label="t('common.status')">
        <el-select
          v-model="query.enabled"
          clearable
          style="width: 120px"
          :placeholder="t('common.all')"
        >
          <el-option :label="t('common.enabled')" :value="true" />
          <el-option :label="t('common.disabled')" :value="false" />
        </el-select>
      </el-form-item>
    </SearchForm>

    <el-card shadow="never" class="tg-table-card">
      <div class="tg-toolbar">
        <div class="tg-toolbar__actions">
          <el-button
            v-permission="'system:dict:create'"
            type="primary"
            :icon="Plus"
            @click="openCreateType"
          >
            {{ t('common.add') }}
          </el-button>
        </div>
        <RightToolbar v-model:show-search="showSearch" @refresh="getList" />
      </div>

      <el-table v-loading="loading" :data="rows" row-key="id">
        <el-table-column
          :label="t('dict.typeName')"
          prop="name"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column
          :label="t('dict.dictKey')"
          prop="dictKey"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column :label="t('common.status')" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" disable-transitions>
              {{ row.enabled ? t('common.enabled') : t('common.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          :label="t('common.remark')"
          prop="remark"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column :label="t('common.actions')" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              v-permission="'system:dict:list'"
              link
              type="primary"
              @click="openItems(row)"
              >{{ t('dict.manageItems') }}</el-button
            >
            <el-button
              v-permission="'system:dict:update'"
              link
              type="primary"
              @click="openEditType(row)"
              >{{ t('common.edit') }}</el-button
            >
            <el-button
              v-permission="'system:dict:delete'"
              link
              type="danger"
              @click="onDeleteType(row)"
              >{{ t('common.delete') }}</el-button
            >
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

    <!-- 字典类型表单 -->
    <FormDialog
      v-model="typeDialog.visible"
      :title="typeDialog.editingId === null ? t('dict.addTypeTitle') : t('dict.editTypeTitle')"
      width="480px"
      :loading="typeSubmitting"
      @submit="submitType"
    >
      <el-form ref="typeFormRef" :model="typeForm" :rules="typeRules" label-width="90px">
        <el-form-item :label="t('dict.typeName')" prop="name">
          <el-input v-model.trim="typeForm.name" maxlength="100" />
        </el-form-item>
        <el-form-item :label="t('dict.dictKey')" prop="dictKey">
          <el-input
            v-model.trim="typeForm.dictKey"
            :disabled="typeDialog.editingId !== null"
            maxlength="100"
            placeholder="sys_xxx"
          />
        </el-form-item>
        <el-form-item :label="t('common.status')">
          <el-switch v-model="typeForm.enabled" />
        </el-form-item>
        <el-form-item :label="t('common.remark')">
          <el-input v-model="typeForm.remark" type="textarea" :rows="2" maxlength="500" />
        </el-form-item>
      </el-form>
    </FormDialog>

    <!-- 字典项抽屉 -->
    <el-drawer
      v-model="itemsDrawer.visible"
      :title="t('dict.itemsOf', { name: itemsDrawer.dictName })"
      size="640px"
    >
      <div class="tg-toolbar">
        <span class="tg-form-tip">{{ itemsDrawer.dictKey }}</span>
        <el-button
          v-permission="'system:dict:create'"
          type="primary"
          size="small"
          :icon="Plus"
          @click="openCreateItem"
        >
          {{ t('common.add') }}
        </el-button>
      </div>
      <el-table v-loading="itemsLoading" :data="items" size="small" row-key="id">
        <el-table-column
          :label="t('dict.label')"
          prop="label"
          min-width="110"
          show-overflow-tooltip
        />
        <el-table-column
          :label="t('dict.value')"
          prop="value"
          min-width="100"
          show-overflow-tooltip
        />
        <el-table-column :label="t('dict.tagType')" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.tagType" :type="row.tagType" size="small" disable-transitions>{{
              row.tagType
            }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('dict.isDefault')" width="80" align="center">
          <template #default="{ row }">{{ row.isDefault ? t('common.yes') : '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('common.sort')" prop="sort" width="70" align="center" />
        <el-table-column :label="t('common.status')" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small" disable-transitions>
              {{ row.enabled ? t('common.enabled') : t('common.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="140" fixed="right">
          <template #default="{ row }">
            <el-button
              v-permission="'system:dict:update'"
              link
              type="primary"
              @click="openEditItem(row)"
              >{{ t('common.edit') }}</el-button
            >
            <el-button
              v-permission="'system:dict:delete'"
              link
              type="danger"
              @click="onDeleteItem(row)"
              >{{ t('common.delete') }}</el-button
            >
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="t('common.noData')" :image-size="60" />
        </template>
      </el-table>

      <FormDialog
        v-model="itemDialog.visible"
        :title="itemDialog.editingId === null ? t('dict.addItemTitle') : t('dict.editItemTitle')"
        width="480px"
        :loading="itemSubmitting"
        append-to-body
        @submit="submitItem"
      >
        <el-form ref="itemFormRef" :model="itemForm" :rules="itemRules" label-width="90px">
          <el-form-item :label="t('dict.label')" prop="label">
            <el-input v-model.trim="itemForm.label" maxlength="100" />
          </el-form-item>
          <el-form-item :label="t('dict.value')" prop="value">
            <el-input v-model.trim="itemForm.value" maxlength="100" />
          </el-form-item>
          <el-form-item :label="t('dict.tagType')">
            <el-select
              v-model="itemForm.tagType"
              clearable
              style="width: 100%"
              :placeholder="t('dict.tagTypeNone')"
            >
              <el-option v-for="tt in tagTypeOptions" :key="tt" :label="tt" :value="tt" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('common.sort')">
            <el-input-number v-model="itemForm.sort" :min="0" :max="9999" />
          </el-form-item>
          <el-form-item :label="t('dict.isDefault')">
            <el-switch v-model="itemForm.isDefault" />
          </el-form-item>
          <el-form-item :label="t('common.status')">
            <el-switch v-model="itemForm.enabled" />
          </el-form-item>
          <el-form-item :label="t('common.remark')">
            <el-input v-model="itemForm.remark" type="textarea" :rows="2" maxlength="500" />
          </el-form-item>
        </el-form>
      </FormDialog>
    </el-drawer>
  </div>
</template>
