import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import { applyFontSize, initialFontSize } from './services/shared'
import App from './App'
import './styles/tokens.css'
import './styles/global.css'
import './styles/design-system.css'
import './styles/shell.css'
import './styles/showcase.css'
import './styles/public.css'
import './styles/shared.css'

/* Phase 6: the saved text-size choice applies from the first paint. */
applyFontSize(initialFontSize())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
