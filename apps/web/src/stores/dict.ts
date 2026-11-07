import { defineStore } from 'pinia';
import type { DictOption } from '@tiangong/contracts';
import { apiGetDictOptions } from '@/api/dict';

/** 字典选项缓存（进程内 + 在途去重；useDict 消费）。 */
export const useDictStore = defineStore('dict', {
  state: () => ({
    dictMap: {} as Record<string, DictOption[]>,
    inflight: {} as Record<string, Promise<void>>,
  }),
  actions: {
    load(dictKey: string): Promise<void> {
      if (this.dictMap[dictKey]) {
        return Promise.resolve();
      }
      this.inflight[dictKey] ??= apiGetDictOptions(dictKey)
        .then((options) => {
          this.dictMap[dictKey] = options;
        })
        .finally(() => {
          delete this.inflight[dictKey];
        });
      return this.inflight[dictKey] ?? Promise.resolve();
    },
    options(dictKey: string): DictOption[] {
      return this.dictMap[dictKey] ?? [];
    },
  },
});
