import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/theme.css'

const container = document.getElementById('root')

// A missing mount point is a broken build, not a runtime condition to recover
// from — fail loudly rather than rendering into nothing.
if (!container) {
  throw new Error('Root container #root not found in index.html')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
