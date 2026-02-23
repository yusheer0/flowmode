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
          redirect: '/diary',
        },
        {
          path: 'diary',
          component: () => import('@/views/DiaryView.vue'),
          name: 'diary',
        },
        {
          path: 'calendar',
          component: () => import('@/views/CalendarView.vue'),
          name: 'calendar',
        },
        {
          path: 'statistics',
          component: () => import('@/views/StatisticsView.vue'),
          name: 'statistics',
        },
        {
          path: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          name: 'settings',
        },
      ],
    },
  ],
})

export default router
