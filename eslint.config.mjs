// eslint.config.mjs
// ESLint v9 "flat config" for the StudentOS monorepo (apps/api + apps/web)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import next from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Ignore build artifacts everywhere
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/generated/**', // prisma generated client
      '**/*.config.js',
    ],
  },

  // Base JS + TS recommended rules for the whole repo
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Shared rules for all TS/JS files
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { import: importPlugin },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-namespace': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // apps/api (Node backend, Prisma)
  {
    files: ['apps/api/**/*.{ts,js}'],
    languageOptions: {
      globals: { process: 'readonly', __dirname: 'readonly' },
    },
    rules: {
      // backend can log more freely (still discourage stray console.log)
      'no-console': 'off',
    },
  },

  // apps/web (Next.js frontend)
  {
    files: ['apps/web/**/*.{ts,tsx,js,jsx}'],
    plugins: {
      '@next/next': next,
      'react-hooks': reactHooks,
    },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Turn off any ESLint rules that conflict with Prettier formatting
  prettier,
);
