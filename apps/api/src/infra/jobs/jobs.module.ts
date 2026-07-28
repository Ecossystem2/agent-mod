import { Module } from '@nestjs/common'

import { DeadLetterService } from './dead-letter.service'
import { SendEmailProcessor } from './processors/send-email.processor'

@Module({
  providers: [
    DeadLetterService,
    SendEmailProcessor,
  ],
  exports: [DeadLetterService],
})
export class JobsModule {}
