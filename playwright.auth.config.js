import base from './playwright.config.js';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  ...base,
  testDir: './tests/auth',
  use: { ...base.use, baseURL: 'http://127.0.0.1:5174' },
  webServer: {
    command: 'npm run dev -- --port 5174 --strictPort',
    env: { VITE_APP_MODE: 'live', VITE_SUPABASE_URL: 'https://auth-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture', VITE_PHONE_AUTH_ENABLED: 'true' },
    url: 'http://127.0.0.1:5174/app/',
    reuseExistingServer: false,
  },
});
