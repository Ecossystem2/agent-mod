import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import type { ReactElement } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForgotPassword } from '@/features/auth/api/auth-api'
import { ApiError } from '@/lib/api-error'

const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage(): ReactElement {
  const forgotPassword = useForgotPassword()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  function onSubmit(values: ForgotPasswordFormValues) {
    forgotPassword.mutate(values)
  }

  const errorMessage =
    forgotPassword.error instanceof ApiError
      ? forgotPassword.error.message
      : forgotPassword.isError
        ? 'Erro ao enviar o e-mail. Tente novamente.'
        : null

  if (forgotPassword.isSuccess) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-4 text-center">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">E-mail enviado!</h1>
            <p className="text-sm text-muted-foreground">
              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </p>
          </div>
          <Link
            to="/sign-in"
            className="inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Voltar para login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Esqueceu a senha?</h1>
        <p className="text-sm text-muted-foreground">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" className="text-xs text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
          {forgotPassword.isPending ? 'Enviando…' : 'Enviar link de redefinição'}
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
