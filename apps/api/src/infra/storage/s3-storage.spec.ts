import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EnvService } from '@/infra/env/env.service'

const sendMock = vi.fn()
const s3ClientMock = vi.fn()
const getSignedUrlMock = vi.fn()

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = sendMock
    constructor(config: unknown) {
      s3ClientMock(config)
    }
  },
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  },
  GetObjectCommand: class {
    constructor(public input: unknown) {}
  },
  DeleteObjectCommand: class {
    constructor(public input: unknown) {}
  },
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]): unknown => getSignedUrlMock(...args),
}))

const { S3Storage } = await import('./s3-storage')

function makeEnv(overrides: Record<string, unknown> = {}): EnvService {
  const values: Record<string, unknown> = {
    STORAGE_BUCKET: 'my-bucket',
    STORAGE_REGION: 'us-east-1',
    STORAGE_ENDPOINT: undefined,
    STORAGE_ACCESS_KEY_ID: 'AKIA',
    STORAGE_SECRET_ACCESS_KEY: 'secret',
    STORAGE_PUBLIC_URL: undefined,
    ...overrides,
  }
  return { get: (key: string) => values[key] } as unknown as EnvService
}

describe('S3Storage', () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue(undefined)
    s3ClientMock.mockReset()
    getSignedUrlMock.mockReset().mockResolvedValue('https://signed.example/url')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lança quando STORAGE_BUCKET não está configurado', () => {
    expect(() => {
      new S3Storage(makeEnv({ STORAGE_BUCKET: undefined }))
    }).toThrow('STORAGE_BUCKET is required')
  })

  it('configura credentials e forcePathStyle com endpoint', () => {
    new S3Storage(makeEnv({ STORAGE_ENDPOINT: 'https://r2.example.com' }))

    expect(s3ClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'us-east-1',
        endpoint: 'https://r2.example.com',
        forcePathStyle: true,
        credentials: { accessKeyId: 'AKIA', secretAccessKey: 'secret' },
      }),
    )
  })

  it('usa region "auto" e credentials undefined sem chaves', () => {
    new S3Storage(
      makeEnv({
        STORAGE_REGION: undefined,
        STORAGE_ACCESS_KEY_ID: undefined,
        STORAGE_SECRET_ACCESS_KEY: undefined,
      }),
    )

    expect(s3ClientMock).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'auto', forcePathStyle: false, credentials: undefined }),
    )
  })

  it('upload com publicBaseUrl monta a url pública e remove barra final', async () => {
    const sut = new S3Storage(makeEnv({ STORAGE_PUBLIC_URL: 'https://cdn.example.com/' }))

    const result = await sut.upload({
      fileName: 'pic.png',
      fileType: 'image/png',
      body: Buffer.from('x'),
      folder: 'avatars',
    })

    expect(result.key).toMatch(/^avatars\/.+-pic\.png$/)
    expect(result.url).toBe(`https://cdn.example.com/${result.key}`)
    expect(sendMock).toHaveBeenCalledOnce()
    expect(getSignedUrlMock).not.toHaveBeenCalled()
  })

  it('upload sem publicBaseUrl e sem folder usa signedUrl', async () => {
    const sut = new S3Storage(makeEnv())

    const result = await sut.upload({
      fileName: 'doc.pdf',
      fileType: 'application/pdf',
      body: Buffer.from('x'),
    })

    expect(result.key).toMatch(/^[0-9a-f-]+-doc\.pdf$/)
    expect(result.url).toBe('https://signed.example/url')
    expect(getSignedUrlMock).toHaveBeenCalledOnce()
  })

  it('delete envia DeleteObjectCommand', async () => {
    const sut = new S3Storage(makeEnv())

    await sut.delete('avatars/x.png')

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ input: { Bucket: 'my-bucket', Key: 'avatars/x.png' } }),
    )
  })

  it('signedUrl delega para getSignedUrl', async () => {
    const sut = new S3Storage(makeEnv())

    const url = await sut.signedUrl('key', 120)

    expect(url).toBe('https://signed.example/url')
    expect(getSignedUrlMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ input: { Bucket: 'my-bucket', Key: 'key' } }),
      { expiresIn: 120 },
    )
  })

  it('upload rejeita fileName com path traversal', async () => {
    const sut = new S3Storage(makeEnv())

    await expect(
      sut.upload({ fileName: '../../etc/passwd', fileType: 'text/plain', body: Buffer.from('x') }),
    ).rejects.toThrow('invalid storage key')
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('upload rejeita folder com path traversal', async () => {
    const sut = new S3Storage(makeEnv())

    await expect(
      sut.upload({
        fileName: 'ok.png',
        fileType: 'image/png',
        body: Buffer.from('x'),
        folder: '../secret',
      }),
    ).rejects.toThrow('invalid storage key')
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('upload rejeita fileName com separador invalido', async () => {
    const sut = new S3Storage(makeEnv())

    await expect(
      sut.upload({ fileName: 'a\\b', fileType: 'text/plain', body: Buffer.from('x') }),
    ).rejects.toThrow('invalid storage key')
  })

  it('upload rejeita fileName com null byte', async () => {
    const sut = new S3Storage(makeEnv())

    await expect(
      sut.upload({ fileName: 'a\0b', fileType: 'text/plain', body: Buffer.from('x') }),
    ).rejects.toThrow('invalid storage key')
  })

  it('delete rejeita key com path traversal', async () => {
    const sut = new S3Storage(makeEnv())

    await expect(sut.delete('../../x')).rejects.toThrow('invalid storage key')
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('signedUrl rejeita key com path traversal', async () => {
    const sut = new S3Storage(makeEnv())

    await expect(sut.signedUrl('../x', 60)).rejects.toThrow('invalid storage key')
    expect(getSignedUrlMock).not.toHaveBeenCalled()
  })
})
