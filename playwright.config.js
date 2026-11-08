import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

export default defineConfig({
  testDir: './tests/ui',
  timeout: 30000,
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    launchOptions: {
      ...(existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}),
      args: ['--no-sandbox'],
    },
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    env: { VITE_APP_MODE: 'preview' },
    url: 'http://127.0.0.1:5173/app/',
    reuseExistingServer: false,
  },
});
