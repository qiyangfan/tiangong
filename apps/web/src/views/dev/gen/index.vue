<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { Plus, View } from '@element-plus/icons-vue';
import type { GenDefinitionItem, GenPreviewFile } from '@tiangong/contracts';
import { apiDeleteGenDefinition, apiListGenDefinitions, apiPreviewGenById } from '@/api/gen';
import RightToolbar from '@/components/RightToolbar.vue';
import SearchForm from '@/components/SearchForm.vue';
import { confirmDelete } from '@/utils/confirm';
import { formatDateTime } from '@/utils/datetime';
import EditDialog from './EditDialog.vue';
import PreviewDialog from './PreviewDialog.vue';

const { t } = useI18n();

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

const editVisible = ref(false);
const editEditing = ref<GenDefinitionItem | null>(null);

function openCreate(): void {
  editEditing.value = null;
  editVisible.value = true;
}

function openEdit(row: GenDefinitionItem): void {
  editEditing.value = row;
  editVisible.value = true;
}

const previewVisible = ref(false);
const previewFiles = ref<GenPreviewFile[]>([]);
const previewActive = ref('');

async function onPreview(row: GenDefinitionItem): Promise<void> {
  previewFiles.value = await apiPreviewGenById(row.id);
  previewActive.value = previewFiles.value[0]?.path ?? '';
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

    <EditDialog v-model="editVisible" :editing="editEditing" @saved="getList" />
    <PreviewDialog v-model="previewVisible" v-model:active="previewActive" :files="previewFiles" />
  </div>
</template>
