<script setup lang="ts">
import { inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import FormDialog from '@/components/FormDialog.vue';
import { menuFormKey, type MenuDialogState, type MenuForm, type TreeSelectNode } from './menu';

const { t } = useI18n();

// 表单对象由页面创建并经 provide 下发：字段直接绑定页面状态
const model = inject(menuFormKey) as MenuForm;

const props = defineProps<{
  dialog: MenuDialogState;
  rules: FormRules;
  treeSelectData: TreeSelectNode[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'submit'): void;
}>();

const formRef = ref<FormInstance>();

/** 提交前由页面调用；与 el-form 原生 validate 同语义。 */
async function validate(): Promise<boolean> {
  return (await formRef.value?.validate().catch(() => false)) === true;
}

defineExpose({ validate });
</script>

<template>
  <FormDialog
    :model-value="props.dialog.visible"
    :title="props.dialog.editingId === null ? t('common.add') : t('common.edit')"
    width="560px"
    :loading="props.loading"
    @update:model-value="emit('update:visible', $event)"
    @submit="emit('submit')"
  >
    <el-form ref="formRef" :model="model" :rules="props.rules" label-width="100px">
      <el-form-item :label="t('menu.parentMenu')">
        <el-tree-select
          v-model="model.parentId"
          :data="props.treeSelectData"
          :props="{ value: 'id', label: 'name', children: 'children' }"
          value-key="id"
          node-key="id"
          check-strictly
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item :label="t('menu.menuType')">
        <el-radio-group v-model="model.menuType" :disabled="props.dialog.editingId !== null">
          <el-radio-button value="M">{{ t('menu.typeDir') }}</el-radio-button>
          <el-radio-button value="C">{{ t('menu.typeMenu') }}</el-radio-button>
          <el-radio-button value="F">{{ t('menu.typeButton') }}</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="t('menu.name')" prop="name">
        <el-input v-model.trim="model.name" maxlength="50" />
      </el-form-item>
      <el-form-item v-if="model.menuType !== 'F'" :label="t('menu.path')" prop="path">
        <el-input v-model.trim="model.path" maxlength="200" placeholder="/system 或 user" />
      </el-form-item>
      <el-form-item v-if="model.menuType === 'C'" :label="t('menu.component')" prop="component">
        <el-input
          v-model.trim="model.component"
          maxlength="255"
          :placeholder="t('menu.componentTip')"
        />
      </el-form-item>
      <el-form-item v-if="model.menuType !== 'M'" :label="t('menu.perms')">
        <el-input v-model.trim="model.perms" maxlength="100" :placeholder="t('menu.permsTip')" />
      </el-form-item>
      <el-form-item v-if="model.menuType !== 'F'" :label="t('menu.icon')">
        <el-input v-model.trim="model.icon" maxlength="100" placeholder="setting / log / tool" />
      </el-form-item>
      <el-form-item :label="t('common.sort')">
        <el-input-number v-model="model.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item v-if="model.menuType === 'C'" :label="t('menu.visible')">
        <el-switch v-model="model.visible" />
      </el-form-item>
      <el-form-item :label="t('common.status')">
        <el-switch v-model="model.enabled" />
      </el-form-item>
      <el-form-item :label="t('common.remark')">
        <el-input v-model="model.remark" type="textarea" :rows="2" maxlength="500" />
      </el-form-item>
    </el-form>
  </FormDialog>
</template>
