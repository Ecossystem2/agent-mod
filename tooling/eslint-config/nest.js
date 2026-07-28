import base from './base.js'

/** Flat config Nest — relaxa decorators / DI patterns. */
export default [
  ...base,
  {
    files: ['**/*.ts'],
    rules: {
      // Nest usa muito empty constructor pra DI
      '@typescript-eslint/no-useless-constructor': 'off',
      // controllers/services com decorators que não tipam o retorno corretamente
      '@typescript-eslint/no-extraneous-class': 'off',
      // métodos async em handlers que sometimes não awaitam
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
]
