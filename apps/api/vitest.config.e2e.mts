import { fileURLToPath } from 'node:url'

import swc from 'unplugin-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Espelha o vitest.config.mts: desliga o transform nativo do Vite (Oxc) p/ o
  // unplugin-swc ser o único a compilar TS. Sem isto o Oxc compila e as opções
  // de swc abaixo (externalHelpers/decoratorMetadata) NÃO valem no código que a
  // cobertura mede — as ternárias de `@Injectable()` viram branch fantasma.
  oxc: false,
  plugins: [
    tsconfigPaths(),
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        // Espelha o vitest.config.mts: `externalHelpers` move `_ts_decorate`/
        // `_ts_metadata` pro @swc/helpers (fora de src/). Sem isso, a ternária
        // `typeof Dep === "undefined" ? Object : Dep` que o decoratorMetadata
        // injeta em cada `@Injectable()` vira branch fantasma inalcançável e
        // trava o gate de 100%.
        externalHelpers: true,
        transform: { decoratorMetadata: true, legacyDecorator: true },
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
    include: ['src/**/*.e2e-spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['./test/setup-e2e.ts'],
    pool: 'forks', // 1 schema Postgres por worker — evita conflito
    poolOptions: { forks: { singleFork: false } },
    sequence: { concurrent: false }, // E2E sequencial dentro do mesmo arquivo
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage-e2e',
      reporter: ['text', 'lcov', 'html'],
      // Escopo COMPLEMENTAR ao vitest.config.mts, não sobreposto: o unit cobre
      // todo o `src` EXCETO os repositórios Prisma (que exigem banco real e por
      // isso vivem no `coverage.exclude` de lá); aqui cobrimos exatamente esses.
      //
      // Antes isto era `include: ['src/**/*.ts']` com thresholds 100 — exigia
      // 100% do src inteiro só com e2e, o que é impossível. Resultado: o comando
      // nunca rodava, o CI chamava `test:e2e` (sem --coverage) e o "coberto por
      // e2e" alegado no exclude do unit era uma promessa que ninguém verificava.
      // Este era o único furo real do gate de 100%.
      include: ['src/infra/database/prisma/repositories/**/*.ts'],
      exclude: ['**/*.e2e-spec.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})
