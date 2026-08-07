import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme/appleChrome.css'
import './theme/sidebarScrollFix.css'
import './theme/appleCanvas.css'
import './theme/appleModalInterior.css'
import './theme/contextBibleMobileFix.css'
import './theme/contextBibleHeaderContrast.css'
import './theme/markResearchLayerTest.css'
import './theme/markResearchThreeColumnDirect.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import LegacyModalAccessibilityBridge from './components/LegacyModalAccessibilityBridge.jsx'
import { installVisitorCounterRepair } from './utils/visitorCounterRepair.js'
import { installCrossReferenceToolbarBridge } from './utils/crossReferenceToolbarBridge.js'
import { installMarkResearchLayerBridge } from './utils/markResearchLayerBridge.js'
import { installMarkResearchThreeColumnRepair } from './utils/markResearchThreeColumnRepair.js'
import { installLexiconTranslationPilotBridge } from './utils/lexiconTranslationPilotBridge.jsx'
import { installWordSearchAlignmentPilotBridge } from './utils/wordSearchAlignmentPilotBridge.jsx'

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
installVisitorCounterRepair()
installCrossReferenceToolbarBridge()
installMarkResearchLayerBridge()
installMarkResearchThreeColumnRepair()
installLexiconTranslationPilotBridge()
installWordSearchAlignmentPilotBridge()

const root = document.getElementById('root')

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <LegacyModalAccessibilityBridge />
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)

window.requestAnimationFrame(() => {
  document.getElementById('boot-fallback')?.remove()
})
