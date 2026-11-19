<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { DictTypeItem } from '@tiangong/contracts';
import { apiDeleteDictType, apiListDictTypes } from '@/api/dict';
import Pagination from '@/components/Pagination.vue';
import RightToolbar from '@/components/RightToolbar.vue';
import SearchForm from '@/components/SearchForm.vue';
import { confirmDelete } from '@/utils/confirm';
import ItemsDrawer from './ItemsDrawer.vue';
import TypeFormDialog from './TypeFormDialog.vue';

const { t } = useI18n();

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

const typeVisible = ref(false);
const typeEditing = ref<DictTypeItem | null>(null);

function openCreateType(): void {
  typeEditing.value = null;
  typeVisible.value = true;
}

function openEditType(row: DictTypeItem): void {
  typeEditing.value = row;
  typeVisible.value = true;
}

const itemsVisible = ref(false);
const itemsTarget = reactive({ dictKey: '', dictName: '' });

function openItems(row: DictTypeItem): void {
  itemsTarget.dictKey = row.dictKey;
  itemsTarget.dictName = row.name;
  itemsVisible.value = true;
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

    <TypeFormDialog v-model="typeVisible" :editing="typeEditing" @saved="getList" />
    <ItemsDrawer
      v-model="itemsVisible"
      :dict-key="itemsTarget.dictKey"
      :dict-name="itemsTarget.dictName"
    />
  </div>
</template>
