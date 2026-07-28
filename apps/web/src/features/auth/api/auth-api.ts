import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api } from '@/lib/api-client'

interface SignInInput {
  email: string
  password: string
}

interface ForgotPasswordInput {
  email: string
}

interface ResetPasswordInput {
  token: string
  newPassword: string
}

export function useSignIn() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: SignInInput) => {
      const { data } = await api.post('/api/auth/sign-in/email', {
        email: input.email,
        password: input.password,
      })
      return data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['auth', 'session'] })
      void navigate('/app')
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: ForgotPasswordInput) => {
      const { data } = await api.post('/api/auth/forget-password', {
        email: input.email,
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return data
    },
  })
}

export function useResetPassword() {
  const navigate = useNavigate()

  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: async (input: ResetPasswordInput) => {
      const { data } = await api.post('/api/auth/reset-password', {
        token: input.token,
        newPassword: input.newPassword,
      })
      return data
    },
    onSuccess: () => {
      void navigate('/sign-in')
    },
  })
}
