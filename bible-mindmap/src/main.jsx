import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme/appleChrome.css'
import './theme/appleCanvas.css'
import './theme/appleModalInterior.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'

const THEME_STORAGE_KEY = 'bible-mindmap-theme'

function applyInitialTheme() {
  let theme = 'light'
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme === 'dark') theme = 'dark'
  } catch {
    // 저장소를 사용할 수 없으면 화이트 모드를 기본값으로 유지한다.
  }
  document.documentElement.dataset.theme = theme
}

applyInitialTheme()

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
