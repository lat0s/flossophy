import type { Role } from '@flossophy/shared';
import { createRouter, createWebHistory } from 'vue-router';
import { useSession } from './session';

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
      path: '/clinics',
      component: () => import('@/features/clinics/ClinicsPage.vue'),
      meta: { api: true, title: 'Find a clinic' },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/features/errors/NotFoundPage.vue'),
      meta: { title: 'Not found' },
    },
  ],
});

router.beforeEach(async (to) => {
  const session = useSession();
  if (!to.meta.api) return true;
  if (!session.loaded) await session.load();
  if (to.meta.role && session.me?.role !== to.meta.role) {
    return session.me
      ? { path: session.me.role === 'dentist' ? '/dentist' : '/visits' }
      : { path: '/login', query: { next: to.fullPath } };
  }
  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Flossophy` : 'Flossophy · Book the dentist, painlessly';
});
