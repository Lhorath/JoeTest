import { test, expect } from "@playwright/test";

test.describe("TheQueue App Shell Smoke Tests", () => {
  test("should load the standard public website application shell successfully", async ({
    page,
  }) => {
    // Navigate to the public website
    await page.goto("http://localhost:3000/");

    // Check that standard application shell titles exist
    await expect(page).toHaveTitle(/TheQueue - Music Submissions/i);
    await expect(page.locator("text=TheQueue")).toBeVisible();
    await expect(page.locator("text=Reusable Music Library")).toBeVisible();
  });

  test("should load the stream host studio application shell successfully", async ({
    page,
  }) => {
    // Navigate to the host control center
    await page.goto("http://localhost:3001/");

    // Check that host control center elements are rendered correctly
    await expect(page).toHaveTitle(/Host Control Center - TheQueue/i);
    await expect(page.locator("text=TheQueue Host Studio")).toBeVisible();
    await expect(page.locator("text=Browser-based DJ Panel")).toBeVisible();
  });

  test("should load the system administration application shell successfully", async ({
    page,
  }) => {
    // Navigate to the system admin hq
    await page.goto("http://localhost:3002/");

    // Check that administration dashboard elements are rendered correctly
    await expect(page).toHaveTitle(/TheQueue Administrator Headquarters/i);
    await expect(page.locator("text=TheQueue Admin HQ")).toBeVisible();
    await expect(page.locator("text=Financial Ledger")).toBeVisible();
  });
});
