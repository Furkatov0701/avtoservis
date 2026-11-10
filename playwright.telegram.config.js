import base from './playwright.config.js';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  ...base, testDir: './tests/telegram',
  use: { ...base.use, baseURL: 'http://127.0.0.1:5175' },
  webServer: {
    command: 'npm run dev:telegram -- --port 5175 --strictPort',
    env: {
      VITE_APP_MODE: 'telegram',
      VITE_TELEGRAM_BOT_USERNAME: 'AvtoTestBot',
      // The route is intercepted by the test; this only enables the public Edge endpoint.
      VITE_SUPABASE_URL: 'https://lewojwhdkbarktjhyrbi.supabase.co',
    },
    url: 'http://127.0.0.1:5175/app/', reuseExistingServer: false,
  },
});
