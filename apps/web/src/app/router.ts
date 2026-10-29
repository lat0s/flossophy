import type { Role } from '@flossophy/shared';
import { createRouter, createWebHistory } from 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /** Page talks to the API, so the demo must be open first. */
    api?: boolean;
    role?: Role;
    title?: string;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to, _from, saved) => saved ?? (to.hash ? { el: to.hash } : { top: 0 }),
  routes: [
    { path: '/', component: () => import('@/features/home/HomePage.vue') },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/features/errors/NotFoundPage.vue'),
      meta: { title: 'Not found' },
    },
  ],
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Flossophy` : 'Flossophy · Book the dentist, painlessly';
});
