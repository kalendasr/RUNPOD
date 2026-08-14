import fs from "node:fs";
import path from "node:path";
import { pageDef, type WebsiteSpec } from "./types.js";
import { projectDir } from "./paths.js";

// Chromium downloads are geo-blocked on this server (see docs/environment-strategy.md);
// Firefox is the default local browser for generated site tests.
function playwrightConfigContent(): string {
  return `import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: process.env.HERMES_BASE_URL ?? "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
});
`;
}

function pageTestBlock(spec: WebsiteSpec, kind: WebsiteSpec["pages"][number]): string {
  const def = pageDef(kind, spec.siteName);
  const url = def.slug ? `/${def.slug}` : "/";
  return `test("${def.navLabel} page loads cleanly", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  const failedRequests: string[] = [];
  page.on("requestfailed", (req) => {
    failedRequests.push(\`\${req.method()} \${req.url()}: \${req.failure()?.errorText}\`);
  });

  const response = await page.goto("${url}");
  expect(response?.ok()).toBe(true);
  await expect(page.locator("h1")).toBeVisible();
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
`;
}

function contactFormTestBlock(): string {
  return `test("contact form can be submitted", async ({ page }) => {
  await page.goto("/contact");
  await page.getByLabel("Name").fill("Jane Doe");
  await page.getByLabel("Email").fill("jane@example.com");
  await page.getByLabel("Message").fill("Hello, I would like to get in touch.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText("Thanks for reaching out");
});
`;
}

function responsiveTestBlock(): string {
  return `test.describe("responsive layout", () => {
  for (const viewport of [
    { name: "mobile", width: 375, height: 667 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1280, height: 800 },
  ]) {
    test(\`navigation is visible on \${viewport.name}\`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");
      await expect(page.getByRole("navigation")).toBeVisible();
    });
  }
});
`;
}

export function testFileContent(spec: WebsiteSpec): string {
  const blocks = [
    `import { test, expect } from "@playwright/test";`,
    "",
    ...spec.pages.map((kind) => pageTestBlock(spec, kind)),
  ];
  if (spec.pages.includes("contact")) {
    blocks.push(contactFormTestBlock());
  }
  blocks.push(responsiveTestBlock());
  return blocks.join("\n");
}

export function writePlaywrightTests(spec: WebsiteSpec): void {
  const target = projectDir(spec.projectName);
  fs.writeFileSync(path.join(target, "playwright.config.ts"), playwrightConfigContent(), "utf8");
  const testsDir = path.join(target, "tests");
  fs.mkdirSync(testsDir, { recursive: true });
  fs.writeFileSync(path.join(testsDir, "pages.spec.ts"), testFileContent(spec), "utf8");
}
