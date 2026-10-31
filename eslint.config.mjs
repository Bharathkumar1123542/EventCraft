import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import next from 'eslint-config-next';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: 'readonly',
        JSX: 'readonly',
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      boundaries,
      import: importPlugin,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/**' },
        { type: 'schemas', pattern: 'src/schemas/**' },
        { type: 'server-db', pattern: 'src/server/db/**' },
        { type: 'server-ai', pattern: 'src/server/ai/**' },
        { type: 'server-security', pattern: 'src/server/security/**' },
        { type: 'server-services', pattern: 'src/server/services/**' },
        { type: 'server-auth', pattern: 'src/server/auth/**' },
        { type: 'server-config', pattern: 'src/server/config/**' },
        { type: 'lib-http', pattern: 'src/lib/http/**' },
        { type: 'lib-client', pattern: 'src/lib/client/**' },
        { type: 'app-api', pattern: 'src/app/api/**' },
        { type: 'app-pages', pattern: 'src/app/**' },
        { type: 'components', pattern: 'src/components/**' },
      ],
      'boundaries/ignore': ['**/*.test.ts', '**/*.test.tsx', '**/*.integration.test.ts'],
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      
      // Complexity
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 10],
      
      // Accessibility
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/no-autofocus': 'warn',
      
      // Import organization
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'never',
          alphabetize: { order: 'asc' },
        },
      ],
      
      // Boundaries (layering rules from architecture.md §2.4)
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: 'domain',
              allow: [], // Domain imports nothing
            },
            {
              from: 'schemas',
              allow: ['domain'],
            },
            {
              from: 'server-db',
              allow: ['domain', 'schemas'],
            },
            {
              from: 'server-ai',
              allow: ['domain', 'schemas'],
            },
            {
              from: 'server-security',
              allow: ['domain', 'server-db'],
            },
            {
              from: 'server-services',
              allow: ['domain', 'schemas', 'server-db', 'server-ai', 'server-security'],
            },
            {
              from: 'lib-http',
              allow: ['schemas', 'server-auth', 'server-security'],
            },
            {
              from: 'app-api',
              allow: ['lib-http', 'schemas', 'server-config'],
            },
            {
              from: 'app-pages',
              allow: ['components', 'schemas', 'lib-client'],
            },
            {
              from: 'components',
              allow: ['components', 'lib-client', 'schemas'],
            },
            {
              from: 'lib-client',
              allow: ['schemas'],
            },
          ],
        },
      ],
      
      // Server-only enforcement
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/components/**',
              from: './src/server/**',
              message: 'Client components cannot import from server code',
            },
            {
              target: './src/lib/client/**',
              from: './src/server/**',
              message: 'Client utilities cannot import from server code',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/server/**/*.ts'],
    rules: {
      'import/first': ['error'],
      'import/no-anonymous-default-export': 'off',
    },
  },
  {
    files: ['**/*.config.{js,ts,mjs}', 'scripts/**', 'e2e/**'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'drizzle/**',
      '*.config.{js,ts,mjs}',
    ],
  },
];
