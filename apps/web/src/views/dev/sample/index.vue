<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { SampleRecordItem } from '@tiangong/contracts';
import {
  apiCreateSample,
  apiDeleteSample,
  apiListSamples,
  apiUpdateSample,
} from '@/api/sample';
import DictTag from '@/components/DictTag.vue';
import FormDialog from '@/components/FormDialog.vue';
import Pagination from '@/components/Pagination.vue';
import RightToolbar from '@/components/RightToolbar.vue';
import SearchForm from '@/components/SearchForm.vue';
import { useDict } from '@/composables/useDict';
import { confirmDelete } from '@/utils/confirm';
import { formatDateTime } from '@/utils/datetime';

const { t } = useI18n();
const { sys_sample_category: categoryOptions } = useDict('sys_sample_category');

const loading = ref(false);
const rows = ref<SampleRecordItem[]>([]);
const total = ref(0);
const keyword = ref('');
const category = ref('');
const enabled = ref<string>('');
const showSearch = ref(true);
const query = reactive({ page: 1, pageSize: 20 });

async function getList(): Promise<void> {
  loading.value = true;
  try {
    const res = await apiListSamples({
      page: query.page,
      pageSize: query.pageSize,
      keyword: keyword.value === '' ? undefined : keyword.value,
      category: category.value === '' ? undefined : category.value,
      enabled: enabled.value === '' ? undefined : enabled.value === 'true',
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
  category.value = '';
  enabled.value = '';
  onSearch();
}

const dialog = reactive({ visible: false, editingId: null as number | null });
const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive({
  name: '',
  category: '',
  amount: undefined as number | undefined,
  enabled: true,
  remark: '',
});

const rules: FormRules = {
  name: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('dev.sample.name') }),
      trigger: 'blur',
    },
  ],
};

function openCreate(): void {
  dialog.editingId = null;
  Object.assign(form, { name: '', category: '', amount: undefined, enabled: true, remark: '' });
  dialog.visible = true;
}

function openEdit(row: SampleRecordItem): void {
  dialog.editingId = row.id;
  Object.assign(form, {
    name: row.name,
    category: row.category ?? '',
    amount: row.amount === null ? undefined : Number(row.amount),
    enabled: row.enabled,
    remark: row.remark ?? '',
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
    // 金额按契约以两位小数字符串传输
    const amount = form.amount === undefined ? undefined : form.amount.toFixed(2);
    if (dialog.editingId === null) {
      await apiCreateSample({
        name: form.name,
        category: form.category === '' ? undefined : form.category,
        amount,
        enabled: form.enabled,
        remark: form.remark === '' ? undefined : form.remark,
      });
    } else {
      await apiUpdateSample(dialog.editingId, {
        name: form.name,
        category: form.category === '' ? undefined : form.category,
        amount,
        enabled: form.enabled,
        remark: form.remark === '' ? undefined : form.remark,
      });
    }
    dialog.visible = false;
    ElMessage.success(t('common.opSuccess'));
    await getList();
  } finally {
    submitting.value = false;
  }
}

async function onDelete(row: SampleRecordItem): Promise<void> {
  try {
    await confirmDelete();
  } catch {
    return;
  }
  await apiDeleteSample(row.id);
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
          :placeholder="t('dev.sample.name')"
          clearable
          style="width: 200px"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item :label="t('dev.sample.category')">
        <el-select v-model="category" clearable style="width: 160px">
          <el-option
            v-for="opt in categoryOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('common.status')">
        <el-select v-model="enabled" clearable style="width: 120px">
          <el-option :label="t('common.enabled')" value="true" />
          <el-option :label="t('common.disabled')" value="false" />
        </el-select>
      </el-form-item>
    </SearchForm>

    <el-card shadow="never" class="tg-table-card">
      <div class="tg-toolbar">
        <div class="tg-toolbar__actions">
          <el-button
            v-permission="'sample:create'"
            type="primary"
            :icon="Plus"
            @click="openCreate"
          >
            {{ t('common.add') }}
          </el-button>
        </div>
        <RightToolbar v-model:show-search="showSearch" @refresh="getList" />
      </div>

      <el-table v-loading="loading" :data="rows" row-key="id">
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column :label="t('dev.sample.name')" prop="name" min-width="160" />
        <el-table-column :label="t('dev.sample.category')" width="120" align="center">
          <template #default="{ row }">
            <DictTag
              v-if="row.category"
              :options="categoryOptions"
              :value="row.category"
            />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('dev.sample.amount')" prop="amount" width="120" align="right" />
        <el-table-column :label="t('common.status')" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small" disable-transitions>
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
        <el-table-column :label="t('common.updatedAt')" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'sample:update'" link type="primary" @click="openEdit(row)">
              {{ t('common.edit') }}
            </el-button>
            <el-button v-permission="'sample:delete'" link type="danger" @click="onDelete(row)">
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
      :title="dialog.editingId === null ? t('dev.sample.addTitle') : t('dev.sample.editTitle')"
      width="520px"
      :loading="submitting"
      @submit="submit"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item :label="t('dev.sample.name')" prop="name">
          <el-input v-model.trim="form.name" maxlength="100" />
        </el-form-item>
        <el-form-item :label="t('dev.sample.category')">
          <el-select v-model="form.category" clearable style="width: 100%">
            <el-option
              v-for="opt in categoryOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('dev.sample.amount')">
          <el-input-number
            v-model="form.amount"
            :min="0"
            :precision="2"
            :step="1"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item :label="t('common.status')">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item :label="t('common.remark')">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" />
        </el-form-item>
      </el-form>
    </FormDialog>
  </div>
</template>
