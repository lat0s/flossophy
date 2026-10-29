import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { queryClient } from './app/query';
import { router } from './app/router';
import './shared/theme';
import './styles.css';

const app = createApp(App).use(createPinia()).use(VueQueryPlugin, { queryClient }).use(router);

app.mount('#app');
