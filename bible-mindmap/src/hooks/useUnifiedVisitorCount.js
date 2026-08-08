import { useEffect, useState } from 'react';

const WORKSPACE = 'parkminhyun0-bible-mindmap';
const TOTAL_NAME = 'visits';
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

const endpoint = (name, increment) =>
  `https://api.counterapi.dev/v2/${WORKSPACE}/${name}${increment ? '/up' : ''}`;

const requestCount = async (name, increment) => {
  const response = await fetch(endpoint(name, increment), { cache: 'no-store' });
  if (!response.ok) throw new Error(`counter ${response.status}`);
  const payload = await response.json();
  const value = payload?.data?.up_count ?? payload?.data?.count ?? payload?.count;
  if (typeof value !== 'number') throw new Error('counter value missing');
  return value;
};

const loadEntry = async ({ name, flag, cache }) => {
  const alreadyCounted = readCache(flag) === '1';
  try {
    const value = await requestCount(name, !alreadyCounted);
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
      { field: 'today', name: `visits-${date}`, flag: `bmm-visitor-today-counted-${date}`, cache: `bmm-visitor-today-cache-${date}` },
      { field: 'total', name: TOTAL_NAME, flag: TOTAL_FLAG, cache: TOTAL_CACHE },
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
