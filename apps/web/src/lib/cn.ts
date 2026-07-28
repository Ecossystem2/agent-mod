import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Helper canônico do shadcn — combine class names + dedup utilitários do Tailwind.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
