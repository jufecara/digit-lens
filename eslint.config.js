import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist',
      'dist-demo',
      'node_modules',
      'packages/*/dist',
      'packages/*/dist-demo',
      'packages/*/node_modules',
      '*.config.js',
      '*.config.ts',
      'coverage',
      'packages/*/coverage',
    ],
  },
  // TypeScript files with full type checking
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        project: [
          './tsconfig.json',
          './packages/core/tsconfig.json',
          './packages/demo/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // JavaScript files without type checking
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-console': 'off',
    },
  },
];
