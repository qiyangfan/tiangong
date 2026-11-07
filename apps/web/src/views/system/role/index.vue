<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, RefreshLeft, Search as SearchIcon } from '@element-plus/icons-vue';
import type { PermissionGroup, RoleItem } from '@tiangong/contracts';
import { apiCreateRole, apiDeleteRole, apiGetRole, apiListRoles, apiUpdateRole } from '@/api/roles';
import { apiListPermissions } from '@/api/permissions';
import Pagination from '@/components/Pagination.vue';
import RightToolbar from '@/components/RightToolbar.vue';
import { formatDateTime } from '@/utils/datetime';

const { t } = useI18n();

// ---- 列表 ----
const loading = ref(false);
const rows = ref<RoleItem[]>([]);
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
    const res = await apiListRoles({
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

// ---- 新增/修改 ----
const dialog = reactive({ visible: false, editingId: null as number | null, isBuiltin: false });
const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive({
  name: '',
  roleKey: '',
  sort: 0,
  enabled: true,
  remark: '',
  permissionIds: [] as number[],
});

const rules: FormRules = {
  name: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('role.name') }),
      trigger: 'blur',
    },
  ],
  roleKey: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('role.roleKey') }),
      trigger: 'blur',
    },
    { pattern: /^[a-z][a-z0-9_]{1,99}$/, message: 'lower snake_case', trigger: 'blur' },
  ],
};

function openCreate(): void {
  dialog.editingId = null;
  dialog.isBuiltin = false;
  Object.assign(form, {
    name: '',
    roleKey: '',
    sort: 0,
    enabled: true,
    remark: '',
    permissionIds: [],
  });
  dialog.visible = true;
}

function openEdit(row: RoleItem): void {
  dialog.editingId = row.id;
  dialog.isBuiltin = row.builtin;
  Object.assign(form, {
    name: row.name,
    roleKey: row.roleKey,
    sort: row.sort,
    enabled: row.enabled,
    remark: row.remark ?? '',
    permissionIds: [],
  });
  // 编辑时先拉详情预填已授权限（需权限点 id 集合），弹窗内复用分配面板
  void loadPermissions().then(() => {
    void apiGetRole(row.id).then((detail) => {
      form.permissionIds = permIdsOf(detail.permissions);
    });
  });
  dialog.visible = true;
}

// ---- 权限分配 ----
const permGroups = ref<PermissionGroup[]>([]);
const assignDialog = reactive({ visible: false, roleId: 0, roleName: '' });
const checkedPerms = ref<string[]>([]);

interface PermFlat {
  id: number;
  key: string;
}

const permFlat = computed<PermFlat[]>(() =>
  permGroups.value.flatMap((g) =>
    g.permissions.map((p) => ({ id: p.id, key: `${p.resource}:${p.action}` })),
  ),
);

function permIdsOf(keys: string[]): number[] {
  const idByKey = new Map(permFlat.value.map((p) => [p.key, p.id]));
  return keys.flatMap((k) => {
    const id = idByKey.get(k);
    return id === undefined ? [] : [id];
  });
}

async function loadPermissions(): Promise<void> {
  permGroups.value = await apiListPermissions({});
}

function openAssign(row: RoleItem): void {
  assignDialog.roleId = row.id;
  assignDialog.roleName = row.name;
  checkedPerms.value = [];
  void loadPermissions().then(async () => {
    const detail = await apiGetRole(row.id);
    checkedPerms.value = detail.permissions;
  });
  assignDialog.visible = true;
}

async function submitAssign(): Promise<void> {
  await apiUpdateRole(assignDialog.roleId, { permissionIds: permIdsOf(checkedPerms.value) });
  assignDialog.visible = false;
  ElMessage.success(t('common.opSuccess'));
  await getList();
}

async function submit(): Promise<void> {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) {
    return;
  }
  submitting.value = true;
  try {
    if (dialog.editingId === null) {
      await apiCreateRole({
        name: form.name,
        roleKey: form.roleKey,
        sort: form.sort,
        enabled: form.enabled,
        remark: form.remark === '' ? undefined : form.remark,
        permissionIds: form.permissionIds,
      });
    } else {
      await apiUpdateRole(dialog.editingId, {
        name: form.name,
        ...(dialog.isBuiltin ? {} : { roleKey: form.roleKey }),
        sort: form.sort,
        enabled: form.enabled,
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

async function onDelete(row: RoleItem): Promise<void> {
  if (row.builtin) {
    ElMessage.warning(t('role.builtinDeleteForbidden'));
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
  await apiDeleteRole(row.id);
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
    <el-card v-show="showSearch" shadow="never" class="tg-search-card">
      <el-form inline @submit.prevent>
        <el-form-item :label="t('common.keyword')">
          <el-input
            v-model.trim="query.keyword"
            :placeholder="t('role.name') + '/' + t('role.roleKey')"
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
        <el-form-item>
          <el-button type="primary" :icon="SearchIcon" @click="onSearch">{{
            t('common.search')
          }}</el-button>
          <el-button :icon="RefreshLeft" @click="onReset">{{ t('common.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="tg-table-card">
      <div class="tg-toolbar">
        <div class="tg-toolbar__actions">
          <el-button
            v-permission="'system:role:create'"
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
        <el-table-column
          :label="t('role.name')"
          prop="name"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column
          :label="t('role.roleKey')"
          prop="roleKey"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column :label="t('common.sort')" prop="sort" width="80" align="center" />
        <el-table-column :label="t('common.status')" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" disable-transitions>
              {{ row.enabled ? t('common.enabled') : t('common.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.createdAt')" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              v-permission="'system:role:update'"
              link
              type="primary"
              @click="openEdit(row)"
              >{{ t('common.edit') }}</el-button
            >
            <el-button
              v-permission="'system:role:update'"
              link
              type="warning"
              @click="openAssign(row)"
              >{{ t('role.permissions') }}</el-button
            >
            <el-button
              v-permission="'system:role:delete'"
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

      <Pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        @change="getList"
      />
    </el-card>

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.editingId === null ? t('common.add') : t('common.edit')"
      width="480px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item :label="t('role.name')" prop="name">
          <el-input v-model.trim="form.name" maxlength="30" />
        </el-form-item>
        <el-form-item :label="t('role.roleKey')" prop="roleKey">
          <el-input
            v-model.trim="form.roleKey"
            :disabled="dialog.isBuiltin"
            :placeholder="dialog.isBuiltin ? t('role.builtinRoleKeyLocked') : ''"
            maxlength="100"
          />
        </el-form-item>
        <el-form-item :label="t('common.sort')">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item :label="t('common.status')">
          <el-switch v-model="form.enabled" />
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

    <el-dialog
      v-model="assignDialog.visible"
      :title="`${t('role.assignTitle')} — ${assignDialog.roleName}`"
      width="560px"
    >
      <el-scrollbar max-height="420px">
        <div v-for="group in permGroups" :key="group.resource" class="tg-role__perm-group">
          <div class="tg-role__perm-group-title">{{ group.name }}（{{ group.resource }}）</div>
          <el-checkbox-group v-model="checkedPerms">
            <el-checkbox
              v-for="p in group.permissions"
              :key="p.id"
              :value="`${p.resource}:${p.action}`"
            >
              {{ p.name }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
      </el-scrollbar>
      <template #footer>
        <el-button @click="assignDialog.visible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submitAssign">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.tg-role__perm-group {
  margin-bottom: 12px;
}

.tg-role__perm-group-title {
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--el-text-color-primary);
}
</style>
