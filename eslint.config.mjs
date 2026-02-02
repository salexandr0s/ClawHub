import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import nextPlugin from '@next/eslint-plugin-next'

/**
 * ESLint v9 flat config.
 *
 * NOTE: Next.js 16 removed `next lint`, so we run ESLint directly.
 * We intentionally keep this config lightweight (no type-aware rules) to ensure
 * it works out-of-the-box for OSS users.
 */

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/data/**',
      '**/.turbo/**',
      '**/coverage/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React / Next (applies to the app + packages)
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      '@next/next': nextPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Keep noise low in early OSS stage
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // TS/JS hygiene (warn-only)
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-case-declarations': 'off',
      'no-useless-escape': 'off',

      // React Hooks lint rules are valuable, but too noisy during rapid iteration.
      // Re-enable once code stabilizes.
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/globals': 'off',
      'react-hooks/immutability': 'off',

      // Next.js core safety checks (subset)
      '@next/next/no-html-link-for-pages': 'off',
    },
  },

  // Node config files
  {
    files: ['**/*.config.js', '**/*.config.cjs', '**/next.config.js', '**/postcss.config.js', '**/tailwind.config.*'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { module: 'readonly', require: 'readonly', process: 'readonly' },
    },
    rules: {
      'no-undef': 'off',
    },
  },
]

