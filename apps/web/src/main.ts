import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { useDemo } from './app/demo';
import { queryClient } from './app/query';
import { router } from './app/router';
import { useSession } from './app/session';
import { onApiFailure } from './shared/api/client';
import { initTelemetry } from './shared/telemetry';
import './shared/theme';
import './styles.css';

const app = createApp(App).use(createPinia()).use(VueQueryPlugin, { queryClient }).use(router);

onApiFailure((e) => {
  // The demo cookie expired (1 h) or the sandbox was reaped: go back through the gate.
  if (e.code === 'demo_required') {
    useDemo().closed();
    useSession().clear();
    if (router.currentRoute.value.path !== '/demo')
      router.push({ path: '/demo', query: { next: router.currentRoute.value.fullPath } });
  }
});

app.mount('#app');
initTelemetry();
