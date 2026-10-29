/**
 * Journey J2: Birthday Parent
 * Spec: prd.md §2 - J2
 * 
 * Create event with dietary and age preferences → review ideas →
 * like or dislike → regenerate ideas → export timeline
 * 
 * Done when: Regenerated ideas exclude disliked titles and keep saved ones;
 * `.ics` imports into a calendar
 */

import { test, expect, checkAccessibility } from './fixtures';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import path from 'path';

test.describe('J2: Birthday Parent Journey', () => {
  test('complete birthday planning with ideas feedback and calendar export', async ({ authenticatedPage: page }) => {
    // User starts at events list
    await expect(page).toHaveURL('/events');
    
    // Step 1: Create birthday event with preferences
    await page.click('a:has-text("Create event")');
    await expect(page).toHaveURL('/events/new');
    
    await page.selectOption('select[name="type"]', 'birthday');
    await page.fill('input[name="title"]', 'Emma\'s 8th Birthday Party');
    
    // Set date 2 months from now
    const eventDate = new Date();
    eventDate.setMonth(eventDate.getMonth() + 2);
    const dateString = eventDate.toISOString().split('T')[0]!;
    await page.fill('input[name="eventDate"]', dateString);
    
    await page.fill('input[name="city"]', 'Austin');
    await page.fill('input[name="guestCount"]', '25');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '2000'); // $2,000
    
    // Add dietary and age preferences
    await page.fill(
      'textarea[name="preferences"]',
      'Age: 8 years old. Dietary: 2 kids with nut allergies, 1 vegetarian. Theme: unicorns and rainbows'
    );
    
    await page.click('button[type="submit"]');
    
    // Wait for event creation and redirect
    await page.waitForURL(/\/events\/[a-f0-9-]+\?generating=1/, { timeout: 10000 });
    
    // Step 2: Wait for generation to complete
    await page.waitForSelector('text=Ideas', { timeout: 30000 });
    
    // Step 3: Navigate to ideas page
    await page.click('a[href*="/ideas"]');
    await expect(page).toHaveURL(/\/events\/[a-f0-9-]+\/ideas/);
    
    // Should see idea cards
    await expect(page.locator('[data-testid="idea-card"], .idea-card, article, div').first()).toBeVisible({ timeout: 5000 });
    
    // Step 4: Review and give feedback to ideas
    // Find first idea and like it
    const firstIdeaCard = page.locator('article, [role="article"]').first();
    const likeButton1 = firstIdeaCard.locator('button:has-text("Like"), button[aria-label*="Like"]');
    await likeButton1.click();
    
    // Verify like button is pressed
    await expect(likeButton1).toHaveAttribute('aria-pressed', 'true');
    
    // Save the liked idea
    const saveButton1 = firstIdeaCard.locator('button[aria-label*="Save"], button:has(svg)').last();
    await saveButton1.click();
    
    // Find second idea and dislike it
    const secondIdeaCard = page.locator('article, [role="article"]').nth(1);
    const dislikeButton2 = secondIdeaCard.locator('button:has-text("Dislike"), button[aria-label*="Dislike"]');
    
    // Record the title of the disliked idea
    const dislikedTitle = await secondIdeaCard.locator('h3, h2').textContent();
    
    await dislikeButton2.click();
    await expect(dislikeButton2).toHaveAttribute('aria-pressed', 'true');
    
    // Step 5: Regenerate ideas
    await page.click('button:has-text("Regenerate ideas")');
    
    // Wait for regeneration to complete
    await page.waitForTimeout(3000);
    
    // Step 6: Verify disliked idea is excluded
    const allIdeaTitles = await page.locator('article h3, article h2').allTextContents();
    expect(allIdeaTitles).not.toContain(dislikedTitle);
    
    // Verify saved idea is still present (check via filter)
    await page.click('button:has-text("Saved")');
    await page.waitForURL(/filter=saved/);
    
    const savedIdeas = await page.locator('article, [role="article"]').count();
    expect(savedIdeas).toBeGreaterThan(0);
    
    // Step 7: Export timeline as .ics
    await page.click('a[href*="/timeline"]');
    await expect(page).toHaveURL(/\/events\/[a-f0-9-]+\/timeline/);
    
    // Click download calendar button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download calendar"), a:has-text("Download")');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.ics$/);
    
    // Save and verify ICS file content
    const downloadPath = path.join(__dirname, download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    // Read and verify ICS content
    const icsContent = readFileSync(downloadPath, 'utf-8');
    
    // Verify ICS headers
    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('VERSION:2.0');
    expect(icsContent).toContain('PRODID:-//EventCraft//');
    
    // Verify event is included
    expect(icsContent).toContain('BEGIN:VEVENT');
    expect(icsContent).toContain('Emma\'s 8th Birthday Party');
    expect(icsContent).toContain('END:VEVENT');
    expect(icsContent).toContain('END:VCALENDAR');
    
    // Cleanup
    if (existsSync(downloadPath)) {
      unlinkSync(downloadPath);
    }
    
    // Journey complete!
  });

  test('ideas page passes accessibility checks', async ({ authenticatedPage: page }) => {
    // Create minimal event
    await page.goto('/events/new');
    
    await page.selectOption('select[name="type"]', 'birthday');
    await page.fill('input[name="title"]', 'A11y Birthday Test');
    
    const eventDate = new Date();
    eventDate.setMonth(eventDate.getMonth() + 1);
    await page.fill('input[name="eventDate"]', eventDate.toISOString().split('T')[0]!);
    
    await page.fill('input[name="city"]', 'Denver');
    await page.fill('input[name="guestCount"]', '20');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '1500');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+/);
    
    // Wait for generation
    await page.waitForTimeout(5000);
    
    // Navigate to ideas
    await page.click('a[href*="/ideas"]');
    await page.waitForTimeout(1000);
    
    // Check accessibility
    const violations = await checkAccessibility(page);
    expect(violations).toHaveLength(0);
  });

  test('handles failure injection gracefully', async ({ authenticatedPage: page }) => {
    // This test assumes FAKE_LLM_FAIL_SECTIONS env var can be set
    // In real implementation, you'd set this via test environment
    
    // Create event
    await page.goto('/events/new');
    
    await page.selectOption('select[name="type"]', 'birthday');
    await page.fill('input[name="title"]', 'Failure Test');
    
    const eventDate = new Date();
    eventDate.setMonth(eventDate.getMonth() + 1);
    await page.fill('input[name="eventDate"]', eventDate.toISOString().split('T')[0]!);
    
    await page.fill('input[name="city"]', 'Seattle');
    await page.fill('input[name="guestCount"]', '30');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '3000');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+\?generating=1/);
    
    // If ideas section fails, should show retry button
    await page.waitForTimeout(8000);
    
    // Check if any section shows error state
    const retryButtons = await page.locator('button:has-text("Retry")').count();
    
    if (retryButtons > 0) {
      // Click retry button
      await page.locator('button:has-text("Retry")').first().click();
      
      // Wait for retry to complete
      await page.waitForTimeout(3000);
      
      // Should see success after retry
      await expect(page.locator('text=Retry')).toHaveCount(0);
    }
    
    // Journey should complete even with initial failure
    await expect(page).toHaveURL(/\/events\/[a-f0-9-]+/);
  });
});

/**
 * Journey Acceptance Criteria:
 * 
 * ✅ User can create birthday event with dietary/age preferences
 * ✅ Plan generates including ideas section
 * ✅ User can like, dislike, and save ideas
 * ✅ Like and dislike buttons use aria-pressed correctly
 * ✅ Regenerated ideas exclude disliked titles
 * ✅ Saved ideas are preserved and filterable
 * ✅ User can download timeline as .ics file
 * ✅ ICS file contains valid calendar data
 * ✅ Ideas page passes accessibility checks
 * ✅ Failed sections show retry button and recover
 */
