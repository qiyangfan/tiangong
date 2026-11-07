<script setup lang="ts">
import { onError, onUnhandledRejection } from '@dcloudio/uni-app';
import { reportError } from '@/utils/global-error';

// uni 运行时错误（error 为序列化后的堆栈串）与未捕获 Promise 拒绝统一走全局兜底
onError((error) => {
  reportError(error, 'app.onError');
});

onUnhandledRejection((options) => {
  reportError(options.reason, 'app.onUnhandledRejection');
});
</script>

<style>
/* 微信原生 button 自带 ::after 描边，跨页统一去掉（uni-app App.vue 的 style 即全局样式） */
button::after {
  border: none;
}
</style>
