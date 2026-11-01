import { defineConfig, devices } from '@playwright/test';

// Own ports and database, so a running dev server is left alone.
const WEB = 'http://localhost:5180';
const API = 'http://localhost:3100';

export default defineConfig({
  testDir: 'e2e',
  // One worker: every test signs in as the same demo patient.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: WEB, trace: 'retain-on-failure', timezoneId: 'Europe/Stockholm', locale: 'en-GB' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'node scripts/seed.ts && node src/main.ts',
      cwd: '../api',
      url: `${API}/api/health`,
      env: { PORT: '3100', MONGODB_DB: 'flossophy_e2e', APP_ORIGIN: WEB, DEMO_PERSONAS: 'true' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm exec vite',
      url: WEB,
      env: { PORT: '5180', API_URL: API, GATE_URL: 'none' },
      reuseExistingServer: false,
    },
  ],
});
