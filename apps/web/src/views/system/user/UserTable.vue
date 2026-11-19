<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { formatDateTime } from '@/utils/datetime';
import type { UserTableEmits, UserTableProps } from './type';

const { t } = useI18n();
const auth = useAuthStore();

defineProps<UserTableProps>();

const emit = defineEmits<UserTableEmits>();
</script>

<template>
  <el-table v-loading="loading" :data="rows" row-key="id">
    <el-table-column
      :label="t('user.username')"
      prop="username"
      min-width="110"
      show-overflow-tooltip
    />
    <el-table-column
      :label="t('user.nickname')"
      prop="nickname"
      min-width="110"
      show-overflow-tooltip
    />
    <el-table-column :label="t('user.roles')" min-width="160">
      <template #default="{ row }">
        <el-tag
          v-for="r in row.roles"
          :key="r.id"
          size="small"
          class="tg-user__role-tag"
          disable-transitions
        >
          {{ r.name }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column :label="t('common.status')" width="90" align="center">
      <template #default="{ row }">
        <el-switch
          v-permission="'system:user:enable'"
          :model-value="row.enabled"
          :disabled="row.id === auth.user?.id"
          @change="(v: boolean | string | number) => emit('toggleEnabled', row, Boolean(v))"
        />
      </template>
    </el-table-column>
    <el-table-column :label="t('user.email')" prop="email" min-width="150" show-overflow-tooltip />
    <el-table-column :label="t('profile.lastLoginAt')" min-width="150">
      <template #default="{ row }">{{ formatDateTime(row.lastLoginAt) }}</template>
    </el-table-column>
    <el-table-column :label="t('common.createdAt')" min-width="150">
      <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
    </el-table-column>
    <el-table-column :label="t('common.actions')" width="220" fixed="right">
      <template #default="{ row }">
        <el-button
          v-permission="'system:user:update'"
          link
          type="primary"
          @click="emit('edit', row)"
          >{{ t('common.edit') }}</el-button
        >
        <el-button
          v-permission="'system:user:reset-password'"
          link
          type="warning"
          @click="emit('resetPassword', row)"
          >{{ t('user.resetPwd') }}</el-button
        >
        <el-button
          v-permission="'system:user:delete'"
          link
          type="danger"
          :disabled="row.id === auth.user?.id"
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

<style scoped>
.tg-user__role-tag {
  margin-right: 4px;
}
</style>
