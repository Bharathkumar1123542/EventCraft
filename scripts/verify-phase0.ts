#!/usr/bin/env tsx
/**
 * Verification script for Phase 0 completion
 * Checks that S01, S02, S03 are properly configured
 */

import fs from 'fs';
import path from 'path';

const requiredFiles = [
  // S01: Scaffold
  'package.json',
  '.nvmrc',
  'tsconfig.json',
  'next.config.ts',
  'tailwind.config.ts',
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/app/globals.css',
  'src/app/api/health/route.ts',
  
  // S02: ESLint + Prettier
  'eslint.config.mjs',
  '.prettierrc',
  
  // S03: Environment
  'src/server/config/env.ts',
  'src/server/config/env.test.ts',
  '.env.example',
  
  // S04-S06
  'vitest.config.ts',
  'playwright.config.ts',
  '.github/workflows/ci.yml',
  'docker/Dockerfile',
  'compose.yaml',
];

function checkFile(filePath: string): boolean {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${filePath}`);
  return exists;
}

console.log('🔍 Verifying Phase 0 setup...\n');

const results = requiredFiles.map(checkFile);
const allExist = results.every((r) => r);

console.log('\n' + '='.repeat(50));

if (allExist) {
  console.log('✅ All required files exist!');
  console.log('\nNext steps:');
  console.log('1. Install Node 24: nvm install 24 && nvm use 24');
  console.log('2. Install pnpm: corepack enable && corepack prepare pnpm@10.0.0 --activate');
  console.log('3. Install dependencies: pnpm install');
  console.log('4. Run: pnpm build && pnpm typecheck');
  process.exit(0);
} else {
  console.log('❌ Some files are missing!');
  process.exit(1);
}
