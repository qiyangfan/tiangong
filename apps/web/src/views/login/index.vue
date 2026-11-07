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
  <div class="tg-login">
    <el-card class="tg-login__card" shadow="always">
      <div class="tg-login__head">
        <h1 class="tg-login__title">{{ t('login.title') }}</h1>
        <p class="tg-login__subtitle">{{ t('login.subtitle') }}</p>
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
        <el-form-item>
          <el-button
            class="tg-login__btn"
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

<style scoped>
.tg-login {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color-page);
}

.tg-login__card {
  width: 380px;
}

.tg-login__head {
  text-align: center;
  margin-bottom: 20px;
}

.tg-login__title {
  margin: 0;
  font-size: 22px;
  color: var(--el-text-color-primary);
}

.tg-login__subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.tg-login__btn {
  width: 100%;
}
</style>
