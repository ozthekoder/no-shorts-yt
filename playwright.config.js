import { defineConfig, devices } from '@playwright/test';

// Firefox only: Zen is Gecko-based, so this is the engine the extension ships to.
export default defineConfig({
  testDir: 'test',
  // Styles apply as soon as addStyleTag resolves; long retries only slow down failures.
  expect: { timeout: 1000 },
  projects: [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }],
});
