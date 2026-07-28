import { UniqueEntityID } from './unique-entity-id'

export abstract class Entity<Props> {
  private readonly _id: UniqueEntityID
  protected props: Props

  protected constructor(props: Props, id?: UniqueEntityID) {
    this.props = props
    this._id = id ?? new UniqueEntityID()
  }

  get id(): UniqueEntityID {
    return this._id
  }

  equals(entity: Entity<unknown>): boolean {
    if (entity === this) return true
    if (entity.id.equals(this._id)) return true
    return false
  }
}
