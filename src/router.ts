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
          redirect: '/overview',
        },
        {
          path: 'overview',
          component: () => import('@/views/OverviewView.vue'),
          name: 'overview',
        },
        {
          path: 'list',
          component: () => import('@/views/ListView.vue'),
          name: 'list',
        },
        {
          path: 'calendar',
          component: () => import('@/views/CalendarView.vue'),
          name: 'calendar',
        },
        {
          path: 'habits',
          component: () => import('@/views/HabitTrackerView.vue'),
          name: 'habits',
        },
        {
          path: 'mood',
          component: () => import('@/views/MoodTrackerView.vue'),
          name: 'mood',
        },
        {
          path: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          name: 'settings',
        },
        {
          path: 'about',
          component: () => import('@/views/AboutView.vue'),
          name: 'about',
        },
      ],
    },
  ],
})

export default router
