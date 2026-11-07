<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { LoginLogItem } from '@tiangong/contracts';
import { apiListLoginLogs } from '@/api/audit';
import Pagination from '@/components/Pagination.vue';
import RightToolbar from '@/components/RightToolbar.vue';
import SearchForm from '@/components/SearchForm.vue';
import { formatDateTime } from '@/utils/datetime';

const { t } = useI18n();

const loading = ref(false);
const rows = ref<LoginLogItem[]>([]);
const total = ref(0);
const showSearch = ref(true);
const query = reactive({
  page: 1,
  pageSize: 20,
  username: '',
  status: undefined as 'ok' | 'error' | undefined,
});

async function getList(): Promise<void> {
  loading.value = true;
  try {
    const res = await apiListLoginLogs({
      page: query.page,
      pageSize: query.pageSize,
      username: query.username === '' ? undefined : query.username,
      status: query.status,
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
  query.username = '';
  query.status = undefined;
  onSearch();
}

onMounted(() => {
  void getList();
});
</script>

<template>
  <div class="tg-page">
    <SearchForm v-show="showSearch" @search="onSearch" @reset="onReset">
      <el-form-item :label="t('loginLog.operator')">
        <el-input
          v-model.trim="query.username"
          clearable
          style="width: 160px"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item :label="t('loginLog.status')">
        <el-select
          v-model="query.status"
          clearable
          style="width: 120px"
          :placeholder="t('common.all')"
        >
          <el-option :label="t('loginLog.ok')" value="ok" />
          <el-option :label="t('loginLog.error')" value="error" />
        </el-select>
      </el-form-item>
    </SearchForm>

    <el-card shadow="never" class="tg-table-card">
      <div class="tg-toolbar">
        <span />
        <RightToolbar v-model:show-search="showSearch" @refresh="getList" />
      </div>

      <el-table v-loading="loading" :data="rows" row-key="id">
        <el-table-column
          :label="t('loginLog.operator')"
          prop="username"
          min-width="110"
          show-overflow-tooltip
        />
        <el-table-column :label="t('loginLog.client')" prop="client" width="100" align="center" />
        <el-table-column
          :label="t('loginLog.ip')"
          prop="ip"
          min-width="130"
          show-overflow-tooltip
        />
        <el-table-column :label="t('loginLog.status')" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ok' ? 'success' : 'danger'" disable-transitions>
              {{ row.status === 'ok' ? t('loginLog.ok') : t('loginLog.error') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          :label="t('loginLog.message')"
          prop="message"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column :label="t('loginLog.loggedAt')" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.loggedAt) }}</template>
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
  </div>
</template>
