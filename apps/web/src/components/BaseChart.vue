<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { baseChartOption, chartThemeColors, type ChartOption, echarts } from '@/utils/echarts';
import { useAppStore } from '@/stores/app';

const props = withDefaults(
  defineProps<{
    /** 图表 option（与全局主题合并渲染；配色一律走 token 现算，页面禁写色值字面量） */
    option: ChartOption;
    /** 容器高度 */
    height?: string;
    loading?: boolean;
  }>(),
  { height: '320px', loading: false },
);

const appStore = useAppStore();
const el = ref<HTMLDivElement>();
let chart: echarts.EChartsType | null = null;
let observer: ResizeObserver | null = null;

function apply(): void {
  if (!chart) return;
  // 先 notMerge 重置为主题底色，再合并页面 option（保留主题嵌套配色）
  chart.setOption(baseChartOption(), { notMerge: true });
  chart.setOption(props.option);
}

onMounted(() => {
  if (!el.value) return;
  chart = echarts.init(el.value);
  apply();
  observer = new ResizeObserver(() => chart?.resize());
  observer.observe(el.value);
});

watch(
  () => props.option,
  () => apply(),
  { deep: true },
);

// 亮暗切换：重算 token 计算色并全量重绘
watch(
  () => appStore.theme,
  () => apply(),
);

watch(
  () => props.loading,
  (loading) => {
    if (!chart) return;
    if (loading) {
      chart.showLoading('default', { color: chartThemeColors().palette[0] });
    } else {
      chart.hideLoading();
    }
  },
);

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <div ref="el" class="w-full" :style="{ height }" />
</template>
