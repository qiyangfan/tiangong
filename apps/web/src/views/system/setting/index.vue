<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh, Search as SearchIcon } from '@element-plus/icons-vue';
import type { SettingItem } from '@tiangong/contracts';
import {
  apiCreateSetting,
  apiDeleteSetting,
  apiListSettings,
  apiUpdateSetting,
} from '@/api/settings';
import RightToolbar from '@/components/RightToolbar.vue';
import { formatDateTime } from '@/utils/datetime';

const { t } = useI18n();

const loading = ref(false);
const rows = ref<SettingItem[]>([]);
const keyword = ref('');

async function getList(): Promise<void> {
  loading.value = true;
  try {
    rows.value = await apiListSettings({
      keyword: keyword.value === '' ? undefined : keyword.value,
    });
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  void getList();
}

function onReset(): void {
  keyword.value = '';
  void getList();
}

const dialog = reactive({ visible: false, editingId: null as number | null, isBuiltin: false });
const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive({ name: '', settingKey: '', value: '', remark: '' });

const rules: FormRules = {
  name: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('setting.name') }),
      trigger: 'blur',
    },
  ],
  settingKey: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('setting.settingKey') }),
      trigger: 'blur',
    },
    { pattern: /^[a-z][a-z0-9._-]{1,99}$/, message: 'lower dot/kebab-case', trigger: 'blur' },
  ],
  value: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('setting.value') }),
      trigger: 'blur',
    },
  ],
};

function openCreate(): void {
  dialog.editingId = null;
  dialog.isBuiltin = false;
  Object.assign(form, { name: '', settingKey: '', value: '', remark: '' });
  dialog.visible = true;
}

function openEdit(row: SettingItem): void {
  dialog.editingId = row.id;
  dialog.isBuiltin = row.builtin;
  Object.assign(form, {
    name: row.name,
    settingKey: row.settingKey,
    value: row.value,
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
    if (dialog.editingId === null) {
      await apiCreateSetting({
        name: form.name,
        settingKey: form.settingKey,
        value: form.value,
        remark: form.remark === '' ? undefined : form.remark,
      });
    } else {
      await apiUpdateSetting(dialog.editingId, {
        name: form.name,
        value: form.value,
        remark: form.remark === '' ? null : form.remark,
      });
    }
    dialog.visible = false;
    ElMessage.success(t('common.opSuccess'));
    await getList();
  } finally {
    submitting.value = false;
  }
}

async function onDelete(row: SettingItem): Promise<void> {
  if (row.builtin) {
    ElMessage.warning(t('setting.builtinDeleteForbidden'));
    return;
  }
  try {
    await ElMessageBox.confirm(t('common.confirmDelete'), t('common.tip'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    });
  } catch {
    return;
  }
  await apiDeleteSetting(row.id);
  ElMessage.success(t('common.opSuccess'));
  await getList();
}

onMounted(() => {
  void getList();
});
</script>

<template>
  <div class="tg-page">
    <el-card shadow="never" class="tg-search-card">
      <el-form inline @submit.prevent>
        <el-form-item :label="t('common.keyword')">
          <el-input
            v-model.trim="keyword"
            :placeholder="t('setting.name') + '/' + t('setting.settingKey')"
            clearable
            style="width: 220px"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="SearchIcon" @click="onSearch">{{
            t('common.search')
          }}</el-button>
          <el-button :icon="Refresh" @click="onReset">{{ t('common.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="tg-table-card">
      <div class="tg-toolbar">
        <div class="tg-toolbar__actions">
          <el-button
            v-permission="'system:setting:create'"
            type="primary"
            :icon="Plus"
            @click="openCreate"
          >
            {{ t('common.add') }}
          </el-button>
        </div>
        <RightToolbar @refresh="getList" />
      </div>

      <el-table v-loading="loading" :data="rows" row-key="id">
        <el-table-column
          :label="t('setting.name')"
          prop="name"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          :label="t('setting.settingKey')"
          prop="settingKey"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          :label="t('setting.value')"
          prop="value"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column :label="t('setting.builtin')" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.builtin" type="warning" size="small" disable-transitions>{{
              t('common.yes')
            }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column
          :label="t('common.remark')"
          prop="remark"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column :label="t('common.createdAt')" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="140" fixed="right">
          <template #default="{ row }">
            <el-button
              v-permission="'system:setting:update'"
              link
              type="primary"
              @click="openEdit(row)"
              >{{ t('common.edit') }}</el-button
            >
            <el-button
              v-permission="'system:setting:delete'"
              link
              type="danger"
              :disabled="row.builtin"
              @click="onDelete(row)"
              >{{ t('common.delete') }}</el-button
            >
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="t('common.noData')" :image-size="60" />
        </template>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.editingId === null ? t('setting.addTitle') : t('setting.editTitle')"
      width="500px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item :label="t('setting.name')" prop="name">
          <el-input v-model.trim="form.name" maxlength="100" />
        </el-form-item>
        <el-form-item :label="t('setting.settingKey')" prop="settingKey">
          <el-input
            v-model.trim="form.settingKey"
            :disabled="dialog.editingId !== null"
            maxlength="100"
            placeholder="sys.xxx.yyy"
          />
          <div class="tg-form-tip">{{ t('setting.keyTip') }}</div>
        </el-form-item>
        <el-form-item :label="t('setting.value')" prop="value">
          <el-input v-model.trim="form.value" type="textarea" :rows="2" maxlength="500" />
          <div class="tg-form-tip">{{ t('setting.secretTip') }}</div>
        </el-form-item>
        <el-form-item :label="t('common.remark')">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">{{
          t('common.submit')
        }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>
