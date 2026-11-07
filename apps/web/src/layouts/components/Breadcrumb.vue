<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface CrumbItem {
  path: string;
  text: string;
}

const route = useRoute();
const { t } = useI18n();

/**
 * 静态路由 meta.title 是 i18n 键（含 '.'），动态路由 title 来自后端菜单名（原文展示）。
 */
const crumbs = computed<CrumbItem[]>(() =>
  route.matched
    .filter((r) => r.meta.title)
    .map((r) => {
      const title = String(r.meta.title);
      return {
        path: r.path,
        text: title.includes('.') ? t(title) : title,
      };
    }),
);
</script>

<template>
  <el-breadcrumb class="tg-breadcrumb" separator="/">
    <el-breadcrumb-item
      v-for="(item, i) in crumbs"
      :key="item.path"
      :to="i < crumbs.length - 1 ? item.path : undefined"
    >
      {{ item.text }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<style scoped>
.tg-breadcrumb {
  white-space: nowrap;
}
</style>
