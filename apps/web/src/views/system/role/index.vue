<script setup lang="ts">
import { computed, onMounted, provide, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { PermissionGroup, RoleItem } from '@tiangong/contracts';
import { apiCreateRole, apiDeleteRole, apiGetRole, apiListRoles, apiUpdateRole } from '@/api/roles';
import { apiListPermissions } from '@/api/permissions';
import Pagination from '@/components/Pagination.vue';
import RightToolbar from '@/components/RightToolbar.vue';
import SearchForm from '@/components/SearchForm.vue';
import { confirmDelete } from '@/utils/confirm';
import { formatDateTime } from '@/utils/datetime';
import { shouldStepBack } from '@/utils/paging';
import AssignDialog from './AssignDialog.vue';
import RoleFormDialog from './RoleFormDialog.vue';
import {
  buildRoleRules,
  createRoleForm,
  ENABLED_FILTER_OPTIONS,
  fillRoleForm,
  roleFormKey,
  toCreateRole,
  toUpdateRole,
} from './form';
import type { RoleDialogState } from './form';

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
  Object.assign(query, { page: 1, keyword: '', enabled: undefined });
  void getList();
}

// ---- 新增/修改 ----
const dialog = reactive<RoleDialogState>({ visible: false, editingId: null, isBuiltin: false });
const formRef = ref<{ validate: () => Promise<boolean> }>();
const submitting = ref(false);
const form = createRoleForm();
// 表单对象经 provide 下发：弹窗内字段直接读写同一对象
provide(roleFormKey, form);
const rules: FormRules = buildRoleRules(t);

function openCreate(): void {
  Object.assign(dialog, { editingId: null, isBuiltin: false });
  fillRoleForm(form, null);
  dialog.visible = true;
}

function openEdit(row: RoleItem): void {
  Object.assign(dialog, { editingId: row.id, isBuiltin: row.builtin });
  fillRoleForm(form, row);
  // 编辑时先拉详情预填已授权限（需权限点 id 集合），弹窗内复用分配面板
  void apiGetRole(row.id).then((detail) => {
    form.permissionIds = permIdsOf(detail.permissions);
  });
  dialog.visible = true;
}

// ---- 权限分配 ----
const permGroups = ref<PermissionGroup[]>([]);
const assignDialog = reactive({ visible: false, roleId: 0, roleName: '' });
const checkedPerms = ref<string[]>([]);

const permFlat = computed(() =>
  permGroups.value.flatMap((g) =>
    g.permissions.map((p) => ({ id: p.id, key: `${p.resource}:${p.action}` })),
  ),
);

function permIdsOf(keys: string[]): number[] {
  const idByKey = new Map(permFlat.value.map((p) => [p.key, p.id]));
  return keys.flatMap((k) => [idByKey.get(k)].filter((id) => id !== undefined));
}

function openAssign(row: RoleItem): void {
  Object.assign(assignDialog, { roleId: row.id, roleName: row.name });
  checkedPerms.value = [];
  void apiListPermissions({}).then(async (groups) => {
    permGroups.value = groups;
    const detail = await apiGetRole(row.id);
    checkedPerms.value = detail.permissions;
  });
  assignDialog.visible = true;
}

/** 保存后的统一收尾：关闭弹窗、提示、刷新列表。 */
async function afterSaved(): Promise<void> {
  dialog.visible = false;
  ElMessage.success(t('common.opSuccess'));
  await getList();
}

/** 保存分配结果：关闭分配弹窗并沿用同一收尾。 */
async function submitAssign(): Promise<void> {
  await apiUpdateRole(assignDialog.roleId, { permissionIds: permIdsOf(checkedPerms.value) });
  assignDialog.visible = false;
  await afterSaved();
}

async function submit(): Promise<void> {
  if (!(await formRef.value?.validate())) {
    return;
  }
  submitting.value = true;
  try {
    if (dialog.editingId === null) {
      await apiCreateRole(toCreateRole(form));
    } else {
      await apiUpdateRole(dialog.editingId, toUpdateRole(form, dialog.isBuiltin));
    }
    await afterSaved();
  } finally {
    submitting.value = false;
  }
}

async function onDelete(row: RoleItem): Promise<void> {
  if (row.builtin) {
    ElMessage.warning(t('role.builtinDeleteForbidden'));
    return;
  }
  if (!(await confirmDelete().catch(() => false))) {
    return;
  }
  await apiDeleteRole(row.id);
  ElMessage.success(t('common.opSuccess'));
  if (shouldStepBack(query.page, rows.value.length)) {
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
          <el-option
            v-for="opt in ENABLED_FILTER_OPTIONS"
            :key="String(opt.value)"
            :label="t(opt.labelKey)"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
    </SearchForm>

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

    <RoleFormDialog
      ref="formRef"
      v-model:visible="dialog.visible"
      :dialog="dialog"
      :rules="rules"
      :loading="submitting"
      @submit="submit"
    />

    <AssignDialog
      v-model:visible="assignDialog.visible"
      v-model:checked="checkedPerms"
      :role-name="assignDialog.roleName"
      :groups="permGroups"
      @submit="submitAssign"
    />
  </div>
</template>
