import type { Role } from '@flossophy/shared';
import { createRouter, createWebHistory } from 'vue-router';
import { useDemo } from './demo';
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
      path: '/clinics/:slug',
      component: () => import('@/features/clinics/ClinicPage.vue'),
      meta: { api: true },
      props: true,
    },
    { path: '/login', component: () => import('@/features/auth/LoginPage.vue'), meta: { api: true, title: 'Sign in' } },
    {
      path: '/register',
      component: () => import('@/features/auth/RegisterPage.vue'),
      meta: { api: true, title: 'Create account' },
    },
    {
      path: '/visits',
      component: () => import('@/features/account/VisitsPage.vue'),
      meta: { api: true, role: 'patient', title: 'My visits' },
    },
    {
      path: '/dentist',
      component: () => import('@/features/dentist/DentistPage.vue'),
      meta: { api: true, role: 'dentist', title: 'Schedule' },
    },
    {
      path: '/outbox',
      component: () => import('@/features/demo/OutboxPage.vue'),
      meta: { api: true, title: 'Outbox' },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/features/errors/NotFoundPage.vue'),
      meta: { title: 'Not found' },
    },
  ],
});

router.beforeEach(async (to) => {
  const demo = useDemo();
  const session = useSession();
  if (!to.meta.api) return true;
  if (!session.loaded) await Promise.all([session.load(), demo.personas ? null : demo.loadMeta()]);
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
