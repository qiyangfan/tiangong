<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { apiUpdateProfile } from '@/api/auth';
import FormDialog from '@/components/FormDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { formatDateTime } from '@/utils/datetime';

const { t } = useI18n();
const auth = useAuthStore();

const profileFormRef = ref<FormInstance>();
const profileDialog = ref(false);
const profileSubmitting = ref(false);
const profileForm = reactive({ nickname: '', email: '' });

const pwdFormRef = ref<FormInstance>();
const pwdSubmitting = ref(false);
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' });

onMounted(() => {
  void auth.reloadProfile();
});

function openProfileDialog(): void {
  profileForm.nickname = auth.profile?.nickname ?? '';
  profileForm.email = auth.profile?.email ?? '';
  profileDialog.value = true;
}

async function submitProfile(): Promise<void> {
  const ok = await profileFormRef.value?.validate().catch(() => false);
  if (!ok) {
    return;
  }
  profileSubmitting.value = true;
  try {
    await apiUpdateProfile({
      nickname: profileForm.nickname,
      email: profileForm.email === '' ? undefined : profileForm.email,
    });
    await auth.reloadProfile();
    profileDialog.value = false;
    ElMessage.success(t('common.opSuccess'));
  } finally {
    profileSubmitting.value = false;
  }
}

const pwdRules: FormRules = {
  oldPassword: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('profile.oldPassword') }),
      trigger: 'blur',
    },
  ],
  newPassword: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('profile.newPassword') }),
      trigger: 'blur',
    },
    { min: 8, max: 72, message: '8 - 72 chars', trigger: 'blur' },
  ],
  confirmPassword: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('profile.confirmNewPassword') }),
      trigger: 'blur',
    },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== pwdForm.newPassword) {
          callback(new Error(t('profile.passwordMismatch')));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

async function submitPassword(): Promise<void> {
  const ok = await pwdFormRef.value?.validate().catch(() => false);
  if (!ok) {
    return;
  }
  pwdSubmitting.value = true;
  try {
    await auth.changePassword(pwdForm.oldPassword, pwdForm.newPassword);
    ElMessage.success(t('profile.passwordChanged'));
  } finally {
    pwdSubmitting.value = false;
  }
}
</script>

<template>
  <div class="tg-page">
    <el-row :gutter="12">
      <el-col :xs="24" :md="12">
        <el-card shadow="never">
          <template #header>
            <div class="tg-profile__header">
              <span>{{ t('profile.basicInfo') }}</span>
              <el-button size="small" @click="openProfileDialog">{{
                t('profile.editProfile')
              }}</el-button>
            </div>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item :label="t('profile.username')">{{
              auth.profile?.username ?? '-'
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('profile.nickname')">{{
              auth.profile?.nickname ?? '-'
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('profile.email')">{{
              auth.profile?.email ?? '-'
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('profile.createdAt')">{{
              formatDateTime(auth.profile?.createdAt)
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('profile.lastLoginAt')">{{
              formatDateTime(auth.profile?.lastLoginAt)
            }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card shadow="never">
          <template #header>{{ t('profile.changePassword') }}</template>
          <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="100px">
            <el-form-item :label="t('profile.oldPassword')" prop="oldPassword">
              <el-input
                v-model="pwdForm.oldPassword"
                type="password"
                show-password
                autocomplete="current-password"
              />
            </el-form-item>
            <el-form-item :label="t('profile.newPassword')" prop="newPassword">
              <el-input
                v-model="pwdForm.newPassword"
                type="password"
                show-password
                autocomplete="new-password"
              />
            </el-form-item>
            <el-form-item :label="t('profile.confirmNewPassword')" prop="confirmPassword">
              <el-input
                v-model="pwdForm.confirmPassword"
                type="password"
                show-password
                autocomplete="new-password"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="pwdSubmitting" @click="submitPassword">{{
                t('common.submit')
              }}</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <FormDialog
      v-model="profileDialog"
      :title="t('profile.editProfile')"
      width="420px"
      :loading="profileSubmitting"
      :confirm-text="t('common.save')"
      @submit="submitProfile"
    >
      <el-form ref="profileFormRef" :model="profileForm" label-width="80px">
        <el-form-item :label="t('profile.nickname')" required>
          <el-input v-model.trim="profileForm.nickname" maxlength="30" />
        </el-form-item>
        <el-form-item :label="t('profile.email')">
          <el-input v-model.trim="profileForm.email" maxlength="100" />
        </el-form-item>
      </el-form>
    </FormDialog>
  </div>
</template>

<style scoped>
.tg-profile__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
