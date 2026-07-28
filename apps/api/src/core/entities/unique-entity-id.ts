import { randomUUID } from 'node:crypto'

export class UniqueEntityID {
  private readonly _value: string

  constructor(value?: string) {
    this._value = value ?? randomUUID()
  }

  toString(): string {
    return this._value
  }

  toValue(): string {
    return this._value
  }

  equals(id: UniqueEntityID): boolean {
    return id.toValue() === this._value
  }
}
