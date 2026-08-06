const ROOT = typeof document !== 'undefined' ? document.documentElement : null;

let installedCleanup = null;

function setCssPixel(name, value) {
  if (!ROOT || !Number.isFinite(value)) return;
  const next = `${Math.max(0, Math.round(value * 100) / 100)}px`;
  if (ROOT.style.getPropertyValue(name) !== next) ROOT.style.setProperty(name, next);
}

/**
 * Publishes the browser's visual viewport rectangle as CSS variables.
 *
 * iOS keeps window.innerWidth tied to the layout viewport while pinch zoom,
 * browser chrome changes, and visual viewport panning alter the actually
 * visible rectangle. Fixed mobile sheets can use these variables without
 * installing their own duplicate high-frequency listeners.
 */
export function installVisualViewportCssVars() {
  if (typeof window === 'undefined' || !ROOT) return () => {};
  if (installedCleanup) return installedCleanup;

  let frame = 0;

  const sync = () => {
    frame = 0;
    const viewport = window.visualViewport;
    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    const left = viewport?.offsetLeft || 0;
    const top = viewport?.offsetTop || 0;
    const conceptSheetHeight = Math.min(height * 0.84, 720);
    const searchSheetHeight = height * 0.86;

    setCssPixel('--app-visual-viewport-left', left);
    setCssPixel('--app-visual-viewport-top', top);
    setCssPixel('--app-visual-viewport-width', width);
    setCssPixel('--app-visual-viewport-height', height);
    setCssPixel('--canonical-concept-sheet-height', conceptSheetHeight);
    setCssPixel('--canonical-concept-sheet-top', top + height - conceptSheetHeight);
    setCssPixel('--canonical-search-sheet-height', searchSheetHeight);
    setCssPixel('--canonical-search-sheet-top', top + height - searchSheetHeight);
  };

  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(sync);
  };

  sync();
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule);
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  window.visualViewport?.addEventListener('scroll', schedule, { passive: true });

  installedCleanup = () => {
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
    window.visualViewport?.removeEventListener('scroll', schedule);
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    installedCleanup = null;
  };

  return installedCleanup;
}
