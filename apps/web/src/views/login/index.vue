<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const auth = useAuthStore();

const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive({
  username: '',
  password: '',
});

const rules: FormRules = {
  username: [{ required: true, message: () => t('login.usernameRequired'), trigger: 'blur' }],
  password: [{ required: true, message: () => t('login.passwordRequired'), trigger: 'blur' }],
};

async function onLogin(): Promise<void> {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) {
    return;
  }
  submitting.value = true;
  try {
    await auth.login({ username: form.username, password: form.password, client: 'web' });
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.push(redirect);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div
    class="flex h-screen items-center justify-center bg-[var(--el-bg-color-page)] [background-image:radial-gradient(ellipse_60%_50%_at_20%_10%,rgba(79,70,229,0.12),transparent),radial-gradient(ellipse_50%_60%_at_85%_85%,rgba(139,92,246,0.10),transparent)] dark:[background-image:radial-gradient(ellipse_60%_50%_at_20%_10%,rgba(129,140,248,0.14),transparent),radial-gradient(ellipse_50%_60%_at_85%_85%,rgba(167,139,250,0.10),transparent)]"
  >
    <el-card class="w-[400px] shadow-xl" shadow="always">
      <div class="mb-6 text-center">
        <div
          class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-xl font-bold text-white"
        >
          天
        </div>
        <h1 class="m-0 text-[22px] font-semibold text-[var(--el-text-color-primary)]">
          {{ t('login.title') }}
        </h1>
        <p class="mt-1.5 mb-0 text-[13px] text-[var(--el-text-color-secondary)]">
          {{ t('login.subtitle') }}
        </p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="onLogin">
        <el-form-item prop="username">
          <el-input
            v-model.trim="form.username"
            :placeholder="t('login.usernamePlaceholder')"
            :prefix-icon="User"
            autocomplete="username"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="t('login.passwordPlaceholder')"
            :prefix-icon="Lock"
            autocomplete="current-password"
          />
        </el-form-item>
        <el-form-item class="mb-0">
          <el-button
            class="w-full tracking-[6px]"
            type="primary"
            size="large"
            :loading="submitting"
            @click="onLogin"
          >
            {{ t('login.loginBtn') }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
