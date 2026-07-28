import { render } from '@react-email/components'

import type { ReactElement } from 'react'

export async function renderEmail(element: ReactElement): Promise<string> {
  return render(element)
}
