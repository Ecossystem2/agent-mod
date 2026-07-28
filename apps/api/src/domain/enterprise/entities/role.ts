import type { Permission } from '@/core/auth/permissions'
import type { UniqueEntityID } from '@/core/entities/unique-entity-id'

import { AggregateRoot } from '@/core/entities/aggregate-root'

export interface RoleProps {
  name: string
  description: string | null
  isSystem: boolean
  permissions: Permission[]
  createdAt: Date
  updatedAt: Date
}

export class Role extends AggregateRoot<RoleProps> {
  get name() {
    return this.props.name
  }

  get description() {
    return this.props.description
  }

  get isSystem() {
    return this.props.isSystem
  }

  get permissions(): readonly Permission[] {
    return this.props.permissions
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

  setPermissions(permissions: Permission[]): void {
    this.props.permissions = [...permissions]
    this.touch()
  }

  updateName(name: string): void {
    this.props.name = name
    this.touch()
  }

  updateDescription(description: string | null): void {
    this.props.description = description
    this.touch()
  }

  static create(props: RoleProps, id?: UniqueEntityID): Role {
    return new Role({ ...props, permissions: [...props.permissions] }, id)
  }
}
