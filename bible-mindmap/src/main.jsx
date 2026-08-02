import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme/appleChrome.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'

const root = document.getElementById('root')

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)

window.requestAnimationFrame(() => {
  document.getElementById('boot-fallback')?.remove()
})
