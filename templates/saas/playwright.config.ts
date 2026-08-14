import { defineConfig, devices } from "@playwright/test";

// Chromium downloads are geo-blocked on this server (see docs/environment-strategy.md);
// Firefox is the default local browser for generated app tests.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: process.env.HERMES_BASE_URL ?? "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }],
});
