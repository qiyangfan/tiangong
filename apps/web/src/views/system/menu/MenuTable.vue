<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { MenuTree } from '@tiangong/contracts';
import MenuIcon from '@/components/MenuIcon.vue';
import { menuTypeTag, menuTypeText } from './menu';

const { t } = useI18n();

type MenuRow = MenuTree[number];

const props = defineProps<{
  tree: MenuTree;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'add-child' | 'edit' | 'delete', row: MenuRow): void;
}>();
</script>

<template>
  <el-table
    v-loading="props.loading"
    :data="props.tree"
    row-key="id"
    :tree-props="{ children: 'children' }"
    default-expand-all
  >
    <el-table-column :label="t('menu.name')" prop="name" min-width="180" show-overflow-tooltip />
    <el-table-column :label="t('menu.icon')" width="60" align="center">
      <template #default="{ row }">
        <MenuIcon :name="row.icon" />
      </template>
    </el-table-column>
    <el-table-column :label="t('menu.menuType')" width="90" align="center">
      <template #default="{ row }">
        <el-tag :type="menuTypeTag(row.menuType)" disable-transitions>{{
          menuTypeText(t, row.menuType)
        }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column :label="t('menu.path')" prop="path" min-width="140" show-overflow-tooltip />
    <el-table-column
      :label="t('menu.component')"
      prop="component"
      min-width="170"
      show-overflow-tooltip
    />
    <el-table-column :label="t('menu.perms')" prop="perms" min-width="160" show-overflow-tooltip />
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
          @click="emit('add-child', row)"
        >
          {{ t('menu.addChild') }}
        </el-button>
        <el-button
          v-permission="'system:menu:update'"
          link
          type="primary"
          @click="emit('edit', row)"
          >{{ t('common.edit') }}</el-button
        >
        <el-button
          v-permission="'system:menu:delete'"
          link
          type="danger"
          @click="emit('delete', row)"
          >{{ t('common.delete') }}</el-button
        >
      </template>
    </el-table-column>
    <template #empty>
      <el-empty :description="t('common.noData')" :image-size="60" />
    </template>
  </el-table>
</template>
