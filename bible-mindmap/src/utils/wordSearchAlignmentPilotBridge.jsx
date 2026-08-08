import { createRoot } from 'react-dom/client';
import WordSearchAlignmentPilot from '../components/WordSearchAlignmentPilot.jsx';

const DIALOG_SELECTOR = '[role="dialog"][aria-label="원어 성경 다언어 검색"]';
const HOST_ATTR = 'data-word-search-alignment-pilot-root';
const TARGET_REFERENCE = '창세기 1:1';
const TARGET_STRONG_RE = /H0*430/i;
const KRV_HEADER = '한글 본문 (KRV)';
const KRV_FIXED_ATTR = 'data-krv-h430-full-word';
const KRV_WORD_RE = /하나님[가-힣]*/g;

function isUsageRow(node, dialog) {
  if (!(node instanceof HTMLElement) || node === dialog) return false;
  const style = window.getComputedStyle(node);
  if (style.display !== 'grid' || style.gridTemplateColumns === 'none') return false;
  if (!style.borderLeftStyle || style.borderLeftStyle === 'none') return false;
  return /[가-힣]+\s+\d+:\d+/.test(node.textContent || '');
}

function findPilotRow(dialog) {
  if (!TARGET_STRONG_RE.test(dialog.textContent || '')) return null;

  const references = [...dialog.querySelectorAll('span')].filter(
    (node) => node.textContent?.trim() === TARGET_REFERENCE,
  );

  for (const reference of references) {
    let row = reference.parentElement;
    while (row && row !== dialog) {
      if (isUsageRow(row, dialog)) return row;
      row = row.parentElement;
    }
  }

  return null;
}

function resolveRowColor(row) {
  const border = window.getComputedStyle(row).borderLeftColor;
  return border && border !== 'rgba(0, 0, 0, 0)' ? border : '#2a78d6';
}

function replaceWithFullKoreanWords(verseNode, color) {
  const text = verseNode.textContent || '';
  const matches = [...text.matchAll(KRV_WORD_RE)];
  if (!matches.length) return false;

  const signature = matches.map((match) => `${match.index}:${match[0]}`).join('|');
  if (verseNode.getAttribute(KRV_FIXED_ATTR) === signature) return false;

  const fragment = document.createDocumentFragment();
  let cursor = 0;

  for (const match of matches) {
    const start = match.index ?? 0;
    if (start > cursor) fragment.append(document.createTextNode(text.slice(cursor, start)));

    const mark = document.createElement('mark');
    mark.textContent = match[0];
    mark.setAttribute('data-krv-h430-aligned-word', 'true');
    Object.assign(mark.style, {
      background: `${color}33`,
      color,
      fontWeight: '700',
      borderRadius: '2px',
      padding: '0 1px',
    });
    fragment.append(mark);
    cursor = start + match[0].length;
  }

  if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)));
  verseNode.replaceChildren(fragment);
  verseNode.setAttribute(KRV_FIXED_ATTR, signature);
  return true;
}

function fixVisibleKoreanRows(dialog) {
  if (!TARGET_STRONG_RE.test(dialog.textContent || '')) return;
  if (!(dialog.textContent || '').includes(KRV_HEADER)) return;

  const candidates = [...dialog.querySelectorAll('div')].filter((node) => isUsageRow(node, dialog));
  for (const row of candidates) {
    const verseNode = [...row.children].find((child) => {
      if (!(child instanceof HTMLElement) || child.tagName !== 'SPAN') return false;
      const text = child.textContent || '';
      return text.includes('하나님') && !child.closest(`[${HOST_ATTR}]`);
    });
    if (!verseNode) continue;
    replaceWithFullKoreanWords(verseNode, resolveRowColor(row));
  }
}

export function installWordSearchAlignmentPilotBridge() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let state = null;
  let scheduled = false;
  let applying = false;

  const destroy = () => {
    if (!state) return;
    state.root.unmount();
    state.host.remove();
    state = null;
  };

  const ensurePilot = (dialog) => {
    const row = findPilotRow(dialog);
    if (!row || !row.isConnected) {
      destroy();
      return;
    }

    if (state && state.row !== row) destroy();

    if (!state) {
      const host = document.createElement('div');
      host.setAttribute(HOST_ATTR, 'H430');
      Object.assign(host.style, {
        gridColumn: '2',
        minWidth: '0',
        alignSelf: 'stretch',
      });
      row.appendChild(host);
      state = { row, host, root: createRoot(host) };
    } else if (!row.contains(state.host)) {
      row.appendChild(state.host);
    }

    state.root.render(<WordSearchAlignmentPilot color={resolveRowColor(row)} />);
  };

  const sync = () => {
    scheduled = false;
    if (applying) return;
    applying = true;
    try {
      const dialogs = [...document.querySelectorAll(DIALOG_SELECTOR)];
      if (!dialogs.length) {
        destroy();
        return;
      }
      for (const dialog of dialogs) {
        fixVisibleKoreanRows(dialog);
        ensurePilot(dialog);
      }
    } finally {
      applying = false;
    }
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(sync);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('resize', schedule);
  schedule();

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', schedule);
    destroy();
  };
}
