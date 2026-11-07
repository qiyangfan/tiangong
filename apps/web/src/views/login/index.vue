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
  <!-- 门面基准（UI_STYLEGUIDE）：页面底色 + 品牌色单色顶部淡晕，无渐变光斑无玻璃 -->
  <div
    class="flex h-screen items-center justify-center bg-[var(--el-bg-color-page)] [background-image:linear-gradient(180deg,color-mix(in_srgb,var(--el-color-primary)_7%,transparent),transparent_60%)]"
  >
    <el-card class="w-[400px]" shadow="always">
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--el-color-primary)] text-xl font-bold text-white"
        >
          天
        </div>
        <h1
          class="m-0 text-[var(--tg-font-size-title)] font-semibold text-[var(--el-text-color-primary)]"
        >
          {{ t('login.title') }}
        </h1>
        <p
          class="mb-0 mt-2 text-[var(--tg-font-size-caption)] text-[var(--el-text-color-secondary)]"
        >
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
            class="w-full tracking-[6px] [text-indent:6px]"
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
