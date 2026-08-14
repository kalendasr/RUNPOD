import { test, expect } from "@playwright/test";
import crypto from "node:crypto";

test.describe("public pages", () => {
  test("landing page loads cleanly", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    const failedRequests: string[] = [];
    page.on("requestfailed", (req) => {
      failedRequests.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
    });

    const response = await page.goto("/");
    expect(response?.ok()).toBe(true);
    await expect(page.locator("h1")).toBeVisible();
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });

  test("unauthenticated dashboard access redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe.serial("auth flow", () => {
  const email = `smoke-${crypto.randomUUID()}@example.com`;
  const password = "correcthorse";

  test("a visitor can register and lands on the dashboard", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(email)).toBeVisible();
  });

  test("a non-admin user cannot reach the admin page", async ({ page }) => {
    await page.goto("/dashboard/admin");
    await expect(page).not.toHaveURL(/\/dashboard\/admin/);
  });

  test("a user can log out and back in", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
