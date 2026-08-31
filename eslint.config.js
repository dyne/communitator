import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/', 'docs/', 'node_modules/', 'coverage/', 'src/utils/nostr.js'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: { 'preserve-caught-error': 'off' },
  },
  {
    files: ['test/**/*.{js,jsx}'],
    languageOptions: { globals: globals.vitest },
  },
];
