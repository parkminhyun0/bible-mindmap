const NAMESPACE = 'parkminhyun0-bible-mindmap';
const CACHE_KEY = 'bmm-total-v2';
const OBSERVER_TIMEOUT_MS = 30_000;

function readCachedTotal() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CACHE_KEY));
    const value = Number(parsed?.count);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeCachedTotal(value) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ count: value }));
  } catch {}
}

function isTotalLabel(element) {
  return element instanceof Element
    && element.children.length === 0
    && element.textContent?.trim() === '전체 누적';
}

function findTotalValueNode(root = document) {
  if (isTotalLabel(root)) return root.previousElementSibling;

  const scope = root instanceof Element || root instanceof Document ? root : document;
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_ELEMENT);
  let current = walker.currentNode;
  while (current) {
    if (isTotalLabel(current)) return current.previousElementSibling;
    current = walker.nextNode();
  }
  return null;
}

async function loadTotal() {
  const response = await fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/visits/`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`counter ${response.status}`);
  const data = await response.json();
  const value = Number(data.count ?? data.value);
  if (!Number.isFinite(value)) throw new Error('counter value missing');
  writeCachedTotal(value);
  return value;
}

export function installVisitorCounterRepair() {
  if (typeof window === 'undefined' || window.__visitorCounterRepairInstalled) return;
  window.__visitorCounterRepairInstalled = true;

  let stopped = false;
  let running = false;
  let frame = 0;
  let timeout = 0;
  let observer = null;
  const pendingRoots = new Set();

  const stop = () => {
    if (stopped) return;
    stopped = true;
    observer?.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    if (timeout) window.clearTimeout(timeout);
    pendingRoots.clear();
  };

  const repair = async (roots) => {
    if (stopped || running) return false;

    let node = null;
    for (const root of roots) {
      node = findTotalValueNode(root);
      if (node) break;
    }
    if (!node) return false;

    const current = node.textContent?.trim();
    if (current && current !== '?' && current !== '–') {
      stop();
      return true;
    }

    const cached = readCachedTotal();
    if (cached != null) node.textContent = cached.toLocaleString('ko-KR');

    running = true;
    try {
      const value = await loadTotal();
      if (!stopped && node.isConnected) node.textContent = value.toLocaleString('ko-KR');
      stop();
      return true;
    } catch {
      if (cached != null) stop();
      return cached != null;
    } finally {
      running = false;
    }
  };

  const schedule = (root) => {
    if (stopped) return;
    if (root) pendingRoots.add(root);
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const roots = pendingRoots.size ? [...pendingRoots] : [document];
      pendingRoots.clear();
      repair(roots).catch(() => {});
    });
  };

  const observationRoot = document.getElementById('root') || document.body;
  observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) schedule(node);
      });
    });
  });
  observer.observe(observationRoot, { childList: true, subtree: true });

  schedule(observationRoot);
  timeout = window.setTimeout(stop, OBSERVER_TIMEOUT_MS);
}
