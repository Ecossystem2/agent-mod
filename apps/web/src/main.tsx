import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/inter'

import { App } from './App'
import './env'
import './styles/globals.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root não encontrado em index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
