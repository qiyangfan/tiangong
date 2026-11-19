<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { Odometer, User, Avatar, Menu, Collection, Document } from '@element-plus/icons-vue';
import type { BusinessType } from '@tiangong/contracts';
import { checkPermi } from '@/composables/usePermission';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { apiGetDictOptions } from '@/api/dict';
import { apiListLoginLogs, apiListOperLogs } from '@/api/audit';
import BaseChart from '@/components/BaseChart.vue';
import { type ChartOption, chartThemeColors } from '@/utils/echarts';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const auth = useAuthStore();

interface QuickLink {
  path: string;
  label: string;
  icon: typeof User;
  perm?: string;
}

const links = computed<QuickLink[]>(() => {
  const all: QuickLink[] = [
    { path: '/system/user', label: t('quickLinks.users'), icon: User },
    { path: '/system/role', label: t('quickLinks.roles'), icon: Avatar },
    { path: '/system/menu', label: t('quickLinks.menus'), icon: Menu },
    { path: '/system/dict', label: t('quickLinks.dicts'), icon: Collection },
    { path: '/audit/oper-log', label: t('quickLinks.operLogs'), icon: Document },
  ];
  return all.filter((l) => !l.perm || checkPermi(l.perm));
});

// 技术栈名词列表不进 i18n（专有名词，zh/en 一致）
const stackItems = [
  'NestJS 11',
  'Prisma',
  'MySQL 8.4',
  'Vue 3',
  'Element Plus',
  'Tailwind v4',
  'ECharts',
  'uni-app',
];

// ---- 运营概览图表：真实数据，口径=最近 100 条（UI_STYLEGUIDE 图表规矩）----
// 权限门控沿用本页 checkPermi 先例：无权限不出卡片、不发请求
const canOper = checkPermi('audit:oper:list');
const canLogin = checkPermi('audit:login:list');

// 只存聚合结果；option 用 computed 依赖 theme/locale 构建——主题或语言切换时
// 重新取计算色，BaseChart 监听 option 变化即自动重绘
const operStats = ref<{ name: string; value: number }[]>([]);
const loginStats = ref<{ ok: number; fail: number } | null>(null);
// 加载态驱动卡片 v-loading（与表格先例一致）；数据空或失败渲染 el-empty
const operLoading = ref(true);
const loginLoading = ref(true);

// 主题切换经 html.dark 改变 CSS 计算值：computed 读取 theme 建立响应式依赖，
// 亮暗切换时取到新档计算色
const chartColors = computed(() => {
  const theme = appStore.theme;
  return { theme, ...chartThemeColors() };
});

const operOption = computed<ChartOption | null>(() => {
  if (operStats.value.length === 0) {
    return null;
  }
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '44%'],
        label: { color: chartColors.value.textPrimary, formatter: '{b}: {c}' },
        data: operStats.value,
      },
    ],
  };
});

const loginOption = computed<ChartOption | null>(() => {
  const { palette, textSecondary, border } = chartColors.value;
  if (!loginStats.value) {
    return null;
  }
  return {
    tooltip: { trigger: 'item' },
    grid: { left: 16, right: 16, top: 24, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: [t('dashboard.chartLoginOk'), t('dashboard.chartLoginFail')],
      axisLabel: { color: textSecondary },
      axisLine: { lineStyle: { color: border } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: textSecondary },
      splitLine: { lineStyle: { color: border } },
    },
    series: [
      {
        type: 'bar',
        barWidth: 56,
        // palette[1]=success、palette[3]=danger：状态语义色，不进调色板轮转
        data: [
          { value: loginStats.value.ok, itemStyle: { color: palette[1] } },
          { value: loginStats.value.fail, itemStyle: { color: palette[3] } },
        ],
      },
    ],
  };
});

// 请求失败在此吞掉：错误提示已由 request 层统一 toast，卡片落空态界面
async function loadOperChart(): Promise<void> {
  try {
    const [res, dictOptions] = await Promise.all([
      apiListOperLogs({ page: 1, pageSize: 100 }),
      apiGetDictOptions('sys_oper_type'),
    ]);
    const counts = new Map<BusinessType, number>();
    for (const row of res.items) {
      counts.set(row.businessType, (counts.get(row.businessType) ?? 0) + 1);
    }
    const labelOf = (value: BusinessType): string =>
      dictOptions.find((o) => o.value === value)?.label ?? value;
    operStats.value = [...counts.entries()].map(([value, count]) => ({
      name: labelOf(value),
      value: count,
    }));
  } catch {
    // 已由 request 层提示
  } finally {
    operLoading.value = false;
  }
}

async function loadLoginChart(): Promise<void> {
  try {
    const res = await apiListLoginLogs({ page: 1, pageSize: 100 });
    const okCount = res.items.filter((r) => r.status === 'ok').length;
    loginStats.value = { ok: okCount, fail: res.items.length - okCount };
  } catch {
    // 已由 request 层提示
  } finally {
    loginLoading.value = false;
  }
}

onMounted(() => {
  if (canOper) void loadOperChart();
  if (canLogin) void loadLoginChart();
});

function go(path: string): void {
  void router.push(path);
}
</script>

<template>
  <div class="tg-page">
    <!-- 问候横幅：品牌淡底纯色（UI_STYLEGUIDE 门面基准，禁渐变/玻璃） -->
    <div
      class="flex items-center gap-4 rounded-xl border border-[var(--el-border-color-light)] bg-[var(--el-color-primary-light-9)] px-6 py-6"
    >
      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--el-color-primary)] text-white"
      >
        <el-icon :size="22"><Odometer /></el-icon>
      </div>
      <div>
        <h2
          class="m-0 text-[var(--tg-font-size-title)] font-semibold text-[var(--el-text-color-primary)]"
        >
          {{ t('dashboard.greeting', { name: auth.displayName }) }}
        </h2>
        <p class="mb-0 mt-1 text-[var(--tg-font-size-body)] text-[var(--el-text-color-secondary)]">
          {{ t('dashboard.subtitle') }}
        </p>
      </div>
    </div>

    <!-- 运营概览：真实数据，口径如实标注（UI_STYLEGUIDE 图表规矩） -->
    <el-row v-if="canOper || canLogin" :gutter="12" class="mt-4">
      <el-col v-if="canOper" :xs="24" :md="12">
        <el-card shadow="never">
          <template #header>
            <div class="flex items-center gap-2">
              <span class="tg-card-title">{{ t('dashboard.chartOperTitle') }}</span>
              <span class="tg-form-tip">{{ t('dashboard.chartScope') }}</span>
            </div>
          </template>
          <div v-loading="operLoading" class="min-h-[320px]">
            <BaseChart v-if="operOption" :option="operOption" />
            <el-empty v-else-if="!operLoading" :description="t('common.noData')" :image-size="60" />
          </div>
        </el-card>
      </el-col>
      <el-col v-if="canLogin" :xs="24" :md="12" class="mt-4 md:mt-0">
        <el-card shadow="never">
          <template #header>
            <div class="flex items-center gap-2">
              <span class="tg-card-title">{{ t('dashboard.chartLoginTitle') }}</span>
              <span class="tg-form-tip">{{ t('dashboard.chartScope') }}</span>
            </div>
          </template>
          <div v-loading="loginLoading" class="min-h-[320px]">
            <BaseChart v-if="loginOption" :option="loginOption" />
            <el-empty
              v-else-if="!loginLoading"
              :description="t('common.noData')"
              :image-size="60"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="mt-4">
      <template #header>
        <span class="tg-card-title">{{ t('dashboard.quickLinks') }}</span>
      </template>
      <div class="flex flex-wrap gap-3">
        <div
          v-for="link in links"
          :key="link.path"
          class="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--el-border-color-light)] px-4 py-2 text-[var(--el-text-color-regular)] transition-colors hover:border-[var(--el-color-primary)] hover:text-[var(--el-color-primary)]"
          @click="go(link.path)"
        >
          <el-icon :size="16"><component :is="link.icon" /></el-icon>
          <span>{{ link.label }}</span>
        </div>
        <el-empty v-if="links.length === 0" :description="t('common.noData')" :image-size="60" />
      </div>
    </el-card>

    <el-card shadow="never" class="mt-4">
      <template #header>
        <span class="tg-card-title">{{ t('dashboard.stackTitle') }}</span>
      </template>
      <div class="flex flex-wrap gap-2">
        <el-tag
          v-for="item in stackItems"
          :key="item"
          type="info"
          effect="plain"
          disable-transitions
        >
          {{ item }}
        </el-tag>
      </div>
    </el-card>
  </div>
</template>
