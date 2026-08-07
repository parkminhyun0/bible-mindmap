import { createRoot } from 'react-dom/client';
import WordSearchAlignmentPilot from '../components/WordSearchAlignmentPilot.jsx';

const DIALOG_SELECTOR = '[role="dialog"][aria-label="원어 성경 다언어 검색"]';
const HOST_ATTR = 'data-word-search-alignment-pilot-root';
const TARGET_REFERENCE = '창세기 1:1';
const TARGET_STRONG_RE = /H0*430/i;

function isUsageRow(node, dialog) {
  if (!(node instanceof HTMLElement) || node === dialog) return false;
  const style = window.getComputedStyle(node);
  if (style.display !== 'grid' || style.gridTemplateColumns === 'none') return false;
  if (!style.borderLeftStyle || style.borderLeftStyle === 'none') return false;
  const text = node.textContent || '';
  return text.includes(TARGET_REFERENCE);
}

function findUsageRow(dialog) {
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
    const row = findUsageRow(dialog);
    for (const existingRow of [...states.keys()]) {
      if (!existingRow.isConnected || existingRow !== row) destroy(existingRow);
    }
    if (!row || !row.isConnected) return;

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
