import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import App from './App'
import './styles/tokens.css'
import './styles/global.css'
import './styles/design-system.css'
import './styles/shell.css'
import './styles/showcase.css'
import './styles/public.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
