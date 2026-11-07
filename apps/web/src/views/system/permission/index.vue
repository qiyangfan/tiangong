<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh, Search as SearchIcon } from '@element-plus/icons-vue';
import type { PermissionGroup, PermissionItem } from '@tiangong/contracts';
import {
  apiCreatePermission,
  apiDeletePermission,
  apiListPermissions,
  apiUpdatePermission,
} from '@/api/permissions';
import RightToolbar from '@/components/RightToolbar.vue';

const { t } = useI18n();

const loading = ref(false);
const groups = ref<PermissionGroup[]>([]);
const keyword = ref('');

async function getList(): Promise<void> {
  loading.value = true;
  try {
    groups.value = await apiListPermissions({
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

// ---- 新增/修改 ----
const dialog = reactive({
  visible: false,
  editingId: null as number | null,
  resourceLocked: false,
});
const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive({
  resource: '',
  action: '',
  name: '',
  remark: '',
});

const rules: FormRules = {
  resource: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('permission.resource') }),
      trigger: 'blur',
    },
    { pattern: /^[a-z][a-z0-9-]{1,63}$/, message: 'lower kebab-case', trigger: 'blur' },
  ],
  action: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('permission.action') }),
      trigger: 'blur',
    },
    { pattern: /^[a-z][a-z0-9-]{1,31}$/, message: 'lower kebab-case', trigger: 'blur' },
  ],
  name: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('permission.name') }),
      trigger: 'blur',
    },
  ],
};

function openCreate(resource?: string): void {
  dialog.editingId = null;
  dialog.resourceLocked = false;
  Object.assign(form, { resource: resource ?? '', action: '', name: '', remark: '' });
  dialog.visible = true;
}

function openEdit(group: PermissionGroup, row: PermissionItem): void {
  dialog.editingId = row.id;
  dialog.resourceLocked = true;
  Object.assign(form, {
    resource: group.resource,
    action: row.action,
    name: row.name,
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
      await apiCreatePermission({
        resource: form.resource,
        action: form.action,
        name: form.name,
        remark: form.remark === '' ? undefined : form.remark,
      });
    } else {
      await apiUpdatePermission(dialog.editingId, {
        name: form.name,
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

async function onDelete(row: PermissionItem): Promise<void> {
  try {
    await ElMessageBox.confirm(t('common.confirmDelete'), t('common.tip'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    });
  } catch {
    return;
  }
  await apiDeletePermission(row.id);
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
            :placeholder="t('permission.resource') + '/' + t('permission.name')"
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
            v-permission="'system:permission:create'"
            type="primary"
            :icon="Plus"
            @click="openCreate()"
          >
            {{ t('permission.addTitle') }}
          </el-button>
        </div>
        <RightToolbar @refresh="getList" />
      </div>

      <div v-loading="loading">
        <el-empty v-if="groups.length === 0 && !loading" :description="t('common.noData')" />
        <el-card
          v-for="group in groups"
          :key="group.resource"
          shadow="never"
          class="tg-perm__group"
        >
          <template #header>
            <div class="tg-perm__group-header">
              <span>
                <strong>{{ group.name }}</strong>
                <el-tag size="small" class="tg-perm__resource" disable-transitions>{{
                  group.resource
                }}</el-tag>
              </span>
              <el-button
                v-permission="'system:permission:create'"
                size="small"
                :icon="Plus"
                @click="openCreate(group.resource)"
              >
                {{ t('common.add') }}
              </el-button>
            </div>
          </template>
          <el-table :data="group.permissions" size="small">
            <el-table-column :label="t('permission.action')" prop="action" width="140" />
            <el-table-column :label="t('permission.identifier')" min-width="200">
              <template #default="{ row }">
                <code class="tg-perm__code">{{ group.resource }}:{{ row.action }}</code>
              </template>
            </el-table-column>
            <el-table-column
              :label="t('permission.name')"
              prop="name"
              min-width="160"
              show-overflow-tooltip
            />
            <el-table-column
              :label="t('common.remark')"
              prop="remark"
              min-width="160"
              show-overflow-tooltip
            />
            <el-table-column :label="t('common.actions')" width="140">
              <template #default="{ row }">
                <el-button
                  v-permission="'system:permission:update'"
                  link
                  type="primary"
                  @click="openEdit(group, row)"
                  >{{ t('common.edit') }}</el-button
                >
                <el-button
                  v-permission="'system:permission:delete'"
                  link
                  type="danger"
                  @click="onDelete(row)"
                  >{{ t('common.delete') }}</el-button
                >
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </el-card>

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.editingId === null ? t('permission.addTitle') : t('permission.editTitle')"
      width="480px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item :label="t('permission.resource')" prop="resource">
          <el-input
            v-model.trim="form.resource"
            :disabled="dialog.resourceLocked"
            maxlength="64"
            placeholder="user / sample-record"
          />
        </el-form-item>
        <el-form-item :label="t('permission.action')" prop="action">
          <el-input
            v-model.trim="form.action"
            :disabled="dialog.editingId !== null"
            maxlength="32"
            placeholder="list / create / update / delete"
          />
        </el-form-item>
        <el-form-item :label="t('permission.name')" prop="name">
          <el-input v-model.trim="form.name" maxlength="100" />
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

<style scoped>
.tg-perm__group {
  margin-bottom: var(--tg-card-gap);
}

.tg-perm__group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tg-perm__resource {
  margin-left: 8px;
}

.tg-perm__code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
