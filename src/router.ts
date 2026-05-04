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
          redirect: '/notes',
        },
        {
          path: 'notes',
          component: () => import('@/views/NotesView.vue'),
          name: 'notes',
        },
        {
          path: 'vault',
          component: () => import('@/views/VaultView.vue'),
          name: 'vault',
        },
        {
          path: 'habits',
          component: () => import('@/views/HabitsView.vue'),
          name: 'habits',
        },
      ],
    },
    { path: '/home', redirect: '/notes' },
    { path: '/:pathMatch(.*)*', redirect: '/notes' },
  ],
})

export default router
