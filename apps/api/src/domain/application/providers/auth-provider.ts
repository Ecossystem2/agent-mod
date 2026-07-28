import type { User } from '@/domain/enterprise/entities/user'

export abstract class AuthProvider {
  abstract signUp(name: string, email: string, password: string): Promise<{ user: User | null }>
  abstract signIn(
    email: string,
    password: string,
  ): Promise<{ user: User; headers?: Record<string, string> } | null>
  abstract deleteUser(userId: string): Promise<void>
}
