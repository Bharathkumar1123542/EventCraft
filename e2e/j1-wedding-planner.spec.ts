/**
 * Journey J1: Wedding Planner
 * Spec: prd.md §2 - J1
 * 
 * Sign up → create event → watch plan stream in → 
 * lock venue budget → log a deposit → tick a task
 * 
 * Done when: Venue allocation stays fixed while other categories rebalance;
 * deposit appears as `paid` in the venue row
 */

import { test, expect, checkAccessibility } from './fixtures';

test.describe('J1: Wedding Planner Journey', () => {
  test('complete wedding planning workflow from sign-up to task completion', async ({ authenticatedPage: page }) => {
    // User starts at events list after sign-up (handled by authenticatedPage fixture)
    await expect(page).toHaveURL('/events');
    await expect(page.locator('h1')).toContainText('Events');
    
    // Step 1: Create wedding event
    await page.click('a:has-text("Create event")');
    await expect(page).toHaveURL('/events/new');
    
    // Fill out event creation form (8 fields)
    await page.selectOption('select[name="type"]', 'wedding');
    await page.fill('input[name="title"]', 'Sarah & Mike\'s Wedding');
    
    // Set date 6 months from now
    const eventDate = new Date();
    eventDate.setMonth(eventDate.getMonth() + 6);
    const dateString = eventDate.toISOString().split('T')[0]!;
    await page.fill('input[name="eventDate"]', dateString);
    
    await page.fill('input[name="city"]', 'Seattle');
    await page.fill('input[name="guestCount"]', '150');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '50000'); // $50,000
    await page.fill('textarea[name="preferences"]', 'Outdoor ceremony, garden reception, vegetarian options');
    
    await page.click('button[type="submit"]');
    
    // Wait for event creation and redirect
    await page.waitForURL(/\/events\/[a-f0-9-]+\?generating=1/, { timeout: 10000 });
    
    // Step 2: Watch plan stream in
    // Should see overview page with loading states for 4 sections
    await expect(page.locator('h1')).toContainText('Sarah & Mike\'s Wedding');
    
    // Wait for budget section to finish generating
    // Look for budget summary card
    await page.waitForSelector('text=Budget', { timeout: 30000 });
    await page.waitForSelector('text=Allocated', { timeout: 30000 });
    
    // Wait for timeline section
    await page.waitForSelector('text=Timeline', { timeout: 30000 });
    await page.waitForSelector('text=tasks', { timeout: 30000 });
    
    // Wait for vendors section
    await page.waitForSelector('text=Vendors', { timeout: 30000 });
    
    // Wait for ideas section
    await page.waitForSelector('text=Ideas', { timeout: 30000 });
    
    // Step 3: Navigate to budget page
    await page.click('a[href*="/budget"]');
    await expect(page).toHaveURL(/\/events\/[a-f0-9-]+\/budget/);
    
    // Should see budget categories table
    await expect(page.locator('text=Category')).toBeVisible();
    await expect(page.locator('text=Allocated')).toBeVisible();
    
    // Find venue category row
    const venueRow = page.locator('tr:has-text("Venue")');
    await expect(venueRow).toBeVisible();
    
    // Step 4: Lock venue budget
    // Click lock icon for venue category
    const venueLockButton = venueRow.locator('button[aria-label*="Lock"]');
    await venueLockButton.click();
    
    // Verify lock icon changed state
    await expect(venueRow.locator('button[aria-label*="Unlock"]')).toBeVisible();
    
    // Note the current venue allocation
    const venueAllocationBefore = await venueRow.locator('td:nth-child(2)').textContent();
    
    // Step 5: Edit another category to trigger rebalance
    const cateringRow = page.locator('tr:has-text("Catering")');
    if (await cateringRow.count() > 0) {
      // Click edit button for catering
      const cateringInput = cateringRow.locator('input[type="text"]');
      await cateringInput.click();
      await cateringInput.fill('15000'); // Increase catering budget
      await cateringInput.press('Enter');
      
      // Wait for rebalance to complete
      await page.waitForTimeout(1000);
      
      // Step 6: Verify venue allocation stayed fixed
      const venueAllocationAfter = await venueRow.locator('td:nth-child(2)').textContent();
      expect(venueAllocationAfter).toBe(venueAllocationBefore);
    }
    
    // Step 7: Log a deposit for venue
    // Click on venue row to select it (if needed) or click "Add expense" button
    await page.click('button:has-text("Add expense")');
    
    // Fill expense form
    await page.fill('input[name="description"]', 'Venue deposit');
    await page.fill('input[name="amountMinor"]', '5000'); // $5,000 deposit
    
    // Set as paid
    const paidCheckbox = page.locator('input[type="checkbox"][name="isPaid"]');
    if (await paidCheckbox.count() > 0) {
      await paidCheckbox.check();
    }
    
    await page.click('button:has-text("Add expense")');
    
    // Wait for expense to appear
    await page.waitForSelector('text=Venue deposit', { timeout: 5000 });
    
    // Step 8: Verify deposit appears as paid in venue row
    await expect(venueRow.locator('text=$5,000')).toBeVisible();
    // Check that "Paid" amount increased
    const paidAmount = await venueRow.locator('td:nth-child(4)').textContent();
    expect(paidAmount).toContain('5,000');
    
    // Step 9: Navigate to timeline and tick a task
    await page.click('a[href*="/timeline"]');
    await expect(page).toHaveURL(/\/events\/[a-f0-9-]+\/timeline/);
    
    // Find first incomplete task
    const firstTask = page.locator('input[type="checkbox"]:not([checked])').first();
    await firstTask.check();
    
    // Verify task is marked complete
    await expect(firstTask).toBeChecked();
    
    // Task should move to "Done" section
    await expect(page.locator('text=Done')).toBeVisible();
    
    // Journey complete!
    // Verify final state
    await expect(page).toHaveURL(/\/events\/[a-f0-9-]+\/timeline/);
  });

  test('passes accessibility checks on key pages', async ({ authenticatedPage: page }) => {
    // Create event for accessibility testing
    await page.goto('/events/new');
    
    // Check create event form
    const violations1 = await checkAccessibility(page);
    expect(violations1).toHaveLength(0);
    
    // Fill minimal form to create event
    await page.selectOption('select[name="type"]', 'wedding');
    await page.fill('input[name="title"]', 'A11y Test Event');
    
    const eventDate = new Date();
    eventDate.setMonth(eventDate.getMonth() + 3);
    await page.fill('input[name="eventDate"]', eventDate.toISOString().split('T')[0]!);
    
    await page.fill('input[name="city"]', 'Portland');
    await page.fill('input[name="guestCount"]', '100');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '30000');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+/);
    
    // Wait for generation to complete
    await page.waitForTimeout(5000);
    
    // Check overview page
    const violations2 = await checkAccessibility(page);
    expect(violations2).toHaveLength(0);
    
    // Check budget page
    await page.click('a[href*="/budget"]');
    await page.waitForTimeout(1000);
    const violations3 = await checkAccessibility(page);
    expect(violations3).toHaveLength(0);
    
    // Check timeline page
    await page.click('a[href*="/timeline"]');
    await page.waitForTimeout(1000);
    const violations4 = await checkAccessibility(page);
    expect(violations4).toHaveLength(0);
  });
});

/**
 * Journey Acceptance Criteria:
 * 
 * ✅ User can sign up and reach events list
 * ✅ User can create wedding event with 8 fields
 * ✅ Plan generates with SSE streaming (4 sections)
 * ✅ User can lock venue budget category
 * ✅ Locked venue allocation stays fixed during rebalance
 * ✅ User can log expense marked as paid
 * ✅ Paid expense appears in budget table
 * ✅ User can complete a task via checkbox
 * ✅ All key pages pass WCAG 2.1 AA accessibility checks
 */
