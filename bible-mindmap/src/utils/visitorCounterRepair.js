const NAMESPACE = 'parkminhyun0-bible-mindmap';
const CACHE_KEY = 'bmm-total-v2';

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

function findTotalValueNode() {
  const labels = Array.from(document.querySelectorAll('*')).filter(
    (element) => element.children.length === 0 && element.textContent?.trim() === '전체 누적',
  );
  for (const label of labels) {
    const value = label.previousElementSibling;
    if (value) return value;
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
  let stopped = false;
  let running = false;

  const repair = async () => {
    if (stopped || running) return false;
    const node = findTotalValueNode();
    if (!node) return false;
    const current = node.textContent?.trim();
    if (current && current !== '?' && current !== '–') return true;

    const cached = readCachedTotal();
    if (cached != null) node.textContent = cached.toLocaleString('ko-KR');

    running = true;
    try {
      const value = await loadTotal();
      if (!stopped && node.isConnected) node.textContent = value.toLocaleString('ko-KR');
      return true;
    } catch {
      return cached != null;
    } finally {
      running = false;
    }
  };

  const observer = new MutationObserver(() => { repair().catch(() => {}); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  repair().catch(() => {});

  window.setTimeout(() => {
    stopped = true;
    observer.disconnect();
  }, 30_000);
}
