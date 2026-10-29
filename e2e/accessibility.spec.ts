/**
 * Comprehensive Accessibility Test Suite
 * Spec: spec.md §12.2.15 - axe on every top-level page
 * Release gate SC-06: Lighthouse accessibility ≥ 95; axe zero serious or critical
 */

import { test, expect, checkAccessibility } from './fixtures';

test.describe('Accessibility Compliance', () => {
  test('landing page passes WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/');
    const violations = await checkAccessibility(page);
    
    expect(violations).toHaveLength(0);
  });

  test('sign-in page passes WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/sign-in');
    const violations = await checkAccessibility(page);
    
    expect(violations).toHaveLength(0);
  });

  test('sign-up page passes WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/sign-up');
    const violations = await checkAccessibility(page);
    
    expect(violations).toHaveLength(0);
  });

  test('account page passes WCAG 2.1 AA', async ({ authenticatedPage: page }) => {
    await page.goto('/account');
    const violations = await checkAccessibility(page);
    
    expect(violations).toHaveLength(0);
  });

  test('events list page passes WCAG 2.1 AA', async ({ authenticatedPage: page }) => {
    await page.goto('/events');
    const violations = await checkAccessibility(page);
    
    expect(violations).toHaveLength(0);
  });

  test('create event form passes WCAG 2.1 AA', async ({ authenticatedPage: page }) => {
    await page.goto('/events/new');
    const violations = await checkAccessibility(page);
    
    expect(violations).toHaveLength(0);
  });

  test('event overview page passes WCAG 2.1 AA', async ({ authenticatedPage: page }) => {
    // Create event first
    await page.goto('/events/new');
    await page.selectOption('select[name="type"]', 'wedding');
    await page.fill('input[name="title"]', 'A11y Overview Test');
    
    const eventDate = new Date();
    eventDate.setMonth(eventDate.getMonth() + 3);
    await page.fill('input[name="eventDate"]', eventDate.toISOString().split('T')[0]!);
    
    await page.fill('input[name="city"]', 'Boston');
    await page.fill('input[name="guestCount"]', '100');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '30000');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+/);
    await page.waitForTimeout(5000);
    
    const violations = await checkAccessibility(page);
    expect(violations).toHaveLength(0);
  });

  test('budget page passes WCAG 2.1 AA', async ({ authenticatedPage: page }) => {
    // Create event first
    await page.goto('/events/new');
    await page.selectOption('select[name="type"]', 'birthday');
    await page.fill('input[name="title"]', 'A11y Budget Test');
    
    const eventDate = new Date();
    eventDate.setMonth(eventDate.getMonth() + 2);
    await page.fill('input[name="eventDate"]', eventDate.toISOString().split('T')[0]!);
    
    await page.fill('input[name="city"]', 'Miami');
    await page.fill('input[name="guestCount"]', '50');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '10000');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+/);
    await page.waitForTimeout(5000);
    
    await page.click('a[href*="/budget"]');
    await page.waitForTimeout(1000);
    
    const violations = await checkAccessibility(page);
    expect(violations).toHaveLength(0);
  });

  test('timeline page passes WCAG 2.1 AA', async ({ authenticatedPage: page }) => {
    // Create event
    await page.goto('/events/new');
    await page.selectOption('select[name="type"]', 'community');
    await page.fill('input[name="title"]', 'A11y Timeline Test');
    
    const eventDate = new Date();
    eventDate.setMonth(eventDate.getMonth() + 4);
    await page.fill('input[name="eventDate"]', eventDate.toISOString().split('T')[0]!);
    
    await page.fill('input[name="city"]', 'Chicago');
    await page.fill('input[name="guestCount"]', '200');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '15000');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+/);
    await page.waitForTimeout(5000);
    
    await page.click('a[href*="/timeline"]');
    await page.waitForTimeout(1000);
    
    const violations = await checkAccessibility(page);
    expect(violations).toHaveLength(0);
  });

  test('vendors page passes WCAG 2.1 AA', async ({ authenticatedPage: page }) => {
    // Create event
    await page.goto('/events/new');
    await page.selectOption('select[name="type"]', 'wedding');
    await page.fill('input[name="title"]', 'A11y Vendors Test');
    
    const eventDate = new Date();
    eventDate.setMonth(eventDate.getMonth() + 6);
    await page.fill('input[name="eventDate"]', eventDate.toISOString().split('T')[0]!);
    
    await page.fill('input[name="city"]', 'Phoenix');
    await page.fill('input[name="guestCount"]', '80');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '20000');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+/);
    await page.waitForTimeout(5000);
    
    await page.click('a[href*="/vendors"]');
    await page.waitForTimeout(1000);
    
    const violations = await checkAccessibility(page);
    expect(violations).toHaveLength(0);
  });

  test('ideas page passes WCAG 2.1 AA', async ({ authenticatedPage: page }) => {
    // Create event
    await page.goto('/events/new');
    await page.selectOption('select[name="type"]', 'birthday');
    await page.fill('input[name="title"]', 'A11y Ideas Test');
    
    const eventDate = new Date();
    eventDate.setMonth(eventDate.getMonth() + 1);
    await page.fill('input[name="eventDate"]', eventDate.toISOString().split('T')[0]!);
    
    await page.fill('input[name="city"]', 'Las Vegas');
    await page.fill('input[name="guestCount"]', '30');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '5000');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+/);
    await page.waitForTimeout(5000);
    
    await page.click('a[href*="/ideas"]');
    await page.waitForTimeout(1000);
    
    const violations = await checkAccessibility(page);
    expect(violations).toHaveLength(0);
  });

  test('assistant page passes WCAG 2.1 AA', async ({ authenticatedPage: page }) => {
    // Create event
    await page.goto('/events/new');
    await page.selectOption('select[name="type"]', 'community');
    await page.fill('input[name="title"]', 'A11y Assistant Test');
    
    const eventDate = new Date();
    eventDate.setMonth(eventDate.getMonth() + 2);
    await page.fill('input[name="eventDate"]', eventDate.toISOString().split('T')[0]!);
    
    await page.fill('input[name="city"]', 'San Diego');
    await page.fill('input[name="guestCount"]', '150');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '12000');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+/);
    await page.waitForTimeout(5000);
    
    await page.click('a[href*="/assistant"]');
    await page.waitForTimeout(1000);
    
    const violations = await checkAccessibility(page);
    expect(violations).toHaveLength(0);
  });

  test('settings page passes WCAG 2.1 AA', async ({ authenticatedPage: page }) => {
    // Create event
    await page.goto('/events/new');
    await page.selectOption('select[name="type"]', 'wedding');
    await page.fill('input[name="title"]', 'A11y Settings Test');
    
    const eventDate = new Date();
    eventDate.setMonth(eventDate.getMonth() + 5);
    await page.fill('input[name="eventDate"]', eventDate.toISOString().split('T')[0]!);
    
    await page.fill('input[name="city"]', 'Dallas');
    await page.fill('input[name="guestCount"]', '175');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '45000');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+/);
    await page.waitForTimeout(5000);
    
    await page.click('a[href*="/settings"]');
    await page.waitForTimeout(1000);
    
    const violations = await checkAccessibility(page);
    expect(violations).toHaveLength(0);
  });

  test('skip link is functional', async ({ page }) => {
    await page.goto('/');
    
    // Tab to skip link
    await page.keyboard.press('Tab');
    
    // Should focus skip link
    const skipLink = page.locator('a:has-text("Skip to main")');
    await expect(skipLink).toBeFocused();
    
    // Press Enter
    await page.keyboard.press('Enter');
    
    // Should focus main content
    const main = page.locator('main');
    await expect(main).toBeFocused();
  });

  test('all interactive elements are keyboard accessible', async ({ authenticatedPage: page }) => {
    await page.goto('/events');
    
    // Tab through page
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // Logo/Home
    await page.keyboard.press('Tab'); // Account menu
    
    // Should be able to reach Create event button
    await page.keyboard.press('Tab');
    
    const focused = await page.evaluate(() => document.activeElement?.textContent);
    expect(focused).toContain('Create');
  });

  test('form errors are announced to screen readers', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Submit without filling
    await page.click('button[type="submit"]');
    
    // Error should have role="alert" or aria-live
    const errorMessage = page.locator('[role="alert"], [aria-live="polite"]').first();
    await expect(errorMessage).toBeVisible();
  });

  test('color contrast meets WCAG AA standards', async ({ authenticatedPage: page }) => {
    await page.goto('/events');
    
    // Run axe with contrast checks
    const violations = await checkAccessibility(page);
    
    // Filter for contrast violations
    const contrastViolations = violations.filter(v => v.id === 'color-contrast');
    expect(contrastViolations).toHaveLength(0);
  });
});

/**
 * Accessibility Test Coverage:
 * 
 * ✅ All 12 top-level pages tested with axe-core
 * ✅ WCAG 2.1 Level A and AA compliance
 * ✅ Skip link functionality
 * ✅ Keyboard navigation
 * ✅ Screen reader announcements
 * ✅ Color contrast
 * ✅ Focus management
 * ✅ ARIA attributes
 * 
 * Release Gate SC-06:
 * - Lighthouse accessibility ≥ 95
 * - axe zero serious or critical violations
 */
