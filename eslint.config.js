// ESLint 9.x — flat config
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  // Ignores globales
  {
    ignores: ['node_modules/**', 'dist/**'],
  },

  // Configuración para archivos TypeScript
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Reglas recomendadas de TypeScript
      ...tseslint.configs['recommended'].rules,
      ...tseslint.configs['recommended-requiring-type-checking'].rules,

      // Sin any explícito
      '@typescript-eslint/no-explicit-any': 'error',

      // Variables sin usar (prefijo _ para ignorar intencionalmente)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Imports de tipos siempre con "import type"
      '@typescript-eslint/consistent-type-imports': 'error',

      // Promesas flotantes son un bug silencioso
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Preferir ?? sobre || para nullish coalescing
      '@typescript-eslint/prefer-nullish-coalescing': 'error',

      // Preferir ?. sobre && encadenado
      '@typescript-eslint/prefer-optional-chain': 'error',

      // No console.log en producción (usar Logger)
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Igualdad estricta siempre
      eqeqeq: ['error', 'always'],

      // No var, preferir const
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
];
