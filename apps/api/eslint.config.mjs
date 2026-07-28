import nestConfig from '@apps/eslint-config/nest'

export default [
  ...nestConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
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
      'coverage-e2e/**',
      '.turbo/**',
      '**/*.timestamp-*.mjs',
    ],
  },
]
