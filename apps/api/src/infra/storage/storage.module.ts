import { Global, Module } from '@nestjs/common'

import { DiskStorage } from './disk-storage'
import { S3Storage } from './s3-storage'

import { StorageUploader } from '@/domain/application/providers/storage-uploader'
import { EnvModule } from '@/infra/env/env.module'
import { EnvService } from '@/infra/env/env.service'

@Global()
@Module({
  imports: [EnvModule],
  providers: [
    {
      provide: StorageUploader,
      useFactory: (env: EnvService): StorageUploader => {
        const driver = env.get('STORAGE_DRIVER')
        return driver === 'disk' ? new DiskStorage(env) : new S3Storage(env)
      },
      inject: [EnvService],
    },
  ],
  exports: [StorageUploader],
})
export class StorageModule {}
