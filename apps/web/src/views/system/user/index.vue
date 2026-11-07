<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, RefreshLeft, Search as SearchIcon } from '@element-plus/icons-vue';
import type { RoleItem, UserItem } from '@tiangong/contracts';
import { passwordSchema } from '@tiangong/contracts';
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
import Pagination from '@/components/Pagination.vue';
import RightToolbar from '@/components/RightToolbar.vue';
import { formatDateTime } from '@/utils/datetime';

const { t } = useI18n();
const auth = useAuthStore();

// ---- 列表与查询（第 1/3/4 段） ----
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

// ---- 弹窗表单（第 5 段） ----
const dialog = reactive({ visible: false, editingId: null as number | null });
const formRef = ref<FormInstance>();
const submitting = ref(false);
const roleOptions = ref<RoleItem[]>([]);
const form = reactive({
  username: '',
  nickname: '',
  password: '',
  email: '',
  phone: '',
  roleIds: [] as number[],
  enabled: true,
  remark: '',
});

const rules: FormRules = {
  username: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('user.username') }),
      trigger: 'blur',
    },
    {
      pattern: /^[a-zA-Z0-9_]{3,30}$/,
      message: '3-30 chars: letters, digits, underscore',
      trigger: 'blur',
    },
  ],
  nickname: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('user.nickname') }),
      trigger: 'blur',
    },
  ],
  password: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('user.password') }),
      trigger: 'blur',
    },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== '' && !passwordSchema.safeParse(value).success) {
          callback(new Error('8+ chars with letters and digits'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
  email: [{ type: 'email', message: () => t('user.invalidEmail'), trigger: 'blur' }],
};

async function loadRoleOptions(): Promise<void> {
  const res = await apiListRoles({ page: 1, pageSize: 100 });
  roleOptions.value = res.items;
}

function openCreate(): void {
  dialog.editingId = null;
  Object.assign(form, {
    username: '',
    nickname: '',
    password: '',
    email: '',
    phone: '',
    roleIds: [],
    enabled: true,
    remark: '',
  });
  dialog.visible = true;
  void loadRoleOptions();
}

function openEdit(row: UserItem): void {
  dialog.editingId = row.id;
  Object.assign(form, {
    username: row.username,
    nickname: row.nickname,
    password: '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    roleIds: row.roles.map((r) => r.id),
    enabled: row.enabled,
    remark: row.remark ?? '',
  });
  dialog.visible = true;
  void loadRoleOptions();
}

async function submit(): Promise<void> {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) {
    return;
  }
  submitting.value = true;
  try {
    if (dialog.editingId === null) {
      await apiCreateUser({
        username: form.username,
        nickname: form.nickname,
        password: form.password,
        email: form.email === '' ? undefined : form.email,
        phone: form.phone === '' ? undefined : form.phone,
        roleIds: form.roleIds,
        enabled: form.enabled,
        remark: form.remark === '' ? undefined : form.remark,
      });
    } else {
      await apiUpdateUser(dialog.editingId, {
        nickname: form.nickname,
        email: form.email === '' ? null : form.email,
        phone: form.phone === '' ? null : form.phone,
        roleIds: form.roleIds,
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

async function onDelete(row: UserItem): Promise<void> {
  if (row.id === auth.user?.id) {
    ElMessage.warning(t('user.selfDeleteForbidden'));
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
  await apiDeleteUser(row.id);
  ElMessage.success(t('common.opSuccess'));
  // 当前页删空时回退一页
  if (rows.value.length === 1 && query.page > 1) {
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

const resetRules: FormRules = {
  newPassword: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('user.newPassword') }),
      trigger: 'blur',
    },
    {
      validator: (_rule, value: string, callback) => {
        if (!passwordSchema.safeParse(value).success) {
          callback(new Error('8+ chars with letters and digits'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

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

onMounted(() => {
  void getList();
});
</script>

<template>
  <div class="tg-page">
    <!-- 第 1 段：搜索表单 -->
    <el-card v-show="showSearch" shadow="never" class="tg-search-card">
      <el-form inline @submit.prevent>
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
      <!-- 第 2 段：按钮行 -->
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

      <!-- 第 3 段：表格 -->
      <el-table v-loading="loading" :data="rows" row-key="id">
        <el-table-column
          :label="t('user.username')"
          prop="username"
          min-width="110"
          show-overflow-tooltip
        />
        <el-table-column
          :label="t('user.nickname')"
          prop="nickname"
          min-width="110"
          show-overflow-tooltip
        />
        <el-table-column :label="t('user.roles')" min-width="160">
          <template #default="{ row }">
            <el-tag
              v-for="r in row.roles"
              :key="r.id"
              size="small"
              class="tg-user__role-tag"
              disable-transitions
            >
              {{ r.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.status')" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              v-permission="'system:user:enable'"
              :model-value="row.enabled"
              :disabled="row.id === auth.user?.id"
              @change="(v: boolean | string | number) => onToggleEnabled(row, Boolean(v))"
            />
          </template>
        </el-table-column>
        <el-table-column
          :label="t('user.email')"
          prop="email"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column :label="t('profile.lastLoginAt')" min-width="150">
          <template #default="{ row }">{{ formatDateTime(row.lastLoginAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.createdAt')" min-width="150">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="230" fixed="right">
          <template #default="{ row }">
            <el-button
              v-permission="'system:user:update'"
              link
              type="primary"
              @click="openEdit(row)"
              >{{ t('common.edit') }}</el-button
            >
            <el-button
              v-permission="'system:user:reset-password'"
              link
              type="warning"
              @click="openReset(row)"
              >{{ t('user.resetPwd') }}</el-button
            >
            <el-button
              v-permission="'system:user:delete'"
              link
              type="danger"
              :disabled="row.id === auth.user?.id"
              @click="onDelete(row)"
              >{{ t('common.delete') }}</el-button
            >
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="t('common.noData')" :image-size="60" />
        </template>
      </el-table>

      <!-- 第 4 段：分页 -->
      <Pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        @change="getList"
      />
    </el-card>

    <!-- 第 5 段：弹窗表单 -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.editingId === null ? t('user.createTitle') : t('user.editTitle')"
      width="520px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item :label="t('user.username')" prop="username">
          <el-input
            v-model.trim="form.username"
            :disabled="dialog.editingId !== null"
            maxlength="30"
          />
        </el-form-item>
        <el-form-item :label="t('user.nickname')" prop="nickname">
          <el-input v-model.trim="form.nickname" maxlength="30" />
        </el-form-item>
        <el-form-item v-if="dialog.editingId === null" :label="t('user.password')" prop="password">
          <el-input v-model="form.password" type="password" show-password maxlength="72" />
        </el-form-item>
        <el-form-item :label="t('user.email')" prop="email">
          <el-input v-model.trim="form.email" maxlength="100" />
        </el-form-item>
        <el-form-item :label="t('user.phone')" prop="phone">
          <el-input v-model.trim="form.phone" maxlength="20" />
        </el-form-item>
        <el-form-item :label="t('user.roleLabel')">
          <el-select v-model="form.roleIds" multiple style="width: 100%">
            <el-option
              v-for="r in roleOptions"
              :key="r.id"
              :label="r.name"
              :value="r.id"
              :disabled="!r.enabled"
            />
          </el-select>
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
      v-model="resetDialog.visible"
      :title="t('user.resetPwdTitle') + ' — ' + resetDialog.username"
      width="420px"
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
      <template #footer>
        <el-button @click="resetDialog.visible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submitReset">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.tg-user__role-tag {
  margin-right: 4px;
}
</style>
