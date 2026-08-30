import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.js',
  fullyParallel: false,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:4401', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4401', url: 'http://127.0.0.1:4401', reuseExistingServer: false, timeout: 120_000 },
});
