import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './apps/frontend/e2e', fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:5183', viewport: { width: 1440, height: 1100 }, trace: 'retain-on-failure' },
  webServer: { command: 'npm --workspace=frontend run dev -- --host 127.0.0.1 --port 5183 --strictPort', url: 'http://127.0.0.1:5183', reuseExistingServer: false },
})
