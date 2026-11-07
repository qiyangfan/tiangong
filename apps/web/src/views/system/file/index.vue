<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, type UploadRawFile } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FileItem } from '@tiangong/contracts';
import { apiDeleteFile, apiDownloadFile, apiListFiles, apiUploadFile } from '@/api/files';
import RightToolbar from '@/components/RightToolbar.vue';
import SearchForm from '@/components/SearchForm.vue';
import Pagination from '@/components/Pagination.vue';
import { confirmDelete } from '@/utils/confirm';
import { formatDateTime } from '@/utils/datetime';

const { t } = useI18n();

const loading = ref(false);
const rows = ref<FileItem[]>([]);
const total = ref(0);
const keyword = ref('');
const suffix = ref('');
const showSearch = ref(true);
const query = reactive({ page: 1, pageSize: 20 });

async function getList(): Promise<void> {
  loading.value = true;
  try {
    const res = await apiListFiles({
      page: query.page,
      pageSize: query.pageSize,
      keyword: keyword.value === '' ? undefined : keyword.value,
      suffix: suffix.value === '' ? undefined : suffix.value,
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
  keyword.value = '';
  suffix.value = '';
  onSearch();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 'B';
  for (const u of units) {
    if (value < 1024) {
      break;
    }
    value /= 1024;
    unit = u;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${unit}`;
}

const uploading = ref(false);

/** el-upload 自定义上传：走统一 request 层（带 token 与 envelope 解包）。 */
async function doUpload(options: { file: UploadRawFile }): Promise<void> {
  uploading.value = true;
  try {
    await apiUploadFile(options.file);
    ElMessage.success(t('common.opSuccess'));
    await getList();
  } finally {
    uploading.value = false;
  }
}

async function onDownload(row: FileItem): Promise<void> {
  await apiDownloadFile(row);
}

async function onDelete(row: FileItem): Promise<void> {
  try {
    await confirmDelete();
  } catch {
    return;
  }
  await apiDeleteFile(row.id);
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
          v-model.trim="keyword"
          :placeholder="t('file.originalName')"
          clearable
          style="width: 220px"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item :label="t('file.suffix')">
        <el-input
          v-model.trim="suffix"
          placeholder="pdf"
          clearable
          style="width: 120px"
          @keyup.enter="onSearch"
        />
      </el-form-item>
    </SearchForm>

    <el-card shadow="never" class="tg-table-card">
      <div class="tg-toolbar">
        <div class="tg-toolbar__actions">
          <el-upload
            v-permission="'files:upload'"
            :show-file-list="false"
            :http-request="doUpload"
          >
            <el-button type="primary" :icon="Plus" :loading="uploading">
              {{ t('file.upload') }}
            </el-button>
          </el-upload>
        </div>
        <RightToolbar v-model:show-search="showSearch" @refresh="getList" />
      </div>

      <el-table v-loading="loading" :data="rows" row-key="id">
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column
          :label="t('file.originalName')"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{ row.originalName }}</template>
        </el-table-column>
        <el-table-column :label="t('file.suffix')" prop="suffix" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.suffix" size="small" disable-transitions>{{ row.suffix }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('file.size')" width="110" align="right">
          <template #default="{ row }">{{ formatSize(row.sizeBytes) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.createdAt')" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="onDownload(row)">
              {{ t('file.download') }}
            </el-button>
            <el-button
              v-permission="'files:delete'"
              link
              type="danger"
              @click="onDelete(row)"
              >{{ t('common.delete') }}</el-button
            >
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="t('common.noData')" :image-size="60" />
        </template>
      </el-table>

      <Pagination v-model:page="query.page" v-model:page-size="query.pageSize" :total="total" @change="getList" />
    </el-card>
  </div>
</template>
