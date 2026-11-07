<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { BusinessType, OperLogItem } from '@tiangong/contracts';
import { apiListOperLogs } from '@/api/audit';
import { useDict } from '@/composables/useDict';
import DictTag from '@/components/DictTag.vue';
import Pagination from '@/components/Pagination.vue';
import RightToolbar from '@/components/RightToolbar.vue';
import SearchForm from '@/components/SearchForm.vue';
import { formatCost, formatDateTime } from '@/utils/datetime';

const { t } = useI18n();
const { sys_oper_type } = useDict('sys_oper_type');

const loading = ref(false);
const rows = ref<OperLogItem[]>([]);
const total = ref(0);
const showSearch = ref(true);
const query = reactive({
  page: 1,
  pageSize: 20,
  username: '',
  status: undefined as 'ok' | 'error' | undefined,
  businessType: undefined as BusinessType | undefined,
});

async function getList(): Promise<void> {
  loading.value = true;
  try {
    const res = await apiListOperLogs({
      page: query.page,
      pageSize: query.pageSize,
      username: query.username === '' ? undefined : query.username,
      status: query.status,
      businessType: query.businessType,
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
  query.businessType = undefined;
  onSearch();
}

// ---- 详情抽屉 ----
const detail = ref<OperLogItem | null>(null);
const detailVisible = ref(false);

function openDetail(row: OperLogItem): void {
  detail.value = row;
  detailVisible.value = true;
}

onMounted(() => {
  void getList();
});
</script>

<template>
  <div class="tg-page">
    <SearchForm v-show="showSearch" @search="onSearch" @reset="onReset">
      <el-form-item :label="t('operLog.operator')">
        <el-input
          v-model.trim="query.username"
          clearable
          style="width: 160px"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item :label="t('operLog.businessType')">
        <el-select
          v-model="query.businessType"
          clearable
          style="width: 140px"
          :placeholder="t('common.all')"
        >
          <el-option
            v-for="o in sys_oper_type"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('operLog.status')">
        <el-select
          v-model="query.status"
          clearable
          style="width: 120px"
          :placeholder="t('common.all')"
        >
          <el-option :label="t('operLog.ok')" value="ok" />
          <el-option :label="t('operLog.error')" value="error" />
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
          :label="t('operLog.module')"
          prop="title"
          min-width="110"
          show-overflow-tooltip
        />
        <el-table-column :label="t('operLog.businessType')" width="100" align="center">
          <template #default="{ row }">
            <DictTag :options="sys_oper_type" :value="row.businessType" />
          </template>
        </el-table-column>
        <el-table-column :label="t('operLog.request')" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="tg-operlog__method">{{ row.requestMethod }}</span> {{ row.requestPath }}
          </template>
        </el-table-column>
        <el-table-column
          :label="t('operLog.operator')"
          prop="username"
          width="100"
          show-overflow-tooltip
        />
        <el-table-column :label="t('operLog.ip')" prop="ip" width="130" show-overflow-tooltip />
        <el-table-column :label="t('operLog.status')" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ok' ? 'success' : 'danger'" disable-transitions>
              {{ row.status === 'ok' ? t('operLog.ok') : t('operLog.error') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('operLog.costMs')" width="90" align="center">
          <template #default="{ row }">{{ formatCost(row.costMs) }}</template>
        </el-table-column>
        <el-table-column :label="t('operLog.operAt')" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.operatedAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">{{
              t('common.detail')
            }}</el-button>
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

    <el-drawer v-model="detailVisible" :title="t('operLog.detailTitle')" size="480px">
      <el-descriptions v-if="detail" :column="1" border>
        <el-descriptions-item :label="t('operLog.module')">{{ detail.title }}</el-descriptions-item>
        <el-descriptions-item :label="t('operLog.businessType')">
          <DictTag :options="sys_oper_type" :value="detail.businessType" />
        </el-descriptions-item>
        <el-descriptions-item :label="t('operLog.request')">
          {{ detail.method }}（{{ detail.requestMethod }} {{ detail.requestPath }}）
        </el-descriptions-item>
        <el-descriptions-item :label="t('operLog.operator')"
          >{{ detail.username }}（{{ detail.client }}）</el-descriptions-item
        >
        <el-descriptions-item :label="t('operLog.ip')">{{ detail.ip }}</el-descriptions-item>
        <el-descriptions-item :label="t('operLog.status')">
          <el-tag :type="detail.status === 'ok' ? 'success' : 'danger'" disable-transitions>
            {{ detail.status === 'ok' ? t('operLog.ok') : t('operLog.error') }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.errorMsg" :label="t('operLog.errorMsg')">
          <span class="tg-operlog__error">{{ detail.errorMsg }}</span>
        </el-descriptions-item>
        <el-descriptions-item :label="t('operLog.costMs')">{{
          formatCost(detail.costMs)
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('operLog.operAt')">{{
          formatDateTime(detail.operatedAt)
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('operLog.requestId')">{{
          detail.requestId
        }}</el-descriptions-item>
        <el-descriptions-item :label="t('operLog.params')">
          <pre class="tg-pre">{{ detail.params ?? '-' }}</pre>
        </el-descriptions-item>
        <el-descriptions-item :label="t('operLog.response')">
          <pre class="tg-pre">{{ detail.result ?? '-' }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<style scoped>
.tg-operlog__method {
  font-weight: 600;
  color: var(--el-color-primary);
}

.tg-operlog__error {
  color: var(--el-color-danger);
}
</style>
