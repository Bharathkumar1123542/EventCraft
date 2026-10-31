/**
 * Live Generation Test
 * Spec: spec.md §14 S45 - Release Gate SC-04
 * 
 * Runs 30 real AI generations against production Anthropic API
 * Success criteria: ≥29/30 (96.7%) must validate against schema
 * 
 * ⚠️ WARNING: This costs money! Only run before release.
 * 
 * Usage: ANTHROPIC_API_KEY=your-key pnpm test:live
 */

import { setTimeout } from 'timers/promises';

// Test event templates
interface TestEvent {
  type: 'wedding' | 'birthday' | 'community';
  title: string;
  guestCount: number;
  totalBudgetMinor: number;
  currency: string;
  preferences: string;
}

const TEST_EVENTS: TestEvent[] = [
  // Wedding events (10)
  {
    type: 'wedding',
    title: 'Sarah & Mike Wedding',
    guestCount: 150,
    totalBudgetMinor: 5000000,
    currency: 'USD',
    preferences: 'Outdoor ceremony, garden reception, vegetarian options',
  },
  {
    type: 'wedding',
    title: 'Jennifer & Tom Celebration',
    guestCount: 200,
    totalBudgetMinor: 7500000,
    currency: 'USD',
    preferences: 'Elegant ballroom, live band, gluten-free options',
  },
  {
    type: 'wedding',
    title: 'Amanda & Chris Wedding',
    guestCount: 80,
    totalBudgetMinor: 3000000,
    currency: 'USD',
    preferences: 'Beach ceremony, casual reception, seafood',
  },
  {
    type: 'wedding',
    title: 'Lisa & David Marriage',
    guestCount: 120,
    totalBudgetMinor: 4500000,
    currency: 'USD',
    preferences: 'Traditional church, formal dinner, dance floor',
  },
  {
    type: 'wedding',
    title: 'Rachel & Mark Vows',
    guestCount: 60,
    totalBudgetMinor: 2000000,
    currency: 'USD',
    preferences: 'Intimate venue, farm-to-table, wine pairing',
  },
  {
    type: 'wedding',
    title: 'Emily & James Union',
    guestCount: 180,
    totalBudgetMinor: 6000000,
    currency: 'USD',
    preferences: 'Historic venue, string quartet, champagne toast',
  },
  {
    type: 'wedding',
    title: 'Kate & Ryan Wedding',
    guestCount: 100,
    totalBudgetMinor: 4000000,
    currency: 'USD',
    preferences: 'Mountain lodge, rustic decor, buffet style',
  },
  {
    type: 'wedding',
    title: 'Nicole & Ben Ceremony',
    guestCount: 140,
    totalBudgetMinor: 5500000,
    currency: 'USD',
    preferences: 'Waterfront venue, sunset ceremony, cocktail hour',
  },
  {
    type: 'wedding',
    title: 'Sophia & Alex Wedding',
    guestCount: 90,
    totalBudgetMinor: 3500000,
    currency: 'USD',
    preferences: 'Vineyard setting, wine tasting, family style dinner',
  },
  {
    type: 'wedding',
    title: 'Megan & Josh Nuptials',
    guestCount: 110,
    totalBudgetMinor: 4200000,
    currency: 'USD',
    preferences: 'Garden party, food trucks, lawn games',
  },
  // Birthday events (10)
  {
    type: 'birthday',
    title: "Emma's 8th Birthday",
    guestCount: 25,
    totalBudgetMinor: 200000,
    currency: 'USD',
    preferences: 'Age: 8, nut allergies, unicorn theme',
  },
  {
    type: 'birthday',
    title: "Michael's 40th Birthday",
    guestCount: 50,
    totalBudgetMinor: 500000,
    currency: 'USD',
    preferences: 'Age: 40, cocktail party, jazz music',
  },
  {
    type: 'birthday',
    title: "Sophia's 5th Birthday",
    guestCount: 20,
    totalBudgetMinor: 150000,
    currency: 'USD',
    preferences: 'Age: 5, princess theme, face painting',
  },
  {
    type: 'birthday',
    title: "Robert's 60th Birthday",
    guestCount: 80,
    totalBudgetMinor: 800000,
    currency: 'USD',
    preferences: 'Age: 60, formal dinner, tribute speeches',
  },
  {
    type: 'birthday',
    title: "Olivia's 10th Birthday",
    guestCount: 30,
    totalBudgetMinor: 300000,
    currency: 'USD',
    preferences: 'Age: 10, outdoor activities, sports theme',
  },
  {
    type: 'birthday',
    title: "Daniel's 30th Birthday",
    guestCount: 60,
    totalBudgetMinor: 600000,
    currency: 'USD',
    preferences: 'Age: 30, karaoke, buffet, beer tasting',
  },
  {
    type: 'birthday',
    title: "Lily's 7th Birthday",
    guestCount: 22,
    totalBudgetMinor: 180000,
    currency: 'USD',
    preferences: 'Age: 7, vegetarian, rainbow theme, crafts',
  },
  {
    type: 'birthday',
    title: "Steven's 50th Birthday",
    guestCount: 70,
    totalBudgetMinor: 700000,
    currency: 'USD',
    preferences: 'Age: 50, golf theme, BBQ, live band',
  },
  {
    type: 'birthday',
    title: "Ava's 12th Birthday",
    guestCount: 35,
    totalBudgetMinor: 350000,
    currency: 'USD',
    preferences: 'Age: 12, spa party, nail station, smoothies',
  },
  {
    type: 'birthday',
    title: "Brian's 25th Birthday",
    guestCount: 45,
    totalBudgetMinor: 450000,
    currency: 'USD',
    preferences: 'Age: 25, house party, DJ, pizza',
  },
  // Community events (10)
  {
    type: 'community',
    title: 'Neighborhood Block Party',
    guestCount: 200,
    totalBudgetMinor: 500000,
    currency: 'USD',
    preferences: 'Outdoor, permits needed, kid-friendly activities',
  },
  {
    type: 'community',
    title: 'Community Fundraiser Gala',
    guestCount: 150,
    totalBudgetMinor: 1000000,
    currency: 'USD',
    preferences: 'Formal dinner, silent auction, speaker',
  },
  {
    type: 'community',
    title: 'Park Clean-Up Day',
    guestCount: 75,
    totalBudgetMinor: 100000,
    currency: 'USD',
    preferences: 'Morning event, supplies needed, refreshments',
  },
  {
    type: 'community',
    title: 'Cultural Festival',
    guestCount: 500,
    totalBudgetMinor: 2000000,
    currency: 'USD',
    preferences: 'Food vendors, performances, insurance required',
  },
  {
    type: 'community',
    title: 'Youth Sports Tournament',
    guestCount: 120,
    totalBudgetMinor: 300000,
    currency: 'USD',
    preferences: 'Soccer fields, trophies, snack bar',
  },
  {
    type: 'community',
    title: 'Senior Center Potluck',
    guestCount: 60,
    totalBudgetMinor: 150000,
    currency: 'USD',
    preferences: 'Accessible venue, dietary restrictions, entertainment',
  },
  {
    type: 'community',
    title: 'Book Club Annual Meeting',
    guestCount: 30,
    totalBudgetMinor: 80000,
    currency: 'USD',
    preferences: 'Coffee and desserts, author speaker, quiet venue',
  },
  {
    type: 'community',
    title: 'Town Hall Meeting',
    guestCount: 250,
    totalBudgetMinor: 400000,
    currency: 'USD',
    preferences: 'AV equipment, seating, parking, accessibility',
  },
  {
    type: 'community',
    title: 'Community Garden Opening',
    guestCount: 100,
    totalBudgetMinor: 200000,
    currency: 'USD',
    preferences: 'Outdoor, ribbon cutting, refreshments, tours',
  },
  {
    type: 'community',
    title: 'Holiday Market',
    guestCount: 300,
    totalBudgetMinor: 600000,
    currency: 'USD',
    preferences: 'Vendor booths, parking, permits, music',
  },
];

interface GenerationResult {
  eventIndex: number;
  eventTitle: string;
  success: boolean;
  sectionsValidated: {
    budget: boolean;
    timeline: boolean;
    vendors: boolean;
    ideas: boolean;
  };
  error?: string;
  durationMs: number;
}

/**
 * Validate budget section structure
 */
function validateBudgetSection(budget: any): boolean {
  if (!budget || !Array.isArray(budget.categories)) {
    return false;
  }
  
  // Check each category has required fields
  for (const cat of budget.categories) {
    if (!cat.key || !cat.label || typeof cat.allocatedMinor !== 'number') {
      return false;
    }
  }
  
  return budget.categories.length >= 3 && budget.categories.length <= 15;
}

/**
 * Validate timeline section structure
 */
function validateTimelineSection(timeline: any): boolean {
  if (!timeline || !Array.isArray(timeline.tasks)) {
    return false;
  }
  
  // Check each task has required fields
  for (const task of timeline.tasks) {
    if (!task.title || !task.dueDate || !task.priority || !task.category) {
      return false;
    }
    if (!['high', 'medium', 'low'].includes(task.priority)) {
      return false;
    }
  }
  
  return timeline.tasks.length >= 5 && timeline.tasks.length <= 50;
}

/**
 * Validate vendors section structure
 */
function validateVendorsSection(vendors: any): boolean {
  if (!vendors || !Array.isArray(vendors.items)) {
    return false;
  }
  
  // Check each vendor item has required fields
  for (const item of vendors.items) {
    if (!item.categoryKey || !item.need || !item.description) {
      return false;
    }
    if (!Array.isArray(item.questionsToAsk) || item.questionsToAsk.length < 2) {
      return false;
    }
    if (typeof item.isMustHave !== 'boolean') {
      return false;
    }
  }
  
  return vendors.items.length >= 3 && vendors.items.length <= 25;
}

/**
 * Validate ideas section structure
 */
function validateIdeasSection(ideas: any): boolean {
  if (!ideas || !Array.isArray(ideas.items)) {
    return false;
  }
  
  const validKinds = ['theme', 'decor', 'food_drink', 'activity', 'entertainment', 'keepsake'];
  const validCostTiers = ['low', 'medium', 'high'];
  
  // Check each idea has required fields
  for (const idea of ideas.items) {
    if (!idea.title || !idea.description || !idea.kind || !idea.costTier) {
      return false;
    }
    if (!validKinds.includes(idea.kind)) {
      return false;
    }
    if (!validCostTiers.includes(idea.costTier)) {
      return false;
    }
  }
  
  return ideas.items.length >= 8 && ideas.items.length <= 30;
}

/**
 * Run a single generation test
 */
async function testGeneration(
  eventData: TestEvent,
  eventIndex: number
): Promise<GenerationResult> {
  const start = Date.now();
  const result: GenerationResult = {
    eventIndex,
    eventTitle: eventData.title,
    success: false,
    sectionsValidated: {
      budget: false,
      timeline: false,
      vendors: false,
      ideas: false,
    },
    durationMs: 0,
  };
  
  try {
    // In real implementation, this would call the actual API
    // For now, we'll simulate with a placeholder
    
    // POST /api/generate/initial-plan
    const baseURL = process.env.API_URL || 'http://localhost:3000';
    const response = await fetch(`${baseURL}/api/v1/generate/initial-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: eventData.type,
        title: eventData.title,
        eventDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
        guestCount: eventData.guestCount,
        totalBudgetMinor: eventData.totalBudgetMinor,
        currency: eventData.currency,
        preferences: eventData.preferences,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    
    // Validate each section
    result.sectionsValidated.budget = validateBudgetSection(data.budget);
    result.sectionsValidated.timeline = validateTimelineSection(data.timeline);
    result.sectionsValidated.vendors = validateVendorsSection(data.vendors);
    result.sectionsValidated.ideas = validateIdeasSection(data.ideas);
    
    // Success if all sections validate
    result.success = Object.values(result.sectionsValidated).every(v => v);
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }
  
  result.durationMs = Date.now() - start;
  return result;
}

/**
 * Run all 30 generation tests
 */
async function runLiveTests() {
  console.log('🧪 EventCraft Live Generation Test');
  console.log('═'.repeat(60));
  console.log(`   Test count: 30`);
  console.log(`   Success target: ≥29/30 (96.7%)`);
  console.log(`   Release gate: SC-04`);
  console.log();
  
  // Check API key
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith('sk-dummy')) {
    console.error('❌ Error: ANTHROPIC_API_KEY not set or is dummy key');
    console.error('   Set a real API key: ANTHROPIC_API_KEY=sk-ant-... pnpm test:live');
    console.error('   ⚠️  This will make real API calls and cost money!');
    process.exit(1);
  }
  
  console.log('⚠️  WARNING: This will make 30 real API calls to Anthropic');
  console.log('   Estimated cost: ~$2-5 USD');
  console.log('   Press Ctrl+C within 5 seconds to cancel...');
  console.log();
  
  await setTimeout(5000);
  
  console.log('🚀 Starting live tests...\n');
  
  const results: GenerationResult[] = [];
  
  for (let i = 0; i < TEST_EVENTS.length; i++) {
    const event = TEST_EVENTS[i];
    if (!event) continue;
    console.log(`Test ${i + 1}/30: ${event.title}`);
    
    const result = await testGeneration(event, i + 1);
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    const sections = Object.entries(result.sectionsValidated)
      .filter(([_, valid]) => !valid)
      .map(([name]) => name);
    
    console.log(`   ${status} ${result.durationMs}ms${sections.length > 0 ? ` (failed: ${sections.join(', ')})` : ''}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    // Rate limiting pause
    await setTimeout(1000);
  }
  
  console.log();
  console.log('═'.repeat(60));
  console.log('📊 Results Summary');
  console.log('═'.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / results.length) * 100;
  
  console.log(`Total tests:       ${results.length}`);
  console.log(`Successful:        ${successCount}`);
  console.log(`Failed:            ${results.length - successCount}`);
  console.log(`Success rate:      ${successRate.toFixed(1)}%`);
  console.log();
  
  // Section-level statistics
  const sectionStats = {
    budget: results.filter(r => r.sectionsValidated.budget).length,
    timeline: results.filter(r => r.sectionsValidated.timeline).length,
    vendors: results.filter(r => r.sectionsValidated.vendors).length,
    ideas: results.filter(r => r.sectionsValidated.ideas).length,
  };
  
  console.log('Section validation rates:');
  console.log(`   Budget:    ${sectionStats.budget}/30 (${((sectionStats.budget / 30) * 100).toFixed(1)}%)`);
  console.log(`   Timeline:  ${sectionStats.timeline}/30 (${((sectionStats.timeline / 30) * 100).toFixed(1)}%)`);
  console.log(`   Vendors:   ${sectionStats.vendors}/30 (${((sectionStats.vendors / 30) * 100).toFixed(1)}%)`);
  console.log(`   Ideas:     ${sectionStats.ideas}/30 (${((sectionStats.ideas / 30) * 100).toFixed(1)}%)`);
  console.log();
  
  // Duration statistics
  const avgDuration = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;
  const maxDuration = Math.max(...results.map(r => r.durationMs));
  const minDuration = Math.min(...results.map(r => r.durationMs));
  
  console.log('Performance:');
  console.log(`   Average:   ${(avgDuration / 1000).toFixed(1)}s`);
  console.log(`   Min:       ${(minDuration / 1000).toFixed(1)}s`);
  console.log(`   Max:       ${(maxDuration / 1000).toFixed(1)}s`);
  console.log();
  
  console.log('═'.repeat(60));
  
  // Check release gate
  const TARGET_SUCCESS_COUNT = 29;
  
  if (successCount >= TARGET_SUCCESS_COUNT) {
    console.log(`✅ PASSED: Release Gate SC-04`);
    console.log(`   ${successCount}/30 generations validated (≥${TARGET_SUCCESS_COUNT} required)`);
    console.log();
    return 0;
  } else {
    console.log(`❌ FAILED: Release Gate SC-04`);
    console.log(`   ${successCount}/30 generations validated (≥${TARGET_SUCCESS_COUNT} required)`);
    console.log(`   Missing: ${TARGET_SUCCESS_COUNT - successCount} successful generations`);
    console.log();
    console.log('Action required:');
    console.log('  - Review failed test logs above');
    console.log('  - Check prompt engineering in generation service');
    console.log('  - Validate schema constraints');
    console.log('  - Re-run after fixes: pnpm test:live');
    process.exit(1);
  }
}

// Run the tests
runLiveTests().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
