<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { DictItem, TagType } from '@tiangong/contracts';
import {
  apiCreateDictItem,
  apiDeleteDictItem,
  apiListDictItems,
  apiUpdateDictItem,
} from '@/api/dict';
import FormDialog from '@/components/FormDialog.vue';
import { confirmDelete } from '@/utils/confirm';

const { t } = useI18n();
const visible = defineModel<boolean>({ required: true });
const props = defineProps<{ dictKey: string; dictName: string }>();

const items = ref<DictItem[]>([]);
const loading = ref(false);

async function loadItems(): Promise<void> {
  loading.value = true;
  try {
    items.value = await apiListDictItems({ dictKey: props.dictKey });
  } finally {
    loading.value = false;
  }
}

watch(visible, (open) => {
  if (open) {
    void loadItems();
  }
});

const dialog = reactive({ visible: false, editingId: null as number | null });
const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive({
  label: '',
  value: '',
  tagType: null as TagType | null,
  sort: 0,
  isDefault: false,
  enabled: true,
  remark: '',
});

const rules: FormRules = {
  label: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('dict.label') }),
      trigger: 'blur',
    },
  ],
  value: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('dict.value') }),
      trigger: 'blur',
    },
  ],
};

const tagTypeOptions: TagType[] = ['primary', 'success', 'info', 'warning', 'danger'];

function openCreate(): void {
  dialog.editingId = null;
  Object.assign(form, {
    label: '',
    value: '',
    tagType: null,
    sort: 0,
    isDefault: false,
    enabled: true,
    remark: '',
  });
  dialog.visible = true;
}

function openEdit(row: DictItem): void {
  dialog.editingId = row.id;
  Object.assign(form, {
    label: row.label,
    value: row.value,
    tagType: row.tagType,
    sort: row.sort,
    isDefault: row.isDefault,
    enabled: row.enabled,
    remark: row.remark ?? '',
  });
  dialog.visible = true;
}

/** 按编辑态分流创建/更新；dictKey 由当前类型固定，不随表单提交。 */
async function save(): Promise<void> {
  const body = {
    label: form.label,
    value: form.value,
    tagType: form.tagType,
    sort: form.sort,
    isDefault: form.isDefault,
    enabled: form.enabled,
    remark: form.remark === '' ? undefined : form.remark,
  };
  if (dialog.editingId === null) {
    await apiCreateDictItem({ ...body, dictKey: props.dictKey });
  } else {
    await apiUpdateDictItem(dialog.editingId, body);
  }
  dialog.visible = false;
  ElMessage.success(t('common.opSuccess'));
  await loadItems();
}

async function submit(): Promise<void> {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) {
    return;
  }
  submitting.value = true;
  try {
    await save();
  } finally {
    submitting.value = false;
  }
}

async function onDelete(row: DictItem): Promise<void> {
  try {
    await confirmDelete();
  } catch {
    return;
  }
  await apiDeleteDictItem(row.id);
  ElMessage.success(t('common.opSuccess'));
  await loadItems();
}
</script>

<template>
  <el-drawer v-model="visible" :title="t('dict.itemsOf', { name: props.dictName })" size="640px">
    <div class="tg-toolbar">
      <span class="tg-form-tip">{{ props.dictKey }}</span>
      <el-button
        v-permission="'system:dict:create'"
        type="primary"
        size="small"
        :icon="Plus"
        @click="openCreate"
      >
        {{ t('common.add') }}
      </el-button>
    </div>
    <el-table v-loading="loading" :data="items" size="small" row-key="id">
      <el-table-column
        :label="t('dict.label')"
        prop="label"
        min-width="110"
        show-overflow-tooltip
      />
      <el-table-column
        :label="t('dict.value')"
        prop="value"
        min-width="100"
        show-overflow-tooltip
      />
      <el-table-column :label="t('dict.tagType')" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.tagType" :type="row.tagType" size="small" disable-transitions>{{
            row.tagType
          }}</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column :label="t('dict.isDefault')" width="80" align="center">
        <template #default="{ row }">{{ row.isDefault ? t('common.yes') : '-' }}</template>
      </el-table-column>
      <el-table-column :label="t('common.sort')" prop="sort" width="70" align="center" />
      <el-table-column :label="t('common.status')" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'" size="small" disable-transitions>
            {{ row.enabled ? t('common.enabled') : t('common.disabled') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('common.actions')" width="140" fixed="right">
        <template #default="{ row }">
          <el-button
            v-permission="'system:dict:update'"
            link
            type="primary"
            @click="openEdit(row)"
            >{{ t('common.edit') }}</el-button
          >
          <el-button
            v-permission="'system:dict:delete'"
            link
            type="danger"
            @click="onDelete(row)"
            >{{ t('common.delete') }}</el-button
          >
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="t('common.noData')" :image-size="60" />
      </template>
    </el-table>

    <FormDialog
      v-model="dialog.visible"
      :title="dialog.editingId === null ? t('dict.addItemTitle') : t('dict.editItemTitle')"
      width="480px"
      :loading="submitting"
      append-to-body
      @submit="submit"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item :label="t('dict.label')" prop="label">
          <el-input v-model.trim="form.label" maxlength="100" />
        </el-form-item>
        <el-form-item :label="t('dict.value')" prop="value">
          <el-input v-model.trim="form.value" maxlength="100" />
        </el-form-item>
        <el-form-item :label="t('dict.tagType')">
          <el-select
            v-model="form.tagType"
            clearable
            style="width: 100%"
            :placeholder="t('dict.tagTypeNone')"
          >
            <el-option v-for="tt in tagTypeOptions" :key="tt" :label="tt" :value="tt" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('common.sort')">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item :label="t('dict.isDefault')">
          <el-switch v-model="form.isDefault" />
        </el-form-item>
        <el-form-item :label="t('common.status')">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item :label="t('common.remark')">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" />
        </el-form-item>
      </el-form>
    </FormDialog>
  </el-drawer>
</template>
