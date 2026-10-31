/**
 * Bundle Size Checker
 * Spec: spec.md §13 - NFR-14
 * 
 * Verifies initial JavaScript on authenticated pages ≤ 170 KB gzip
 * Reads Next.js build output and fails if bundle exceeds limit
 * 
 * Run after: pnpm build
 * Usage: tsx scripts/check-bundle-size.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

const MAX_BUNDLE_SIZE_KB = 170;
const BUILD_MANIFEST_PATH = '.next/build-manifest.json';
const APP_BUILD_MANIFEST_PATH = '.next/app-build-manifest.json';

interface BuildManifest {
  pages: Record<string, string[]>;
  rootMainFiles?: string[];
}

interface AppBuildManifest {
  pages: Record<string, string[]>;
}

/**
 * Get gzipped size of a file in KB
 */
function getGzipSizeKB(filePath: string): number {
  if (!existsSync(filePath)) {
    return 0;
  }
  
  const content = readFileSync(filePath);
  const gzipped = gzipSync(content, { level: 9 });
  return gzipped.length / 1024;
}

/**
 * Calculate total gzipped size for a set of chunk files
 */
function calculatePageSize(chunks: string[]): number {
  let totalSize = 0;
  
  for (const chunk of chunks) {
    // Chunk paths are relative to .next
    const fullPath = join(process.cwd(), '.next', chunk);
    const size = getGzipSizeKB(fullPath);
    totalSize += size;
  }
  
  return totalSize;
}

/**
 * Check if a page is an authenticated page
 */
function isAuthenticatedPage(pagePath: string): boolean {
  const authenticatedPages = [
    '/events',
    '/account',
    '/events/new',
    // Dynamic routes handled separately
  ];
  
  // Check static authenticated pages
  if (authenticatedPages.includes(pagePath)) {
    return true;
  }
  
  // Check dynamic event pages
  if (pagePath.startsWith('/events/[eventId]')) {
    return true;
  }
  
  return false;
}

async function checkBundleSize() {
  console.log('📦 Checking bundle sizes...\n');
  
  // Check if build output exists
  if (!existsSync(BUILD_MANIFEST_PATH)) {
    console.error('❌ Build manifest not found. Run "pnpm build" first.');
    process.exit(1);
  }
  
  // Read manifests
  const buildManifest: BuildManifest = JSON.parse(
    readFileSync(BUILD_MANIFEST_PATH, 'utf-8')
  );
  
  let appBuildManifest: AppBuildManifest | null = null;
  if (existsSync(APP_BUILD_MANIFEST_PATH)) {
    appBuildManifest = JSON.parse(
      readFileSync(APP_BUILD_MANIFEST_PATH, 'utf-8')
    );
  }
  
  // Collect all authenticated pages and their sizes
  const pageSizes: Record<string, number> = {};
  let maxSize = 0;
  let maxPage = '';
  
  // Check pages from build manifest
  for (const [page, chunks] of Object.entries(buildManifest.pages)) {
    if (isAuthenticatedPage(page)) {
      const size = calculatePageSize(chunks);
      pageSizes[page] = size;
      
      if (size > maxSize) {
        maxSize = size;
        maxPage = page;
      }
    }
  }
  
  // Check app router pages
  if (appBuildManifest) {
    for (const [page, chunks] of Object.entries(appBuildManifest.pages)) {
      if (isAuthenticatedPage(page)) {
        const size = calculatePageSize(chunks);
        pageSizes[page] = size;
        
        if (size > maxSize) {
          maxSize = size;
          maxPage = page;
        }
      }
    }
  }
  
  // Also check common shared chunks
  const sharedChunks = buildManifest.rootMainFiles || [];
  const sharedSize = calculatePageSize(sharedChunks);
  
  console.log('Bundle Sizes (gzipped):');
  console.log('─'.repeat(50));
  
  // Sort by size descending
  const sortedPages = Object.entries(pageSizes)
    .sort(([, a], [, b]) => b - a);
  
  for (const [page, size] of sortedPages) {
    const status = size <= MAX_BUNDLE_SIZE_KB ? '✅' : '❌';
    console.log(`${status} ${page.padEnd(40)} ${size.toFixed(2)} KB`);
  }
  
  if (sharedChunks.length > 0) {
    console.log(`   ${'Shared chunks'.padEnd(40)} ${sharedSize.toFixed(2)} KB`);
  }
  
  console.log('─'.repeat(50));
  console.log(`   ${'Largest authenticated page'.padEnd(40)} ${maxSize.toFixed(2)} KB`);
  console.log(`   ${'Limit'.padEnd(40)} ${MAX_BUNDLE_SIZE_KB} KB`);
  console.log();
  
  // Check against limit
  if (maxSize > MAX_BUNDLE_SIZE_KB) {
    console.error(`❌ FAILED: Bundle size ${maxSize.toFixed(2)} KB exceeds limit of ${MAX_BUNDLE_SIZE_KB} KB`);
    console.error(`   Largest page: ${maxPage}`);
    console.error();
    console.error('Suggestions:');
    console.error('  - Use dynamic imports for large components');
    console.error('  - Check for duplicate dependencies');
    console.error('  - Review third-party library sizes');
    console.error('  - Consider code splitting strategies');
    process.exit(1);
  }
  
  console.log(`✅ PASSED: All authenticated pages under ${MAX_BUNDLE_SIZE_KB} KB gzipped`);
  console.log(`   Largest: ${maxSize.toFixed(2)} KB (${((maxSize / MAX_BUNDLE_SIZE_KB) * 100).toFixed(1)}% of limit)`);
  
  return 0;
}

// Run the check
checkBundleSize().catch((error) => {
  console.error('❌ Error checking bundle size:', error);
  process.exit(1);
});
