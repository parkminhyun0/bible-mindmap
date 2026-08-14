import { createRoot } from 'react-dom/client';
import LexiconTranslationDrawer from '../components/LexiconTranslationDrawer.jsx';
import { lexiconApprovalLoader, normalizeLexiconStrong } from '../data/lexiconApprovalLoader.js';
import { getLexiconTranslation } from '../data/lexiconTranslationPilot.js';

const PILOT_SELECTOR = '[role="dialog"][aria-label^="원어 사전"]';
const BUTTON_ATTR = 'data-lexicon-translation-toggle';
const DRAWER_ROOT_ATTR = 'data-lexicon-translation-pilot-root';

// Approved-entry channel. This bridge is the sole owner of the detailed
// approved-lexicon loader; downstream consumers (e.g. LexiconPopup) read
// resolved entries through subscribeApprovedEntry without importing the loader
// themselves, preserving the P4 read-only delivery SSOT contract enforced by
// scripts/verify-lexicon-delivery-loader.mjs.
const approvedEntryCache = new Map();
const approvedEntrySubscribers = new Map();

function approvedEntryKey(strong, lemma) {
  return `${strong}|${lemma || ''}`;
}

function notifyApprovedEntry(key, value) {
  const subscribers = approvedEntrySubscribers.get(key);
  if (!subscribers) return;
  for (const callback of subscribers) {
    try { callback(value); } catch { /* isolate subscriber failures */ }
  }
}

function loadApprovedEntryIntoCache(strong, lemma) {
  const key = approvedEntryKey(strong, lemma);
  const cached = approvedEntryCache.get(key);
  if (cached && typeof cached.then === 'function') return cached;
  if (cached !== undefined) return Promise.resolve(cached);
  const load = lexiconApprovalLoader.loadApprovedEntry(strong, { lemma })
    .then((entry) => {
      const resolved = entry || null;
      approvedEntryCache.set(key, resolved);
      notifyApprovedEntry(key, resolved);
      return resolved;
    })
    .catch(() => {
      approvedEntryCache.set(key, null);
      notifyApprovedEntry(key, null);
      return null;
    });
  approvedEntryCache.set(key, load);
  return load;
}

export function subscribeApprovedEntry(strong, lemma, callback) {
  if (!strong || typeof callback !== 'function') return () => {};
  const key = approvedEntryKey(strong, lemma);
  const subscribers = approvedEntrySubscribers.get(key) || new Set();
  subscribers.add(callback);
  approvedEntrySubscribers.set(key, subscribers);

  const cached = approvedEntryCache.get(key);
  if (cached !== undefined && !(cached && typeof cached.then === 'function')) {
    Promise.resolve().then(() => {
      if (approvedEntrySubscribers.get(key)?.has(callback)) callback(cached);
    });
  } else if (cached === undefined) {
    loadApprovedEntryIntoCache(strong, lemma);
  }

  return () => {
    const set = approvedEntrySubscribers.get(key);
    if (!set) return;
    set.delete(callback);
    if (!set.size) approvedEntrySubscribers.delete(key);
  };
}

function detectStrong(dialog) {
  for (const link of dialog.querySelectorAll('a')) {
    const text = link.textContent || '';
    const textMatch = text.match(/\b([HG])0*(\d+)([A-Za-z]?)\b/i);
    if (textMatch) return normalizeLexiconStrong(`${textMatch[1]}${textMatch[2]}${textMatch[3] || ''}`);

    const href = link.getAttribute('href') || '';
    const hrefMatch = href.match(/\/(hebrew|greek)\/(\d+)([A-Za-z]?)\.htm/i);
    if (hrefMatch) {
      return normalizeLexiconStrong(`${hrefMatch[1].toLowerCase() === 'hebrew' ? 'H' : 'G'}${hrefMatch[2]}${hrefMatch[3] || ''}`);
    }
  }
  return null;
}

function detectLemma(dialog) {
  const label = [...dialog.querySelectorAll('span')].find((node) => node.textContent?.trim() === '사전형');
  if (!label?.parentElement) return null;
  const value = [...label.parentElement.querySelectorAll('span')]
    .find((node) => node !== label && node.textContent?.trim());
  return value?.textContent?.trim() || null;
}

function findDefinitionToolbar(dialog) {
  const label = [...dialog.querySelectorAll('span')].find((node) => {
    const text = node.textContent?.trim();
    return text === 'HEBREW LEXICON' || text === 'GREEK LEXICON';
  });
  return label?.parentElement || null;
}

function styleToggleButton(button, open) {
  const mobile = window.innerWidth < 768;
  const styleState = `${open ? 'open' : 'closed'}:${mobile ? 'mobile' : 'desktop'}`;
  if (button.dataset.lexiconTranslationStyleState === styleState) return;

  Object.assign(button.style, {
    marginLeft: 'auto',
    minHeight: mobile ? '44px' : '34px',
    padding: mobile ? '8px 11px' : '6px 10px',
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
  const nextText = open ? '📚 사전 닫기' : `📚 한글 사전 ${mobile ? '›' : '→'}`;
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
  const pending = new Map();
  const unavailable = new Map();
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
        approvedEntry={state.approvedEntry}
        enrichment={state.enrichment}
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

  const createState = (dialog, toolbar, strong, lemma, approvedEntry) => {
    if (!dialog.isConnected || !toolbar.isConnected) return null;

    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute(BUTTON_ATTR, strong);
    button.setAttribute('aria-controls', `lexicon-translation-drawer-${approvedEntry.identity.canonicalStrong}`);
    button.title = '승인된 한글 사전 전체 정의와 BDB 보조정보를 엽니다';

    const host = document.createElement('div');
    host.setAttribute(DRAWER_ROOT_ATTR, approvedEntry.identity.canonicalStrong);
    document.body.appendChild(host);

    const state = {
      strong,
      lemma,
      dialog,
      toolbar,
      button,
      host,
      root: createRoot(host),
      approvedEntry,
      enrichment: getLexiconTranslation(approvedEntry.identity.canonicalStrong) || getLexiconTranslation(strong),
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
    return state;
  };

  const ensureState = (dialog) => {
    const strong = detectStrong(dialog);
    const lemma = detectLemma(dialog);
    const toolbar = findDefinitionToolbar(dialog);
    if (!strong || !toolbar || !dialog.isConnected) {
      destroyState(dialog);
      return;
    }

    let state = states.get(dialog);
    if (state && (state.strong !== strong || state.lemma !== lemma)) {
      destroyState(dialog);
      state = null;
    }

    const lookupKey = `${strong}|${lemma || ''}`;
    if (!state) {
      if (unavailable.get(dialog) === lookupKey || pending.has(dialog)) return;
      const load = loadApprovedEntryIntoCache(strong, lemma)
        .then((approvedEntry) => {
          if (!approvedEntry) {
            unavailable.set(dialog, lookupKey);
            return;
          }
          unavailable.delete(dialog);
          const currentStrong = detectStrong(dialog);
          const currentLemma = detectLemma(dialog);
          const currentToolbar = findDefinitionToolbar(dialog);
          if (currentStrong !== strong || currentLemma !== lemma || !currentToolbar || !dialog.isConnected) return;
          const created = createState(dialog, currentToolbar, strong, lemma, approvedEntry);
          if (created) renderState(created);
        })
        .catch(() => {
          unavailable.set(dialog, lookupKey);
        })
        .finally(() => {
          pending.delete(dialog);
        });
      pending.set(dialog, load);
      return;
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
    pending.clear();
    unavailable.clear();
  };
}
