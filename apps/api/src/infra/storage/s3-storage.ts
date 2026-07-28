import { randomUUID } from 'node:crypto'

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Injectable } from '@nestjs/common'

import {
  StorageUploader,
  type UploadParams,
  type UploadResult,
} from '@/domain/application/providers/storage-uploader'
import { EnvService } from '@/infra/env/env.service'

@Injectable()
export class S3Storage extends StorageUploader {
  private readonly client: S3Client
  private readonly bucket: string
  private readonly publicBaseUrl: string | null

  constructor(private readonly env: EnvService) {
    super()
    const bucket = env.get('STORAGE_BUCKET')
    if (!bucket) {
      throw new Error('STORAGE_BUCKET is required when STORAGE_DRIVER is s3 or r2')
    }
    this.bucket = bucket

    const endpoint = env.get('STORAGE_ENDPOINT')
    const accessKeyId = env.get('STORAGE_ACCESS_KEY_ID')
    const secretAccessKey = env.get('STORAGE_SECRET_ACCESS_KEY')

    this.client = new S3Client({
      region: env.get('STORAGE_REGION') ?? 'auto',
      endpoint,
      forcePathStyle: !!endpoint,
      credentials:
        accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    })

    this.publicBaseUrl = env.get('STORAGE_PUBLIC_URL')?.replace(/\/+$/, '') ?? null
  }

  async upload({ fileName, fileType, body, folder }: UploadParams): Promise<UploadResult> {
    this.assertSafeSegment(fileName)
    if (folder) this.assertSafeSegment(folder)

    const key = [folder, `${randomUUID()}-${fileName}`].filter(Boolean).join('/')

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: fileType,
      }),
    )

    const url = this.publicBaseUrl
      ? `${this.publicBaseUrl}/${key}`
      : await this.signedUrl(key, 60 * 60)

    return { key, url }
  }

  async delete(key: string): Promise<void> {
    this.assertSafeSegment(key)
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async signedUrl(key: string, expiresInSeconds: number): Promise<string> {
    this.assertSafeSegment(key)
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    )
  }

  private assertSafeSegment(segment: string): void {
    if (segment.includes('..') || segment.includes('\\') || segment.includes('\0')) {
      throw new Error('invalid storage key')
    }
  }
}
