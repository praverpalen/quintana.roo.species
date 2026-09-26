import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4173', ...devices['iPhone 13'], browserName: 'chromium', viewport: { width: 390, height: 844 }, serviceWorkers: 'block', launchOptions: { executablePath: process.env.PW_CHROMIUM || undefined } },
  webServer: { command: 'npm run build && npx vite preview --port 4173', port: 4173, reuseExistingServer: true, timeout: 120000 },
});
