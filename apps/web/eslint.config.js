import reactConfig from '@apps/eslint-config/react'

export default [
  ...reactConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      // vi.fn() mocks não têm problema de `this` — regra não se aplica a test doubles
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '.turbo/**',
      'src/components/ui/**',
      'eslint.config.js',
      'postcss.config.js',
      '**/*.timestamp-*.mjs',
    ],
  },
]
