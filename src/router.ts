import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          redirect: '/home',
        },
        {
          path: 'home',
          component: () => import('@/views/HomePage.vue'),
          name: 'home',
        },
        {
          path: 'notes',
          component: () => import('@/views/NotesView.vue'),
          name: 'notes',
        },
        {
          path: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          name: 'settings',
        },
      ],
    },
    {
      path: '/master-password',
      component: () => import('@/views/MasterPasswordView.vue'),
      name: 'master-password',
    },
  ],
})

export default router
