#!/usr/bin/env node
// Validador de Conventional Commits estrito, sem dependências externas.
// Uso: node scripts/validate-commit-message.mjs <path-to-commit-msg-file>
//
// Formato exigido:
//   <type>(<scope>): <subject>
//
//   [optional body — após linha em branco]
//
//   [optional footer — após linha em branco]
//
// Regras:
//   - type ∈ TYPES
//   - scope obrigatório, kebab-case
//   - subject minúscula, sem ponto final, ≤ SUBJECT_MAX chars
//   - linha em branco entre header/body, body/footer
//   - body wrap solto (não estritamente 72 cols, mas avisa se > 100)

import { readFileSync } from 'node:fs'
import { argv, exit } from 'node:process'

const TYPES = [
  'feat',
  'fix',
  'chore',
  'docs',
  'refactor',
  'test',
  'perf',
  'style',
  'ci',
  'build',
  'revert',
]
const SUBJECT_MAX = 100
const HEADER_RE = /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9][a-z0-9-]*)\))?(?<bang>!)?: (?<subject>.+)$/

function fail(msg) {
  console.error(`\n✗ commit-msg inválido: ${msg}`)
  console.error('\nFormato esperado:')
  console.error('  <type>(<scope>): <subject>')
  console.error('')
  console.error('  [body opcional]')
  console.error('')
  console.error(`Tipos permitidos: ${TYPES.join(', ')}`)
  console.error('Scope: kebab-case obrigatório.')
  console.error(`Subject: minúscula, sem ponto final, ≤ ${SUBJECT_MAX} chars.\n`)
  exit(1)
}

const path = argv[2]
if (!path) fail('caminho do arquivo da mensagem não fornecido')

const raw = readFileSync(path, 'utf8')
// Remove comentários (linhas começando com #) e linhas vazias do final.
const cleaned = raw
  .split('\n')
  .filter((line) => !line.startsWith('#'))
  .join('\n')
  .replace(/\s+$/, '')

if (!cleaned.trim()) fail('mensagem vazia')

const lines = cleaned.split('\n')
const header = lines[0]

if (header.length > SUBJECT_MAX + 20) {
  fail(`linha de header longa demais (${header.length} chars)`)
}

const match = HEADER_RE.exec(header)
if (!match) fail(`header não bate com o padrão "<type>(<scope>): <subject>": "${header}"`)

const { type, scope, subject } = match.groups
if (!TYPES.includes(type)) fail(`type "${type}" não permitido`)
if (!scope) fail('scope é obrigatório — use "<type>(<scope>): ..."')
if (subject.length > SUBJECT_MAX) fail(`subject longo demais (${subject.length}/${SUBJECT_MAX})`)
if (subject !== subject.toLowerCase()) fail('subject deve estar todo em minúsculas')
if (subject.endsWith('.')) fail('subject não pode terminar com ponto final')
if (subject.trim().length < 3) fail('subject muito curto')

// Se há body, exige linha em branco entre header e body.
if (lines.length > 1) {
  if (lines[1] !== '') fail('precisa de linha em branco entre header e body')
  // Avisa (não falha) se alguma linha do body passa de 100 chars.
  for (let i = 2; i < lines.length; i++) {
    if (lines[i].length > 100) {
      console.warn(`⚠ linha ${i + 1} do body com ${lines[i].length} chars (recomendado ≤ 100)`)
    }
  }
}

console.log(`✓ commit-msg OK: ${type}(${scope}): ${subject}`)
