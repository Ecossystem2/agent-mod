export abstract class UseCaseError<T extends string = string> extends Error {
  abstract readonly kind: T

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}
