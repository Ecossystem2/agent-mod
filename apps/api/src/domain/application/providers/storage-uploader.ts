export interface UploadParams {
  fileName: string
  fileType: string
  body: Buffer
  folder?: string
}

export interface UploadResult {
  key: string
  url: string
}

export abstract class StorageUploader {
  abstract upload(params: UploadParams): Promise<UploadResult>
  abstract delete(key: string): Promise<void>
  abstract signedUrl(key: string, expiresInSeconds: number): Promise<string>
}
