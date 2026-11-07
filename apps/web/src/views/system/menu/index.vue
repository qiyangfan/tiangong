<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { CreateMenuRequest, MenuNode, MenuNodeWithMeta, MenuTree } from '@tiangong/contracts';
import { apiCreateMenu, apiDeleteMenu, apiGetMenuTree, apiUpdateMenu } from '@/api/menus';
import RightToolbar from '@/components/RightToolbar.vue';
import MenuIcon from '@/components/MenuIcon.vue';

const { t } = useI18n();

const loading = ref(false);
const tree = ref<MenuTree>([]);

interface TreeSelectNode {
  id: number;
  name: string;
  children: TreeSelectNode[];
}

async function getList(): Promise<void> {
  loading.value = true;
  try {
    tree.value = await apiGetMenuTree();
  } finally {
    loading.value = false;
  }
}

// ---- 新增/修改（树形表格 + 弹窗表单） ----
const dialog = reactive({ visible: false, editingId: null as number | null });
const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive({
  parentId: 0,
  name: '',
  menuType: 'M' as CreateMenuRequest['menuType'],
  path: '',
  component: '',
  perms: '',
  icon: '',
  sort: 0,
  visible: true,
  enabled: true,
  remark: '',
});

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

function buildTreeSelectData(nodes: MenuNode[]): TreeSelectNode[] {
  return nodes.map((n) => ({
    id: n.id,
    name: `${n.name}（${typeText(n.menuType)}）`,
    children: buildTreeSelectData(n.children),
  }));
}

function typeText(type: MenuNodeWithMeta['menuType']): string {
  if (type === 'M') {
    return t('menu.typeDir');
  }
  return type === 'C' ? t('menu.typeMenu') : t('menu.typeButton');
}

function typeTagType(type: MenuNodeWithMeta['menuType']): 'primary' | 'success' | 'warning' {
  if (type === 'M') {
    return 'primary';
  }
  return type === 'C' ? 'success' : 'warning';
}

function resetForm(): void {
  Object.assign(form, {
    parentId: 0,
    name: '',
    menuType: 'M',
    path: '',
    component: '',
    perms: '',
    icon: '',
    sort: 0,
    visible: true,
    enabled: true,
    remark: '',
  });
}

function openCreate(parent?: MenuNodeWithMeta): void {
  dialog.editingId = null;
  resetForm();
  if (parent) {
    form.parentId = parent.id;
    if (parent.menuType === 'M') {
      form.menuType = 'C';
    } else if (parent.menuType === 'C') {
      form.menuType = 'F';
    }
  }
  dialog.visible = true;
  void nextTick(() => {
    treeSelectData.value = [
      { id: 0, name: t('menu.rootMenu'), children: buildTreeSelectData(tree.value) },
    ];
  });
}

function openEdit(row: MenuNodeWithMeta): void {
  dialog.editingId = row.id;
  Object.assign(form, {
    parentId: row.parentId,
    name: row.name,
    menuType: row.menuType,
    path: row.path ?? '',
    component: row.component ?? '',
    perms: row.perms ?? '',
    icon: row.icon ?? '',
    sort: row.sort,
    visible: row.visible,
    enabled: row.enabled,
    remark: row.remark ?? '',
  });
  dialog.visible = true;
  void nextTick(() => {
    treeSelectData.value = [
      { id: 0, name: t('menu.rootMenu'), children: buildTreeSelectData(tree.value) },
    ];
  });
}

async function submit(): Promise<void> {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) {
    return;
  }
  submitting.value = true;
  try {
    const payload: CreateMenuRequest = {
      parentId: form.parentId,
      name: form.name,
      menuType: form.menuType,
      sort: form.sort,
      visible: form.visible,
      enabled: form.enabled,
    };
    if (form.path !== '') {
      payload.path = form.path;
    }
    if (form.component !== '' && form.menuType !== 'F') {
      payload.component = form.component;
    }
    if (form.perms !== '' && form.menuType !== 'M') {
      payload.perms = form.perms;
    }
    if (form.icon !== '' && form.menuType !== 'F') {
      payload.icon = form.icon;
    }
    if (form.remark !== '') {
      payload.remark = form.remark;
    }
    if (dialog.editingId === null) {
      await apiCreateMenu(payload);
    } else {
      await apiUpdateMenu(dialog.editingId, payload);
    }
    dialog.visible = false;
    ElMessage.success(t('common.opSuccess'));
    await getList();
  } finally {
    submitting.value = false;
  }
}

async function onDelete(row: MenuNodeWithMeta): Promise<void> {
  try {
    await ElMessageBox.confirm(t('common.confirmDelete'), t('common.tip'), {
      type: 'warning',
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
    });
  } catch {
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

      <el-table
        v-loading="loading"
        :data="tree"
        row-key="id"
        :tree-props="{ children: 'children' }"
        default-expand-all
      >
        <el-table-column
          :label="t('menu.name')"
          prop="name"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column :label="t('menu.icon')" width="60" align="center">
          <template #default="{ row }">
            <MenuIcon :name="row.icon" />
          </template>
        </el-table-column>
        <el-table-column :label="t('menu.menuType')" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.menuType)" disable-transitions>{{
              typeText(row.menuType)
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          :label="t('menu.path')"
          prop="path"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column
          :label="t('menu.component')"
          prop="component"
          min-width="170"
          show-overflow-tooltip
        />
        <el-table-column
          :label="t('menu.perms')"
          prop="perms"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column :label="t('menu.visible')" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="row.menuType !== 'F'"
              :type="row.visible ? 'success' : 'info'"
              disable-transitions
            >
              {{ row.visible ? t('common.yes') : t('common.no') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.sort')" prop="sort" width="80" align="center" />
        <el-table-column :label="t('common.status')" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" disable-transitions>
              {{ row.enabled ? t('common.enabled') : t('common.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.menuType !== 'F'"
              v-permission="'system:menu:create'"
              link
              type="primary"
              @click="openCreate(row)"
            >
              {{ t('menu.addChild') }}
            </el-button>
            <el-button
              v-permission="'system:menu:update'"
              link
              type="primary"
              @click="openEdit(row)"
              >{{ t('common.edit') }}</el-button
            >
            <el-button
              v-permission="'system:menu:delete'"
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
    </el-card>

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.editingId === null ? t('common.add') : t('common.edit')"
      width="560px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item :label="t('menu.parentMenu')">
          <el-tree-select
            v-model="form.parentId"
            :data="treeSelectData"
            :props="{ value: 'id', label: 'name', children: 'children' }"
            value-key="id"
            node-key="id"
            check-strictly
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item :label="t('menu.menuType')">
          <el-radio-group v-model="form.menuType" :disabled="dialog.editingId !== null">
            <el-radio-button value="M">{{ t('menu.typeDir') }}</el-radio-button>
            <el-radio-button value="C">{{ t('menu.typeMenu') }}</el-radio-button>
            <el-radio-button value="F">{{ t('menu.typeButton') }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="t('menu.name')" prop="name">
          <el-input v-model.trim="form.name" maxlength="50" />
        </el-form-item>
        <el-form-item v-if="form.menuType !== 'F'" :label="t('menu.path')" prop="path">
          <el-input v-model.trim="form.path" maxlength="200" placeholder="/system 或 user" />
        </el-form-item>
        <el-form-item v-if="form.menuType === 'C'" :label="t('menu.component')" prop="component">
          <el-input
            v-model.trim="form.component"
            maxlength="255"
            :placeholder="t('menu.componentTip')"
          />
        </el-form-item>
        <el-form-item v-if="form.menuType !== 'M'" :label="t('menu.perms')">
          <el-input v-model.trim="form.perms" maxlength="100" :placeholder="t('menu.permsTip')" />
        </el-form-item>
        <el-form-item v-if="form.menuType !== 'F'" :label="t('menu.icon')">
          <el-input v-model.trim="form.icon" maxlength="100" placeholder="setting / log / tool" />
        </el-form-item>
        <el-form-item :label="t('common.sort')">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item v-if="form.menuType === 'C'" :label="t('menu.visible')">
          <el-switch v-model="form.visible" />
        </el-form-item>
        <el-form-item :label="t('common.status')">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item :label="t('common.remark')">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">{{
          t('common.submit')
        }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>
