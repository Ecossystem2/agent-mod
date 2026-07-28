import { Global, Module } from '@nestjs/common'

import { BcryptHasher } from './bcrypt-hasher'

import { HashComparer } from '@/domain/application/cryptography/hash-comparer'
import { HashGenerator } from '@/domain/application/cryptography/hash-generator'


@Global()
@Module({
  providers: [
    BcryptHasher,
    { provide: HashGenerator, useExisting: BcryptHasher },
    { provide: HashComparer, useExisting: BcryptHasher },
  ],
  exports: [HashGenerator, HashComparer],
})
export class CryptographyModule {}
