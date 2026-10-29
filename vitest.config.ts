import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
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
