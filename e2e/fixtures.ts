/**
 * Playwright test fixtures
 * Provides authenticated page context and helper utilities
 */

import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Extend test context with authenticated user
type TestFixtures = {
  authenticatedPage: Page;
  axe: AxeBuilder;
};

/**
 * Sign up a new test user
 */
async function signUp(page: Page, email: string, password: string, name: string) {
  await page.goto('/sign-up');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="name"]', name);
  await page.click('button[type="submit"]');
  
  // Wait for redirect to events list
  await page.waitForURL('/events', { timeout: 10000 });
}

/**
 * Sign in an existing user
 */
async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for redirect to events list
  await page.waitForURL('/events', { timeout: 10000 });
}

/**
 * Wait for element to be visible with timeout
 */
async function waitForVisible(page: Page, selector: string, timeout: number = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Wait for text to appear
 */
async function waitForText(page: Page, text: string, timeout: number = 5000) {
  await page.waitForSelector(`text=${text}`, { timeout });
}

/**
 * Check accessibility with axe-core
 */
async function checkAccessibility(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  
  return results.violations;
}

// Extend Playwright test with custom fixtures
export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Create unique test user for this test
    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;
    const password = `TestPass123!`;
    const name = `Test User ${timestamp}`;
    
    await signUp(page, email, password, name);
    
    // Provide authenticated page to test
    await use(page);
    
    // Cleanup: delete account after test
    try {
      await page.goto('/account');
      await page.click('button:has-text("Delete account")');
      await page.fill('input[placeholder="DELETE"]', 'DELETE');
      await page.click('button:has-text("Delete my account")');
    } catch (e) {
      // Ignore cleanup errors
    }
  },
  
  axe: async ({ page }, use) => {
    const axe = new AxeBuilder({ page });
    await use(axe);
  },
});

export { expect, signUp, signIn, waitForVisible, waitForText, checkAccessibility };
