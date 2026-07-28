import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { AuthProvider } from '@/domain/application/providers/auth-provider'
import { User } from '@/domain/enterprise/entities/user'

export class FakeAuthProvider extends AuthProvider {
  users: User[] = []
  _emailsInUse = new Set<string>()

  async signUp(name: string, email: string, _password: string): Promise<{ user: User | null }> {
    if (this._emailsInUse.has(email)) return { user: null }
    this._emailsInUse.add(email)
    const user = User.create(
      {
        name,
        email,
        emailVerified: false,
        image: null,
        roleIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      new UniqueEntityID(),
    )
    this.users.push(user)
    return { user }
  }

  async signIn(
    email: string,
    _password: string,
  ): Promise<{ user: User; headers?: Record<string, string> } | null> {
    const user = this.users.find((u) => u.email === email)
    return user ? { user } : null
  }

  async deleteUser(userId: string): Promise<void> {
    const user = this.users.find((u) => u.id.toString() === userId)
    if (user) this._emailsInUse.delete(user.email)
    this.users = this.users.filter((u) => u.id.toString() !== userId)
  }
}
