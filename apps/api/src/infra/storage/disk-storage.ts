import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'

import { Injectable, Logger } from '@nestjs/common'

import {
  StorageUploader,
  type UploadParams,
  type UploadResult,
} from '@/domain/application/providers/storage-uploader'
import { EnvService } from '@/infra/env/env.service'

@Injectable()
export class DiskStorage extends StorageUploader {
  private readonly logger = new Logger(DiskStorage.name)
  private readonly rootDir: string
  private readonly publicBaseUrl: string

  constructor(private readonly env: EnvService) {
    super()
    this.rootDir = resolve(process.cwd(), 'uploads')
    this.publicBaseUrl = (env.get('STORAGE_PUBLIC_URL') ?? '/uploads').replace(/\/+$/, '')
  }

  async upload({ fileName, body, folder }: UploadParams): Promise<UploadResult> {
    this.assertSafeSegment(fileName)
    if (folder) this.assertSafeSegment(folder)

    const safeName = `${randomUUID()}-${fileName}`
    const relativeKey = [folder, safeName].filter(Boolean).join('/')
    const absolutePath = this.resolveSafe(relativeKey)

    await mkdir(this.resolveSafe(folder ?? ''), { recursive: true })
    await writeFile(absolutePath, body)

    return { key: relativeKey, url: `${this.publicBaseUrl}/${relativeKey}` }
  }

  async delete(key: string): Promise<void> {
    const absolutePath = this.resolveSafe(key)
    await unlink(absolutePath).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') {
        this.logger.warn(`falha ao deletar ${key}: ${err.message}`)
        throw err
      }
    })
  }

  async signedUrl(key: string): Promise<string> {
    this.resolveSafe(key)
    return `${this.publicBaseUrl}/${key}`
  }

  private assertSafeSegment(segment: string): void {
    // Cada segmento (fileName/folder) é UM componente de path — sem separadores
    // (`/` e `\`), `..` ou NUL. `resolveSafe` é o backstop que impede escapar do
    // rootDir; isto é a camada de defesa antes dele (port genérico = input hostil).
    if (
      segment.includes('..') ||
      segment.includes('/') ||
      segment.includes('\\') ||
      segment.includes('\0')
    ) {
      throw new Error('invalid storage key')
    }
  }

  private resolveSafe(key: string): string {
    const absolutePath = resolve(this.rootDir, key)
    if (absolutePath !== this.rootDir && !absolutePath.startsWith(this.rootDir + sep)) {
      throw new Error('invalid storage key')
    }
    return absolutePath
  }
}
