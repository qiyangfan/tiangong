<script setup lang="ts">
import { onMounted, provide, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { RoleItem, UserItem } from '@tiangong/contracts';
import {
  apiCreateUser,
  apiDeleteUser,
  apiListUsers,
  apiResetUserPassword,
  apiSetUserEnabled,
  apiUpdateUser,
} from '@/api/users';
import { apiListRoles } from '@/api/roles';
import { useAuthStore } from '@/stores/auth';
import FormDialog from '@/components/FormDialog.vue';
import Pagination from '@/components/Pagination.vue';
import RightToolbar from '@/components/RightToolbar.vue';
import SearchForm from '@/components/SearchForm.vue';
import { confirmDelete } from '@/utils/confirm';
import { shouldStepBack } from '@/utils/paging';
import UserFormFields from './UserFormFields.vue';
import UserTable from './UserTable.vue';
import {
  buildResetRules,
  buildUserRules,
  createUserForm,
  fillUserForm,
  toCreateUser,
  toUpdateUser,
  userFormKey,
} from './form';
import type { UserDialogState } from './form';

const { t } = useI18n();
const auth = useAuthStore();

// ---- 列表与查询 ----
const loading = ref(false);
const rows = ref<UserItem[]>([]);
const total = ref(0);
const showSearch = ref(true);
const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  enabled: undefined as boolean | undefined,
  roleId: undefined as number | undefined,
});

async function getList(): Promise<void> {
  loading.value = true;
  try {
    const res = await apiListUsers({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword === '' ? undefined : query.keyword,
      enabled: query.enabled,
      roleId: query.roleId,
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
  query.roleId = undefined;
  onSearch();
}

// ---- 弹窗表单 ----
const dialog = reactive<UserDialogState>({ visible: false, editingId: null });
const formRef = ref<{ validate: () => Promise<boolean> }>();
const submitting = ref(false);
const roleOptions = ref<RoleItem[]>([]);
const form = createUserForm();
// 表单对象经 provide 下发：字段组件直接读写同一对象，免去 prop 回写样板
provide(userFormKey, form);
const rules: FormRules = buildUserRules(t);

async function loadRoleOptions(): Promise<void> {
  const res = await apiListRoles({ page: 1, pageSize: 100 });
  roleOptions.value = res.items;
}

function openCreate(): void {
  dialog.editingId = null;
  fillUserForm(form, null);
  dialog.visible = true;
  void loadRoleOptions();
}

function openEdit(row: UserItem): void {
  dialog.editingId = row.id;
  fillUserForm(form, row);
  dialog.visible = true;
  void loadRoleOptions();
}

/** 提交成功后的收尾：关闭弹窗、提示、刷新列表。 */
async function afterSaved(): Promise<void> {
  dialog.visible = false;
  ElMessage.success(t('common.opSuccess'));
  await getList();
}

async function submit(): Promise<void> {
  if (!(await formRef.value?.validate())) {
    return;
  }
  submitting.value = true;
  try {
    if (dialog.editingId === null) {
      await apiCreateUser(toCreateUser(form));
    } else {
      await apiUpdateUser(dialog.editingId, toUpdateUser(form));
    }
    await afterSaved();
  } finally {
    submitting.value = false;
  }
}

async function onDelete(row: UserItem): Promise<void> {
  if (row.id === auth.user?.id) {
    ElMessage.warning(t('user.selfDeleteForbidden'));
    return;
  }
  if (!(await confirmDelete().catch(() => false))) {
    return;
  }
  await apiDeleteUser(row.id);
  ElMessage.success(t('common.opSuccess'));
  // 当前页删空时回退一页
  if (shouldStepBack(query.page, rows.value.length)) {
    query.page -= 1;
  }
  await getList();
}

// ---- 启停与重置密码 ----
async function onToggleEnabled(row: UserItem, enabled: boolean): Promise<void> {
  if (!enabled && row.id === auth.user?.id) {
    ElMessage.warning(t('user.selfDisableForbidden'));
    return;
  }
  await apiSetUserEnabled(row.id, enabled);
  row.enabled = enabled;
  ElMessage.success(t('common.opSuccess'));
}

const resetDialog = reactive({ visible: false, userId: 0, username: '', newPassword: '' });
const resetFormRef = ref<FormInstance>();
const resetRules: FormRules = buildResetRules(t);

function openReset(row: UserItem): void {
  resetDialog.userId = row.id;
  resetDialog.username = row.username;
  resetDialog.newPassword = '';
  resetDialog.visible = true;
}

async function submitReset(): Promise<void> {
  const ok = await resetFormRef.value?.validate().catch(() => false);
  if (!ok) {
    return;
  }
  await apiResetUserPassword(resetDialog.userId, { newPassword: resetDialog.newPassword });
  resetDialog.visible = false;
  ElMessage.success(t('user.resetSuccess'));
}

// 状态筛选项与页内表单同一取值口径（true/false，清除即不过滤）
const enabledOptions = [
  { labelKey: 'common.enabled', value: true },
  { labelKey: 'common.disabled', value: false },
];

onMounted(() => {
  void getList();
});
</script>

<template>
  <div class="tg-page">
    <!-- 搜索区 -->
    <SearchForm v-show="showSearch" @search="onSearch" @reset="onReset">
      <el-form-item :label="t('common.keyword')">
        <el-input
          v-model.trim="query.keyword"
          :placeholder="t('user.username') + '/' + t('user.nickname') + '/' + t('user.phone')"
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
          :aria-label="t('common.status')"
        >
          <el-option
            v-for="opt in enabledOptions"
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
            v-permission="'system:user:create'"
            type="primary"
            :icon="Plus"
            @click="openCreate"
          >
            {{ t('common.add') }}
          </el-button>
        </div>
        <RightToolbar v-model:show-search="showSearch" @refresh="getList" />
      </div>

      <UserTable
        :rows="rows"
        :loading="loading"
        @edit="openEdit"
        @reset-password="openReset"
        @delete="onDelete"
        @toggle-enabled="onToggleEnabled"
      />

      <Pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        @change="getList"
      />
    </el-card>

    <!-- 字段区拆为组件以控制单文件规模；ref 暴露 validate，提交前由本页调用 -->
    <UserFormFields
      ref="formRef"
      v-model:visible="dialog.visible"
      :rules="rules"
      :editing-id="dialog.editingId"
      :role-options="roleOptions"
      :loading="submitting"
      @submit="submit"
    />

    <FormDialog
      v-model="resetDialog.visible"
      :title="`${t('user.resetPwdTitle')}：${resetDialog.username}`"
      width="420px"
      :confirm-text="t('common.confirm')"
      @submit="submitReset"
    >
      <el-form ref="resetFormRef" :model="resetDialog" :rules="resetRules" label-width="80px">
        <el-form-item :label="t('user.newPassword')" prop="newPassword">
          <el-input
            v-model="resetDialog.newPassword"
            type="password"
            show-password
            maxlength="72"
          />
        </el-form-item>
      </el-form>
    </FormDialog>
  </div>
</template>
