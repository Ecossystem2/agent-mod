import { Logger } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EnvService } from '@/infra/env/env.service'

const mkdirMock = vi.fn()
const writeFileMock = vi.fn()
const unlinkMock = vi.fn()

vi.mock('node:fs/promises', () => ({
  mkdir: (...args: unknown[]): unknown => mkdirMock(...args),
  writeFile: (...args: unknown[]): unknown => writeFileMock(...args),
  unlink: (...args: unknown[]): unknown => unlinkMock(...args),
}))

const { DiskStorage } = await import('./disk-storage')

function makeEnv(publicUrl?: string): EnvService {
  return { get: () => publicUrl } as unknown as EnvService
}

describe('DiskStorage', () => {
  beforeEach(() => {
    mkdirMock.mockReset().mockResolvedValue(undefined)
    writeFileMock.mockReset().mockResolvedValue(undefined)
    unlinkMock.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('upload com folder cria o diretório e grava o arquivo', async () => {
    const sut = new DiskStorage(makeEnv('https://cdn.example.com/'))

    const result = await sut.upload({
      fileName: 'pic.png',
      fileType: 'image/png',
      body: Buffer.from('x'),
      folder: 'avatars',
    })

    expect(mkdirMock).toHaveBeenCalledWith(expect.stringContaining('avatars'), {
      recursive: true,
    })
    expect(writeFileMock).toHaveBeenCalledOnce()
    expect(result.key).toMatch(/^avatars\/.+-pic\.png$/)
    expect(result.url).toBe(`https://cdn.example.com/${result.key}`)
  })

  it('upload sem folder usa a raiz e a url default', async () => {
    const sut = new DiskStorage(makeEnv())

    const result = await sut.upload({
      fileName: 'doc.pdf',
      fileType: 'application/pdf',
      body: Buffer.from('x'),
    })

    expect(result.key).toMatch(/^[0-9a-f-]+-doc\.pdf$/)
    expect(result.url).toBe(`/uploads/${result.key}`)
  })

  it('delete ignora ENOENT silenciosamente', async () => {
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const err = Object.assign(new Error('missing'), { code: 'ENOENT' })
    unlinkMock.mockRejectedValue(err)
    const sut = new DiskStorage(makeEnv())

    await expect(sut.delete('x')).resolves.toBeUndefined()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('delete loga warn e relança outros erros', async () => {
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const err = Object.assign(new Error('perm denied'), { code: 'EACCES' })
    unlinkMock.mockRejectedValue(err)
    const sut = new DiskStorage(makeEnv())

    await expect(sut.delete('x')).rejects.toBe(err)
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it('signedUrl retorna a url pública', async () => {
    const sut = new DiskStorage(makeEnv())

    await expect(sut.signedUrl('avatars/x.png')).resolves.toBe('/uploads/avatars/x.png')
  })

  it('upload rejeita fileName com path traversal', async () => {
    const sut = new DiskStorage(makeEnv())

    await expect(
      sut.upload({
        fileName: '../../etc/passwd',
        fileType: 'text/plain',
        body: Buffer.from('x'),
      }),
    ).rejects.toThrow('invalid storage key')
    expect(writeFileMock).not.toHaveBeenCalled()
  })

  it('upload rejeita folder com path traversal', async () => {
    const sut = new DiskStorage(makeEnv())

    await expect(
      sut.upload({
        fileName: 'pic.png',
        fileType: 'image/png',
        body: Buffer.from('x'),
        folder: '..\\..\\x',
      }),
    ).rejects.toThrow('invalid storage key')
    expect(mkdirMock).not.toHaveBeenCalled()
  })

  it('upload rejeita folder com separador de path inválido', async () => {
    const sut = new DiskStorage(makeEnv())

    await expect(
      sut.upload({
        fileName: 'pic.png',
        fileType: 'image/png',
        body: Buffer.from('x'),
        folder: 'a\\b',
      }),
    ).rejects.toThrow('invalid storage key')
  })

  it('upload rejeita segmento com separador "/" (não é multi-nível)', async () => {
    const sut = new DiskStorage(makeEnv())

    await expect(
      sut.upload({
        fileName: 'pic.png',
        fileType: 'image/png',
        body: Buffer.from('x'),
        folder: 'a/b',
      }),
    ).rejects.toThrow('invalid storage key')
    expect(mkdirMock).not.toHaveBeenCalled()
  })

  it('upload rejeita fileName com null byte', async () => {
    const sut = new DiskStorage(makeEnv())

    await expect(
      sut.upload({
        fileName: 'pic\0.png',
        fileType: 'image/png',
        body: Buffer.from('x'),
      }),
    ).rejects.toThrow('invalid storage key')
  })

  it('delete rejeita key com path traversal', async () => {
    const sut = new DiskStorage(makeEnv())

    await expect(sut.delete('../../etc/passwd')).rejects.toThrow('invalid storage key')
    expect(unlinkMock).not.toHaveBeenCalled()
  })

  it('signedUrl rejeita key com path traversal', async () => {
    const sut = new DiskStorage(makeEnv())

    await expect(sut.signedUrl('../../x')).rejects.toThrow('invalid storage key')
  })
})
