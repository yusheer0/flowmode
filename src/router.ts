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
          component: () => import('@/views/NotesView.vue'),
          name: 'home',
        },
        {
          path: 'notes',
          component: () => import('@/views/NotesView.vue'),
          name: 'notes',
        },
      ],
    },
    { path: '/home', redirect: '/' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
