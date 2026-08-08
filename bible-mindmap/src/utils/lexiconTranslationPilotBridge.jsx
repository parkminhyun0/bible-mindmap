import { createRoot } from 'react-dom/client';
import LexiconTranslationDrawer from '../components/LexiconTranslationDrawer.jsx';
import { getLexiconTranslation } from '../data/lexiconTranslationPilot.js';

const PILOT_SELECTOR = '[role="dialog"][aria-label^="원어 사전"]';
const BUTTON_ATTR = 'data-lexicon-translation-toggle';
const DRAWER_ROOT_ATTR = 'data-lexicon-translation-pilot-root';

function detectStrong(dialog) {
  const strongLink = [...dialog.querySelectorAll('a')].find((link) => {
    const text = link.textContent || '';
    return /\bH0*776\b/i.test(text) || /\/hebrew\/776\.htm/i.test(link.getAttribute('href') || '');
  });
  return strongLink ? 'H776' : null;
}

function findDefinitionToolbar(dialog) {
  const label = [...dialog.querySelectorAll('span')].find(
    (node) => node.textContent?.trim() === 'HEBREW LEXICON'
  );
  return label?.parentElement || null;
}

function styleToggleButton(button, open) {
  const mobile = window.innerWidth < 768;
  const styleState = `${open ? 'open' : 'closed'}:${mobile ? 'mobile' : 'desktop'}`;
  if (button.dataset.lexiconTranslationStyleState === styleState) return;

  Object.assign(button.style, {
    marginLeft: 'auto',
    minHeight: mobile ? '36px' : '30px',
    padding: mobile ? '7px 10px' : '5px 9px',
    borderRadius: '8px',
    border: '1px solid #f59e0b',
    background: open ? '#f59e0b' : '#fffbeb',
    color: open ? '#ffffff' : '#92400e',
    fontSize: '10px',
    fontWeight: '800',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
  });
  const nextText = open ? '🇰🇷 번역 닫기' : `🇰🇷 한글 번역 ${mobile ? '›' : '→'}`;
  if (button.textContent !== nextText) button.textContent = nextText;
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
  button.dataset.lexiconTranslationStyleState = styleState;
}

function readPopupRect(dialog) {
  const rect = dialog.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    maxHeight: rect.height,
    viewportWidth: window.innerWidth,
    margin: 12,
  };
}

export function installLexiconTranslationPilotBridge() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const states = new Map();
  let scheduled = false;

  const setMobileDialogHidden = (state, hidden) => {
    const shouldHide = hidden && window.innerWidth < 768;
    if (shouldHide) {
      if (!state.mobileSnapshot) {
        state.mobileSnapshot = {
          ariaHidden: state.dialog.getAttribute('aria-hidden'),
          pointerEvents: state.dialog.style.pointerEvents,
        };
      }
      state.dialog.setAttribute('aria-hidden', 'true');
      state.dialog.style.pointerEvents = 'none';
      return;
    }

    if (state.mobileSnapshot) {
      if (state.mobileSnapshot.ariaHidden == null) state.dialog.removeAttribute('aria-hidden');
      else state.dialog.setAttribute('aria-hidden', state.mobileSnapshot.ariaHidden);
      state.dialog.style.pointerEvents = state.mobileSnapshot.pointerEvents;
      state.mobileSnapshot = null;
    }
  };

  const renderState = (state) => {
    const isMobile = window.innerWidth < 768;
    setMobileDialogHidden(state, state.open);
    styleToggleButton(state.button, state.open);
    state.root.render(
      <LexiconTranslationDrawer
        open={state.open}
        translation={state.translation}
        isMobile={isMobile}
        popupRect={readPopupRect(state.dialog)}
        onClose={() => {
          state.open = false;
          renderState(state);
        }}
        zIndex={(Number.parseInt(window.getComputedStyle(state.dialog).zIndex, 10) || 2501) + 1}
      />
    );
  };

  const destroyState = (dialog) => {
    const state = states.get(dialog);
    if (!state) return;
    setMobileDialogHidden(state, false);
    state.button?.remove();
    state.root.unmount();
    state.host.remove();
    states.delete(dialog);
  };

  const ensureState = (dialog) => {
    const strong = detectStrong(dialog);
    const translation = getLexiconTranslation(strong);
    const toolbar = findDefinitionToolbar(dialog);
    if (!translation || !toolbar || !dialog.isConnected) {
      destroyState(dialog);
      return;
    }

    let state = states.get(dialog);
    if (!state) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute(BUTTON_ATTR, translation.strong);
      button.setAttribute('aria-controls', `lexicon-translation-drawer-${translation.strong}`);
      button.title = 'BDB 영어 원문 옆에 한국어 번역을 엽니다';

      const host = document.createElement('div');
      host.setAttribute(DRAWER_ROOT_ATTR, translation.strong);
      document.body.appendChild(host);

      state = {
        dialog,
        toolbar,
        button,
        host,
        root: createRoot(host),
        translation,
        open: false,
        mobileSnapshot: null,
        rendered: false,
      };
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        state.open = !state.open;
        renderState(state);
      });
      states.set(dialog, state);
    }

    const toolbarChanged = state.toolbar !== toolbar;
    if (toolbarChanged) state.toolbar = toolbar;
    const buttonMissing = !toolbar.contains(state.button);
    if (buttonMissing) toolbar.appendChild(state.button);
    styleToggleButton(state.button, state.open);
    if (!state.rendered || toolbarChanged || buttonMissing) {
      state.rendered = true;
      renderState(state);
    }
  };

  const sync = () => {
    scheduled = false;
    const dialogs = [...document.querySelectorAll(PILOT_SELECTOR)];
    for (const dialog of dialogs) ensureState(dialog);
    for (const dialog of [...states.keys()]) {
      if (!dialogs.includes(dialog) || !dialog.isConnected) destroyState(dialog);
    }
  };

  const scheduleSync = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(sync);
  };

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-label'],
  });

  let geometryFrame = 0;
  const refreshOpenGeometry = () => {
    if (geometryFrame) return;
    geometryFrame = window.requestAnimationFrame(() => {
      geometryFrame = 0;
      for (const state of states.values()) {
        if (state.open) renderState(state);
      }
    });
  };
  const onResize = () => {
    for (const state of states.values()) renderState(state);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', refreshOpenGeometry);

  const onEscape = (event) => {
    if (event.key !== 'Escape') return;
    const active = [...states.values()].find((state) => state.open);
    if (!active) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    active.open = false;
    renderState(active);
  };
  window.addEventListener('keydown', onEscape, true);

  scheduleSync();

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('mousemove', refreshOpenGeometry);
    window.removeEventListener('keydown', onEscape, true);
    if (geometryFrame) window.cancelAnimationFrame(geometryFrame);
    for (const dialog of [...states.keys()]) destroyState(dialog);
  };
}
