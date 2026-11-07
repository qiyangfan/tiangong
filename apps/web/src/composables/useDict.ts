import { computed, type ComputedRef } from 'vue';
import type { DictOption } from '@tiangong/contracts';
import { useDictStore } from '@/stores/dict';

export type DictOptionsRef = ComputedRef<DictOption[]>;

/**
 * RuoYi useDict 三元结构（label/value/tagType）重写版：
 * const { sys_oper_type } = useDict('sys_oper_type');
 * 服务端拉取 + Pinia 缓存 + 在途去重。
 */
export function useDict<K extends string>(...keys: K[]): { [P in K]: DictOptionsRef } {
  const store = useDictStore();
  const result = {} as { [P in K]: DictOptionsRef };
  for (const key of keys) {
    void store.load(key);
    result[key] = computed(() => store.options(key));
  }
  return result;
}
