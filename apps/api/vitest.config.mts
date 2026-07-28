import { fileURLToPath } from 'node:url'

import swc from 'unplugin-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // desliga o transform nativo do Vite (Oxc) p/ o unplugin-swc ser o único a compilar TS;
  // só assim externalHelpers/decoratorMetadata abaixo valem no código que a cobertura mede.
  oxc: false,
  plugins: [
    tsconfigPaths(),
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true, tsx: true },
        // externalHelpers move `_ts_decorate`/`_ts_metadata` p/ @swc/helpers (fora de src/), senão
        // as ternárias injetadas em cada classe decorada viram branches fantasma e travam o gate 100%.
        externalHelpers: true,
        transform: {
          decoratorMetadata: true,
          legacyDecorator: true,
          react: { runtime: 'automatic' },
        },
        target: 'es2022',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@test': fileURLToPath(new URL('./test', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    include: ['src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.e2e-spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.e2e-spec.ts',
        'src/infra/main.ts',
        'src/**/*.module.ts',
        'src/**/index.ts',
        'src/shared/database/generated/**',
        // repos Prisma cobertos por e2e (*.e2e-spec.ts), não por unit
        'src/infra/database/prisma/repositories/*-repository.ts',
        // port abstract sem statements executáveis — implementação coberta via e2e
        'src/domain/application/repositories/audit-event-repository.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})
