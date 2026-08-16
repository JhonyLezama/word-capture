import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.worker,
        chrome: 'readonly',
        indexedDB: 'readonly',
        fetch: 'readonly',
        URLSearchParams: 'readonly',
        Map: 'readonly',
        Promise: 'readonly',
        Date: 'readonly',
        Math: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-duplicate-imports': 'error',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'pnpm-lock.yaml',
      'icons/**',
    ],
  },
];
