import type { UniqueEntityID } from '@/core/entities/unique-entity-id'

import { AggregateRoot } from '@/core/entities/aggregate-root'

export interface UserProps {
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  roleIds: string[]
  isActive: boolean
  isProtected: boolean
  createdAt: Date
  updatedAt: Date
}

export class User extends AggregateRoot<UserProps> {
  get name() {
    return this.props.name
  }

  get email() {
    return this.props.email
  }

  get emailVerified() {
    return this.props.emailVerified
  }

  get image() {
    return this.props.image
  }

  get roleIds(): readonly string[] {
    return this.props.roleIds
  }

  get isActive() {
    return this.props.isActive
  }

  get isProtected() {
    return this.props.isProtected
  }

  get createdAt() {
    return this.props.createdAt
  }

  get updatedAt() {
    return this.props.updatedAt
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }

  deactivate(): void {
    this.props.isActive = false
    this.touch()
  }

  reactivate(): boolean {
    if (this.props.isActive) return false
    this.props.isActive = true
    this.touch()
    return true
  }

  updateName(name: string): void {
    this.props.name = name
    this.touch()
  }

  updateEmail(email: string): void {
    this.props.email = email
    this.touch()
  }

  assignRoles(roleIds: string[]): void {
    this.props.roleIds = [...roleIds]
    this.touch()
  }

  static create(
    props: Omit<UserProps, 'isActive' | 'isProtected'> & { isActive?: boolean; isProtected?: boolean },
    id?: UniqueEntityID,
  ) {
    return new User(
      {
        ...props,
        roleIds: [...props.roleIds],
        isActive: props.isActive ?? true,
        isProtected: props.isProtected ?? false,
      },
      id,
    )
  }
}
