import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'

import { AuthModule } from './auth/auth.module'
import { CacheModule } from './cache/cache.module'
import { CryptographyModule } from './cryptography/cryptography.module'
import { DatabaseModule } from './database/database.module'
import { EnvModule } from './env/env.module'
import { EventModule } from './event/event.module'
import { AllExceptionsFilter } from './filters/all-exceptions.filter'
import { HttpModule } from './http/http.module'
import { JobsModule } from './jobs/jobs.module'
import { MailModule } from './mail/mail.module'
import { QueueModule } from './queue/queue.module'
import { StorageModule } from './storage/storage.module'

@Module({
  imports: [
    EnvModule,
    DatabaseModule,
    CacheModule,
    EventModule,
    CryptographyModule,
    AuthModule,
    StorageModule,
    MailModule,
    QueueModule,
    JobsModule,
    HttpModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
