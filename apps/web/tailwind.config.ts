import preset from '@apps/tailwind-config/preset.cjs'

import type { Config } from 'tailwindcss'


export default {
  presets: [preset],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
} satisfies Config
