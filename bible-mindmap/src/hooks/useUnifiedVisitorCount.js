import { useEffect, useState } from 'react';

// Primary backend: self-hosted Cloudflare Worker (empty string = skip → secondary directly).
const PRIMARY_URL = import.meta.env.VITE_VISITOR_API_URL || '';
// Secondary backend: CounterAPI v2 public workspace (always-on safety net).
const SECONDARY_WORKSPACE = 'parkminhyun0-bible-mindmap';

const TOTAL_FLAG = 'bmm-visitor-total-counted-v3';
const TOTAL_CACHE = 'bmm-visitor-total-cache-v3';

const readCache = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const writeCache = (key, value) => {
  try { localStorage.setItem(key, String(value)); } catch {}
};

const seoulDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

const primaryRequest = async (scope, increment) => {
  if (!PRIMARY_URL) return null;
  try {
    const url = `${PRIMARY_URL}?scope=${scope}&action=${increment ? 'up' : 'get'}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.count === 'number' ? data.count : null;
  } catch {
    return null;
  }
};

const secondaryRequest = async (scope, increment, date) => {
  const name = scope === 'today' ? `visits-${date}` : 'visits';
  const url = `https://api.counterapi.dev/v2/${SECONDARY_WORKSPACE}/${name}${increment ? '/up' : ''}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`counter ${response.status}`);
  const payload = await response.json();
  const value = payload?.data?.up_count ?? payload?.data?.count ?? payload?.count;
  if (typeof value !== 'number') throw new Error('counter value missing');
  return value;
};

const requestCount = async (scope, increment, date) => {
  const primary = await primaryRequest(scope, increment);
  if (primary != null) return primary;
  return await secondaryRequest(scope, increment, date);
};

const loadEntry = async ({ scope, flag, cache, date }) => {
  const alreadyCounted = readCache(flag) === '1';
  try {
    const value = await requestCount(scope, !alreadyCounted, date);
    writeCache(cache, value);
    if (!alreadyCounted) writeCache(flag, '1');
    return value;
  } catch {
    const cached = readCache(cache);
    if (cached == null) return null;
    const numeric = Number(cached);
    return Number.isFinite(numeric) ? numeric : null;
  }
};

export function useUnifiedVisitorCount() {
  const [counts, setCounts] = useState(() => {
    const date = seoulDate();
    const todayCached = readCache(`bmm-visitor-today-cache-${date}`);
    const totalCached = readCache(TOTAL_CACHE);
    const toNum = (v) => {
      if (v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    return { today: toNum(todayCached), total: toNum(totalCached) };
  });

  useEffect(() => {
    let cancelled = false;
    const date = seoulDate();
    const entries = [
      { field: 'today', scope: 'today', flag: `bmm-visitor-today-counted-${date}`, cache: `bmm-visitor-today-cache-${date}`, date },
      { field: 'total', scope: 'total', flag: TOTAL_FLAG, cache: TOTAL_CACHE, date },
    ];

    Promise.all(entries.map(async (entry) => [entry.field, await loadEntry(entry)]))
      .then((pairs) => {
        if (!cancelled) setCounts((prev) => {
          const next = { ...prev };
          for (const [field, value] of pairs) {
            if (value != null) next[field] = value;
          }
          return next;
        });
      });

    return () => { cancelled = true; };
  }, []);

  return counts;
}
