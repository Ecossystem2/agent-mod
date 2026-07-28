export interface HttpSuccess<T> {
  data: T
}

export interface HttpFailure<E = string> {
  error: {
    kind: E
    message: string
    /** Detalhes opcionais (ex: campos inválidos do Zod). */
    details?: unknown
  }
}

export type HttpResponse<T, E = string> = HttpSuccess<T> | HttpFailure<E>
