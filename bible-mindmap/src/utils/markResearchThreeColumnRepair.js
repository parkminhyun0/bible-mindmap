function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function compactScaffoldingToggle(root = document) {
  const buttons = [...root.querySelectorAll('.at-modal--context button')];
  buttons.forEach((button) => {
    if (!button.textContent?.includes('학습 스캐폴딩') || button.dataset.scaffoldingCompact === 'true') return;

    const spans = button.querySelectorAll(':scope > span');
    const toggle = spans[spans.length - 1];
    if (!(toggle instanceof HTMLElement)) return;

    button.dataset.scaffoldingCompact = 'true';
    Object.assign(button.style, {
      flex: '1 1 auto',
      padding: '4px 0',
      border: 'none',
      background: 'transparent',
      boxShadow: 'none',
      color: '#92400e',
      borderRadius: '0',
      minHeight: '36px',
    });

    spans.forEach((span, index) => {
      if (!(span instanceof HTMLElement) || span === toggle) return;
      span.style.color = index === 0 ? '#92400e' : '#a16207';
    });

    Object.assign(toggle.style, {
      marginLeft: 'auto',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '32px',
      padding: '5px 10px',
      border: '1px solid #fbbf24',
      borderRadius: '8px',
      background: '#fff7ed',
      color: '#92400e',
      fontSize: '10.5px',
      fontWeight: '800',
      boxShadow: '0 1px 2px rgba(146,64,14,.08)',
    });
  });
}

function prepareThreeColumnLayout(layout) {
  if (!(layout instanceof HTMLElement) || window.matchMedia('(max-width: 900px)').matches) return;

  const left = layout.querySelector(':scope > .mark-research-left');
  const observation = layout.querySelector(':scope > .mark-research-right');
  const research = layout.querySelector(':scope > .mark-research-panel');
  const dividers = [...layout.querySelectorAll(':scope > .mark-research-divider')];
  if (!left || !observation || !research || dividers.length < 2) return;

  layout.dataset.markThreeColumnReady = 'true';
  dividers[0].classList.add('mark-research-divider--body-observation');
  dividers[1].classList.add('mark-research-divider--observation-research');
}

function installDividerCapture() {
  document.addEventListener('pointerdown', (event) => {
    const divider = event.target instanceof Element
      ? event.target.closest('.mark-research-divider')
      : null;
    const layout = divider?.closest('.mark-research-layout-test');
    if (!divider || !layout || window.matchMedia('(max-width: 900px)').matches) return;

    const left = layout.querySelector(':scope > .mark-research-left');
    const observation = layout.querySelector(':scope > .mark-research-right');
    if (!(left instanceof HTMLElement) || !(observation instanceof HTMLElement)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const isFirst = divider.classList.contains('mark-research-divider--body-observation');
    const onMove = (moveEvent) => {
      const layoutRect = layout.getBoundingClientRect();
      if (isFirst) {
        const maxLeft = Math.max(300, layoutRect.width - 560);
        layout.style.setProperty('--mark-left', `${clamp(moveEvent.clientX - layoutRect.left, 300, maxLeft)}px`);
      } else {
        const observationRect = observation.getBoundingClientRect();
        const maxObservation = Math.max(260, layoutRect.right - moveEvent.clientX - 288);
        layout.style.setProperty('--mark-observation', `${clamp(moveEvent.clientX - observationRect.left, 260, maxObservation)}px`);
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
    };

    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
  }, true);
}

export function installMarkResearchThreeColumnRepair() {
  if (typeof window === 'undefined' || window.__markResearchThreeColumnRepairInstalled) return;
  window.__markResearchThreeColumnRepairInstalled = true;

  const sync = () => {
    compactScaffoldingToggle();
    document.querySelectorAll('.mark-research-layout-test').forEach(prepareThreeColumnLayout);
  };

  installDividerCapture();
  const observer = new MutationObserver(() => window.requestAnimationFrame(sync));
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', sync, { passive: true });
  window.requestAnimationFrame(sync);
}
