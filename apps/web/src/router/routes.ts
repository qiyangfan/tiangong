import type { RouteRecordRaw } from 'vue-router';
import MainLayout from '@/layouts/MainLayout.vue';

/** 静态路由：登录页、404、主布局壳（个人中心）。业务菜单全部来自后端。 */
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: 'login.title', public: true },
  },
  {
    path: '/404',
    name: 'not-found',
    component: () => import('@/views/error/404.vue'),
    meta: { title: 'error.notFoundTitle', public: true },
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: 'profile.title' },
      },
    ],
  },
];
