<script setup lang="ts">
import { nextTick, onMounted, provide, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { MenuNodeWithMeta, MenuTree } from '@tiangong/contracts';
import { apiCreateMenu, apiDeleteMenu, apiGetMenuTree, apiUpdateMenu } from '@/api/menus';
import RightToolbar from '@/components/RightToolbar.vue';
import { confirmDelete } from '@/utils/confirm';
import MenuFormDialog from './MenuFormDialog.vue';
import MenuTable from './MenuTable.vue';
import {
  createMenuForm,
  fillMenuForm,
  fillMenuFormFromRow,
  menuFormKey,
  rootTreeSelectData,
  toMenuRequest,
  type MenuDialogState,
  type TreeSelectNode,
} from './menu';

const { t } = useI18n();

const loading = ref(false);
const tree = ref<MenuTree>([]);

async function getList(): Promise<void> {
  loading.value = true;
  try {
    tree.value = await apiGetMenuTree();
  } finally {
    loading.value = false;
  }
}

// ---- 新增/修改（树形表格 + 弹窗表单） ----
const dialog = reactive<MenuDialogState>({ visible: false, editingId: null });
const formRef = ref<{ validate: () => Promise<boolean> }>();
const submitting = ref(false);
const form = createMenuForm();
// 表单对象经 provide 下发：弹窗内字段直接读写同一对象
provide(menuFormKey, form);

const rules: FormRules = {
  name: [
    {
      required: true,
      message: () => t('common.pleaseInput', { field: t('menu.name') }),
      trigger: 'blur',
    },
  ],
  path: [
    {
      validator: (_rule, value: string, callback) => {
        if (form.menuType === 'F' || value !== '') {
          callback();
        } else {
          callback(new Error(t('common.pleaseInput', { field: t('menu.path') })));
        }
      },
      trigger: 'blur',
    },
  ],
  component: [
    {
      validator: (_rule, value: string, callback) => {
        if (form.menuType !== 'C' || value !== '') {
          callback();
        } else {
          callback(new Error(t('common.pleaseInput', { field: t('menu.component') })));
        }
      },
      trigger: 'blur',
    },
  ],
};

const treeSelectData = ref<TreeSelectNode[]>([]);

/** 上级菜单选择树需等表单渲染后再灌数据，保证树组件拿到初始化值。 */
async function fillParentOptions(): Promise<void> {
  await nextTick();
  treeSelectData.value = rootTreeSelectData(t, tree.value);
}

function openCreate(parent?: MenuNodeWithMeta): void {
  dialog.editingId = null;
  fillMenuForm(form, parent);
  dialog.visible = true;
  void fillParentOptions();
}

function openEdit(row: MenuNodeWithMeta): void {
  dialog.editingId = row.id;
  fillMenuFormFromRow(form, row);
  dialog.visible = true;
  void fillParentOptions();
}

/** 按编辑态走新建或更新：失败直接抛给调用方，成功返回后由调用方收尾。 */
async function persistMenu(): Promise<void> {
  const payload = toMenuRequest(form);
  if (dialog.editingId === null) {
    await apiCreateMenu(payload);
    return;
  }
  await apiUpdateMenu(dialog.editingId, payload);
}

async function submit(): Promise<void> {
  if (!(await formRef.value?.validate())) {
    return;
  }
  await persistMenu();
  dialog.visible = false;
  ElMessage.success(t('common.opSuccess'));
  await getList();
}

async function onDelete(row: MenuNodeWithMeta): Promise<void> {
  if (!(await confirmDelete().catch(() => false))) {
    return;
  }
  await apiDeleteMenu(row.id);
  ElMessage.success(t('common.opSuccess'));
  await getList();
}

onMounted(() => {
  void getList();
});
</script>

<template>
  <div class="tg-page">
    <el-card shadow="never" class="tg-table-card">
      <div class="tg-toolbar">
        <div class="tg-toolbar__actions">
          <el-button
            v-permission="'system:menu:create'"
            type="primary"
            :icon="Plus"
            @click="openCreate()"
          >
            {{ t('common.add') }}
          </el-button>
        </div>
        <RightToolbar @refresh="getList" />
      </div>

      <MenuTable
        :tree="tree"
        :loading="loading"
        @add-child="openCreate"
        @edit="openEdit"
        @delete="onDelete"
      />
    </el-card>

    <!-- 字段区拆为组件以控制单文件规模；ref 暴露 validate，提交前由本页调用 -->
    <MenuFormDialog
      ref="formRef"
      v-model:visible="dialog.visible"
      :dialog="dialog"
      :rules="rules"
      :tree-select-data="treeSelectData"
      :loading="submitting"
      @submit="submit"
    />
  </div>
</template>
