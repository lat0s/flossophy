import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: Number(process.env.PORT ?? 5173),
    strictPort: true,
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:3000',
      // GATE_URL=none runs the app without the demo gate.
      ...(process.env.GATE_URL !== 'none' && { '/gate': process.env.GATE_URL ?? 'http://localhost:8090' }),
    },
  },
  build: { target: 'es2022', sourcemap: process.env.SOURCEMAPS ? 'hidden' : false, chunkSizeWarningLimit: 400 },
  test: { environment: 'happy-dom', include: ['test/**/*.test.ts'] },
});
