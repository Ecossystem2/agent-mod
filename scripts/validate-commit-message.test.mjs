#!/usr/bin/env node
// Smoke test puro do validador (sem framework).
// Uso: node scripts/validate-commit-message.test.mjs
//
// Cria mensagens temporárias em /tmp e roda o validador esperando exit code.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { exit } from 'node:process'

const dir = mkdtempSync(join(tmpdir(), 'validate-commit-'))

const cases = [
  // [mensagem, deve passar?]
  ['feat(api): adiciona endpoint de login', true],
  ['fix(auth): corrige redirect pós sign-in', true],
  ['chore(deps): atualiza prisma para 6.x', true],
  ['feat: sem scope', false],
  ['feat(API): scope nao kebab', false],
  ['Feat(api): tipo capitalizado', false],
  ['random(api): tipo invalido', false],
  ['feat(api): Subject com maiuscula', false],
  ['feat(api): subject com ponto final.', false],
  ['', false],
]

let failures = 0
for (const [msg, shouldPass] of cases) {
  const file = join(dir, `msg-${Math.random().toString(36).slice(2)}.txt`)
  writeFileSync(file, msg)
  let passed
  try {
    execFileSync('node', ['scripts/validate-commit-message.mjs', file], { stdio: 'pipe' })
    passed = true
  } catch {
    passed = false
  }
  const ok = passed === shouldPass
  console.log(`${ok ? '✓' : '✗'} "${msg.slice(0, 50)}" → ${passed ? 'pass' : 'fail'} (esperado ${shouldPass ? 'pass' : 'fail'})`)
  if (!ok) failures++
}

rmSync(dir, { recursive: true, force: true })

if (failures > 0) {
  console.error(`\n${failures} caso(s) falhou(aram)`)
  exit(1)
}
console.log('\n✓ todos os casos OK')
