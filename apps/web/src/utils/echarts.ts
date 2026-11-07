/**
 * ECharts 单源注册与主题（UI_STYLEGUIDE「图表规矩」）：
 * - 图表类型/组件只在此文件按需注册（控制包体），要用新类型改这里；
 * - 页面禁直接 echarts.init，一律走 components/BaseChart.vue；
 * - canvas 不解析 CSS 变量字符串，主题色必须在运行时读计算值——
 *   这同时让图表随 html.dark 切换自动拿到亮暗两套色。
 * - 提亮档（--el-color-*-light-3）是 color-mix() 表达式，自定义属性计算值
 *   不会被浏览器解析成颜色，须经隐藏元素强制求值成 rgb() 串（zrender 只认
 *   named/hex/rgb()/hsl()）。
 */
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  CanvasRenderer,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  BarChart,
  LineChart,
  PieChart,
]);

export type ChartOption = Parameters<echarts.EChartsType['setOption']>[0];

export interface ChartThemeColors {
  /** 分类系列调色板：语义五色 + 提亮档（超过 5 个系列时轮转） */
  palette: string[];
  textPrimary: string;
  textSecondary: string;
  border: string;
  tooltipBg: string;
}

// 隐藏元素承载 var() 求值：color 属性非布局依赖，display:none 下 computed 值同样可用
let probe: HTMLSpanElement | null = null;

function resolveVar(name: string): string {
  if (!probe) {
    probe = document.createElement('span');
    probe.style.display = 'none';
    document.documentElement.appendChild(probe);
  }
  probe.style.color = `var(${name})`;
  const resolved = getComputedStyle(probe).color;
  // 现代浏览器把 color-mix 结果序列化为 color(srgb …)，zrender 只认 rgb()/hsl()——归一化
  const m = resolved.match(
    /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/,
  );
  if (!m) return resolved;
  const ch = (raw: string | undefined): number => Math.round(parseFloat(raw ?? '0') * 255);
  const r = ch(m[1]);
  const g = ch(m[2]);
  const b = ch(m[3]);
  return m[4] ? `rgba(${r}, ${g}, ${b}, ${m[4]})` : `rgb(${r}, ${g}, ${b})`;
}

/** 从 CSS token 现算图表主题色（亮暗两套随 html.dark 自动切换）。 */
export function chartThemeColors(): ChartThemeColors {
  const v = resolveVar;
  return {
    palette: [
      v('--el-color-primary'),
      v('--el-color-success'),
      v('--el-color-warning'),
      v('--el-color-danger'),
      v('--el-color-info'),
      v('--el-color-primary-light-3'),
      v('--el-color-success-light-3'),
      v('--el-color-warning-light-3'),
    ],
    textPrimary: v('--el-text-color-primary'),
    textSecondary: v('--el-text-color-secondary'),
    border: v('--el-border-color'),
    tooltipBg: v('--el-bg-color'),
  };
}

/** 全局主题 option：BaseChart 先以此 notMerge 重置，再合并页面 option。 */
export function baseChartOption(): ChartOption {
  const c = chartThemeColors();
  return {
    color: c.palette,
    textStyle: { color: c.textPrimary },
    legend: { textStyle: { color: c.textSecondary } },
    tooltip: {
      backgroundColor: c.tooltipBg,
      borderColor: c.border,
      textStyle: { color: c.textPrimary },
    },
  };
}

export { echarts };
