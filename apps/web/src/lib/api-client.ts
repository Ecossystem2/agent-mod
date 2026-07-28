import axios, { type AxiosError, type AxiosInstance } from 'axios'

import { env } from '@/env'
import { ApiError } from '@/lib/api-error'

// Dev: baseURL vazia → request relativa cai no proxy do Vite (mesmo origin → cookie SameSite=Lax viaja).
// Prod: usa VITE_API_BASE_URL (origin da API) — obrigatório quando front e API ficam em domínios separados.
// Separado por domínio exige também cookie SameSite=None; Secure + CORS credentials no backend.
export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.DEV ? '' : env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 15_000,
})

export function onResponseError(err: AxiosError): Promise<never> {
  if (err.response?.status === 401 && typeof window !== 'undefined') {
    const next = encodeURIComponent(window.location.pathname + window.location.search)
    if (!window.location.pathname.startsWith('/sign-in')) {
      window.location.assign(`/sign-in?next=${next}`)
    }
  }
  return Promise.reject(ApiError.fromAxiosError(err))
}

api.interceptors.response.use((res) => res, onResponseError)
