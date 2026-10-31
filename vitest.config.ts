import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      // Exclude E2E tests (use pnpm test:e2e instead)
      '**/e2e/**',
      // Exclude integration tests that require database
      '**/*.integration.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/domain/**', 'src/server/services/**', 'src/**'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.integration.test.ts',
        'src/server/db/schema/**',
        'src/app/**',
      ],
      thresholds: {
        'src/domain/**': {
          lines: 95,
          branches: 90,
        },
        'src/server/services/**': {
          lines: 85,
          branches: 75,
        },
        global: {
          lines: 80,
          branches: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
