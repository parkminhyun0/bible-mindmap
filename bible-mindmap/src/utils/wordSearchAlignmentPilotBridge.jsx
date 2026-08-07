import { createRoot } from 'react-dom/client';
import WordSearchAlignmentPilot from '../components/WordSearchAlignmentPilot.jsx';

const DIALOG_SELECTOR = '[role="dialog"][aria-label="원어 성경 다언어 검색"]';
const HOST_ATTR = 'data-word-search-alignment-pilot-root';
const TARGET_REFERENCE = '창세기 1:1';
const TARGET_STRONG_RE = /H0*430/i;
const TARGET_KRV_TEXT = '태초에 하나님이 천지를 창조하시니라';
const TARGET_KRV_SPAN = '하나님이';
const KRV_FIXED_ATTR = 'data-krv-alignment-span-fixed';

function isUsageRow(node, dialog) {
  if (!(node instanceof HTMLElement) || node === dialog) return false;
  const style = window.getComputedStyle(node);
  if (style.display !== 'grid' || style.gridTemplateColumns === 'none') return false;
  if (!style.borderLeftStyle || style.borderLeftStyle === 'none') return false;
  const text = node.textContent || '';
  return text.includes(TARGET_REFERENCE);
}

function findUsageRows(dialog) {
  if (!TARGET_STRONG_RE.test(dialog.textContent || '')) return [];

  const rows = [];
  const references = [...dialog.querySelectorAll('span')].filter(
    (node) => node.textContent?.trim() === TARGET_REFERENCE,
  );

  for (const reference of references) {
    let row = reference.parentElement;
    while (row && row !== dialog) {
      if (isUsageRow(row, dialog)) {
        if (!rows.includes(row)) rows.push(row);
        break;
      }
      row = row.parentElement;
    }
  }

  return rows;
}

function resolveRowColor(row) {
  const border = window.getComputedStyle(row).borderLeftColor;
  return border && border !== 'rgba(0, 0, 0, 0)' ? border : '#2a78d6';
}

function fixKoreanSpan(row) {
  const verseNode = [...row.querySelectorAll('span')].find(
    (node) => node.textContent?.trim() === TARGET_KRV_TEXT,
  );
  if (!verseNode || verseNode.getAttribute(KRV_FIXED_ATTR) === 'true') return;

  const start = TARGET_KRV_TEXT.indexOf(TARGET_KRV_SPAN);
  if (start < 0) return;

  const color = resolveRowColor(row);
  const before = document.createTextNode(TARGET_KRV_TEXT.slice(0, start));
  const mark = document.createElement('mark');
  mark.textContent = TARGET_KRV_SPAN;
  Object.assign(mark.style, {
    background: `${color}33`,
    color,
    fontWeight: '700',
    borderRadius: '2px',
    padding: '0 1px',
  });
  const after = document.createTextNode(TARGET_KRV_TEXT.slice(start + TARGET_KRV_SPAN.length));

  verseNode.replaceChildren(before, mark, after);
  verseNode.setAttribute(KRV_FIXED_ATTR, 'true');
}

export function installWordSearchAlignmentPilotBridge() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const states = new Map();
  let scheduled = false;

  const destroy = (row) => {
    const state = states.get(row);
    if (!state) return;
    state.root.unmount();
    state.host.remove();
    states.delete(row);
  };

  const ensure = (dialog) => {
    const rows = findUsageRows(dialog);
    const activeRows = new Set(rows);

    for (const existingRow of [...states.keys()]) {
      if (!existingRow.isConnected || !activeRows.has(existingRow)) destroy(existingRow);
    }

    for (const row of rows) {
      if (!row.isConnected) continue;
      fixKoreanSpan(row);

      let state = states.get(row);
      if (!state) {
        const host = document.createElement('div');
        host.setAttribute(HOST_ATTR, 'H430');
        Object.assign(host.style, {
          gridColumn: '2',
          minWidth: '0',
          alignSelf: 'stretch',
        });
        row.appendChild(host);
        state = { host, root: createRoot(host) };
        states.set(row, state);
      } else if (!row.contains(state.host)) {
        row.appendChild(state.host);
      }

      state.root.render(<WordSearchAlignmentPilot color={resolveRowColor(row)} />);
    }
  };

  const sync = () => {
    scheduled = false;
    const dialogs = [...document.querySelectorAll(DIALOG_SELECTOR)];
    for (const dialog of dialogs) ensure(dialog);
    if (!dialogs.length) {
      for (const row of [...states.keys()]) destroy(row);
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
    for (const row of [...states.keys()]) destroy(row);
  };
}
