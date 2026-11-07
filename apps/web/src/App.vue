<script setup lang="ts">
import { computed } from 'vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import en from 'element-plus/es/locale/lang/en';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '@/stores/app';

const { locale } = useI18n();
const appStore = useAppStore();

// Element Plus 组件内部文案跟随应用语言（ConfigProvider 响应式注入）
const epLocale = computed(() => (appStore.locale === 'zh-CN' ? zhCn : en));

// i18n locale 与 store 保持一致（store 是唯一持久化事实源）
locale.value = appStore.locale;
</script>

<template>
  <el-config-provider :locale="epLocale">
    <router-view />
  </el-config-provider>
</template>
