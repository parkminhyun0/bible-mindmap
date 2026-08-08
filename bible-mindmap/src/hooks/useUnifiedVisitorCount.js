import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_VISITOR_API_URL || 'https://bible-mindmap.vercel.app/api/visitor';

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

const requestCount = async (scope, increment) => {
  const url = `${API_URL}?scope=${scope}&action=${increment ? 'up' : 'get'}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`visitor ${response.status}`);
  const data = await response.json();
  if (typeof data.count !== 'number') throw new Error('visitor count missing');
  return data.count;
};

const loadEntry = async ({ scope, flag, cache }) => {
  const alreadyCounted = readCache(flag) === '1';
  try {
    const value = await requestCount(scope, !alreadyCounted);
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
      { field: 'today', scope: 'today', flag: `bmm-visitor-today-counted-${date}`, cache: `bmm-visitor-today-cache-${date}` },
      { field: 'total', scope: 'total', flag: TOTAL_FLAG, cache: TOTAL_CACHE },
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
