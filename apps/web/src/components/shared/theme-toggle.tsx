import { Monitor, Moon, Sun } from 'lucide-react'

import type { ReactElement } from 'react'

import { Button } from '@/components/ui/button'
import { useTheme, type Theme } from '@/providers/theme-context'

const NEXT: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' }
const LABEL: Record<Theme, string> = {
  light: 'Tema: claro (clique para escuro)',
  dark: 'Tema: escuro (clique para sistema)',
  system: 'Tema: sistema (clique para claro)',
}

export function ThemeToggle(): ReactElement {
  const { theme, setTheme } = useTheme()
  const Icon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={LABEL[theme]}
      title={LABEL[theme]}
      onClick={() => {
        setTheme(NEXT[theme])
      }}
    >
      <Icon />
    </Button>
  )
}
