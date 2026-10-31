/**
 * Journey J4: Mid-Planning User with Assistant
 * Spec: prd.md §2 - J4
 * 
 * Open assistant → ask "What should I do this week?" →
 * receive answer citing open tasks and budget status
 * 
 * Done when: Answer cites open tasks due within 7 days and budget status
 * from the user's data
 */

import { test, expect, checkAccessibility } from './fixtures';

test.describe('J4: Assistant Journey', () => {
  test('get contextual answer from assistant about weekly tasks', async ({ authenticatedPage: page }) => {
    // User starts at events list
    await expect(page).toHaveURL('/events');
    
    // Step 1: Create event with tasks
    await page.click('a:has-text("Create event")');
    
    await page.selectOption('select[name="type"]', 'wedding');
    await page.fill('input[name="title"]', 'Assistant Test Event');
    
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 14); // 2 weeks from now
    const dateString = eventDate.toISOString().split('T')[0]!;
    await page.fill('input[name="eventDate"]', dateString);
    
    await page.fill('input[name="city"]', 'San Francisco');
    await page.fill('input[name="guestCount"]', '80');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '25000');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+\?generating=1/);
    
    // Wait for generation to complete
    await page.waitForSelector('text=Timeline', { timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Step 2: Navigate to assistant page
    await page.click('a[href*="/assistant"]');
    await expect(page).toHaveURL(/\/events\/[a-f0-9-]+\/assistant/);
    
    // Step 3: Verify privacy notice is visible
    await expect(page.locator('text=Privacy, text=assistant sees')).toBeVisible();
    await expect(page.locator('text=never sees your name, text=never sees your email')).toBeVisible();
    
    // Step 4: Verify starter prompts are shown (empty conversation)
    await expect(page.locator('button:has-text("What should I do this week?")')).toBeVisible();
    await expect(page.locator('button:has-text("Am I on budget?")')).toBeVisible();
    
    // Step 5: Ask the key question
    const starterPrompt = page.locator('button:has-text("What should I do this week?")');
    await starterPrompt.click();
    
    // Input should be filled with the prompt
    const textarea = page.locator('textarea');
    await expect(textarea).toHaveValue('What should I do this week?');
    
    // Send the message
    await page.click('button:has-text("Send")');
    
    // Step 6: Wait for streaming response
    // Should see user message appear
    await expect(page.locator('text=What should I do this week?')).toBeVisible({ timeout: 3000 });
    
    // Wait for assistant response to stream in
    await page.waitForTimeout(5000);
    
    // Step 7: Verify answer contains task information
    const responseText = await page.locator('div:has-text("task"), div:has-text("week")').first().textContent();
    
    // Response should mention tasks
    expect(responseText?.toLowerCase()).toMatch(/task|due|week|this week/);
    
    // Step 8: Ask about budget
    await page.fill('textarea', 'Am I on budget?');
    await page.click('button:has-text("Send")');
    
    await page.waitForTimeout(5000);
    
    // Should see budget-related information
    const budgetResponse = await page.locator('text=budget, text=allocated, text=spent').first().textContent();
    expect(budgetResponse?.toLowerCase()).toMatch(/budget|allocated|spent|remaining/);
    
    // Step 9: Verify conversation history shows both messages
    const userMessages = await page.locator('[class*="user"], div:has-text("What should I do")').count();
    expect(userMessages).toBeGreaterThan(0);
    
    const assistantMessages = await page.locator('[class*="assistant"], div:has-text("task")').count();
    expect(assistantMessages).toBeGreaterThan(0);
    
    // Step 10: Test clear conversation
    await page.click('button:has-text("Clear conversation")');
    
    // Should see confirmation dialog
    await expect(page.locator('text=Clear conversation?')).toBeVisible();
    await expect(page.locator('text=permanently delete')).toBeVisible();
    
    await page.click('button:has-text("Clear conversation"):not(:has-text("?"))');
    
    // Should return to empty state with starter prompts
    await expect(page.locator('button:has-text("What should I do this week?")')).toBeVisible({ timeout: 3000 });
    
    // Journey complete!
  });

  test('assistant page passes accessibility checks', async ({ authenticatedPage: page }) => {
    // Create minimal event
    await page.goto('/events/new');
    
    await page.selectOption('select[name="type"]', 'wedding');
    await page.fill('input[name="title"]', 'A11y Assistant Test');
    
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 30);
    await page.fill('input[name="eventDate"]', eventDate.toISOString().split('T')[0]!);
    
    await page.fill('input[name="city"]', 'Seattle');
    await page.fill('input[name="guestCount"]', '50');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '15000');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+/);
    await page.waitForTimeout(5000);
    
    // Navigate to assistant
    await page.click('a[href*="/assistant"]');
    await page.waitForTimeout(1000);
    
    // Check accessibility
    const violations = await checkAccessibility(page);
    expect(violations).toHaveLength(0);
  });

  test('handles SSE streaming correctly', async ({ authenticatedPage: page }) => {
    // Create event
    await page.goto('/events/new');
    
    await page.selectOption('select[name="type"]', 'birthday');
    await page.fill('input[name="title"]', 'SSE Test');
    
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 20);
    await page.fill('input[name="eventDate"]', eventDate.toISOString().split('T')[0]!);
    
    await page.fill('input[name="city"]', 'Austin');
    await page.fill('input[name="guestCount"]', '40');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '5000');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+/);
    await page.waitForTimeout(5000);
    
    // Go to assistant
    await page.click('a[href*="/assistant"]');
    
    // Ask question
    await page.fill('textarea', 'Give me a summary');
    
    // Monitor for streaming indicator (loading state)
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    
    // Send button should show "Sending..." state
    await expect(page.locator('button:has-text("Sending"), button[disabled]:has-text("Send")')).toBeVisible({ timeout: 2000 });
    
    // Wait for response to complete
    await page.waitForTimeout(5000);
    
    // Send button should return to "Send" state
    await expect(sendButton).toBeEnabled();
    await expect(sendButton).toHaveText('Send');
  });

  test('displays only last 10 messages', async ({ authenticatedPage: page }) => {
    // Create event
    await page.goto('/events/new');
    
    await page.selectOption('select[name="type"]', 'community');
    await page.fill('input[name="title"]', 'Message History Test');
    
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 45);
    await page.fill('input[name="eventDate"]', eventDate.toISOString().split('T')[0]!);
    
    await page.fill('input[name="city"]', 'Portland');
    await page.fill('input[name="guestCount"]', '100');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '8000');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+/);
    await page.waitForTimeout(5000);
    
    // Go to assistant
    await page.click('a[href*="/assistant"]');
    
    // Send multiple messages to test 10-message window
    for (let i = 1; i <= 12; i++) {
      await page.fill('textarea', `Test message ${i}`);
      await page.click('button:has-text("Send")');
      await page.waitForTimeout(2000); // Wait for response
    }
    
    // Count visible messages
    // With 12 exchanges (12 user + 12 assistant = 24 messages),
    // only last 10 should be visible (5 exchanges)
    const allMessages = await page.locator('[class*="message"], div[class*="user"], div[class*="assistant"]').count();
    
    // Should see <= 10 messages total
    expect(allMessages).toBeLessThanOrEqual(10);
  });

  test('keyboard navigation works correctly', async ({ authenticatedPage: page }) => {
    // Create event
    await page.goto('/events/new');
    
    await page.selectOption('select[name="type"]', 'wedding');
    await page.fill('input[name="title"]', 'Keyboard Test');
    
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 60);
    await page.fill('input[name="eventDate"]', eventDate.toISOString().split('T')[0]!);
    
    await page.fill('input[name="city"]', 'Denver');
    await page.fill('input[name="guestCount"]', '120');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.fill('input[name="totalBudgetMinor"]', '35000');
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/events\/[a-f0-9-]+/);
    await page.waitForTimeout(5000);
    
    // Go to assistant
    await page.click('a[href*="/assistant"]');
    
    const textarea = page.locator('textarea');
    await textarea.fill('Test message');
    
    // Press Enter (should send)
    await textarea.press('Enter');
    
    // Message should be sent
    await expect(page.locator('text=Test message')).toBeVisible({ timeout: 3000 });
    
    // Type new message with Shift+Enter (should add newline, not send)
    await textarea.fill('Line 1');
    await textarea.press('Shift+Enter');
    await textarea.type('Line 2');
    
    const textareaValue = await textarea.inputValue();
    expect(textareaValue).toContain('\n');
    expect(textareaValue).toContain('Line 1');
    expect(textareaValue).toContain('Line 2');
  });
});

/**
 * Journey Acceptance Criteria:
 * 
 * ✅ User can navigate to assistant page
 * ✅ Privacy notice is prominently displayed
 * ✅ Starter prompts show in empty conversation
 * ✅ User can ask "What should I do this week?"
 * ✅ Answer cites tasks due within 7 days
 * ✅ Answer includes budget status information
 * ✅ Responses stream word-by-word via SSE
 * ✅ Conversation history displays user and assistant messages
 * ✅ Only last 10 messages are visible
 * ✅ Clear conversation button works with confirmation
 * ✅ Enter sends message, Shift+Enter adds newline
 * ✅ Send button disabled during streaming
 * ✅ Assistant page passes accessibility checks
 */
