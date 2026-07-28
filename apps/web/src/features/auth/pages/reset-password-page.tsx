import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import type { ReactElement } from 'react'

import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { useResetPassword } from '@/features/auth/api/auth-api'
import { ApiError } from '@/lib/api-error'

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(12, 'A senha deve ter ao menos 12 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export function ResetPasswordPage(): ReactElement {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const resetPassword = useResetPassword()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  function onSubmit(values: ResetPasswordFormValues) {
    /* c8 ignore start */
    if (!token) return
    /* c8 ignore stop */
    resetPassword.mutate({ token, newPassword: values.newPassword })
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-4 text-center">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Link inválido</h1>
            <p className="text-sm text-muted-foreground">
              O link de redefinição de senha é inválido ou expirou.
            </p>
          </div>
          <Link
            to="/forgot-password"
            className="inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Solicitar novo link
          </Link>
        </div>
      </div>
    )
  }

  const errorMessage =
    resetPassword.error instanceof ApiError
      ? resetPassword.error.message
      : resetPassword.isError
        ? 'Erro ao redefinir a senha. O link pode ter expirado.'
        : null

  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Redefinir senha</h1>
        <p className="text-sm text-muted-foreground">Escolha uma nova senha para sua conta.</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">Nova senha</Label>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            placeholder="Mínimo 12 caracteres"
            aria-describedby={errors.newPassword ? 'new-password-error' : undefined}
            {...register('newPassword')}
          />
          {errors.newPassword && (
            <p id="new-password-error" className="text-xs text-destructive">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Repita a nova senha"
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p id="confirm-password-error" className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
          {resetPassword.isPending ? 'Salvando…' : 'Redefinir senha'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/sign-in" className="underline-offset-4 hover:underline">
            Voltar para login
          </Link>
        </p>
      </form>
    </div>
  )
}
