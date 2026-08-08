import { useEffect, useState } from 'react';

// Primary backend: self-hosted Cloudflare Worker (empty string = secondary only).
const PRIMARY_URL = import.meta.env.VITE_VISITOR_API_URL || '';
// Secondary backend: CounterAPI v2 public workspace (counter must be pre-created in dashboard).
const SECONDARY_WORKSPACE = 'bible-maps-team-4958';
const SECONDARY_COUNTER = 'first-counter-4958';

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

const primaryFetch = async (scope, action) => {
  if (!PRIMARY_URL) return null;
  try {
    const r = await fetch(`${PRIMARY_URL}?scope=${scope}&action=${action}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const d = await r.json();
    return typeof d.count === 'number' ? d.count : null;
  } catch { return null; }
};

const secondaryUp = async () => {
  try {
    await fetch(`https://api.counterapi.dev/v2/${SECONDARY_WORKSPACE}/${SECONDARY_COUNTER}/up`, { cache: 'no-store' });
  } catch {}
};

const secondaryStats = async () => {
  try {
    const r = await fetch(`https://api.counterapi.dev/v2/${SECONDARY_WORKSPACE}/${SECONDARY_COUNTER}/stats`, { cache: 'no-store' });
    if (!r.ok) return { today: null, total: null };
    const d = await r.json();
    return {
      today: d?.data?.stats?.today?.up ?? null,
      total: d?.data?.up_count ?? null,
    };
  } catch { return { today: null, total: null }; }
};

const toNum = (v) => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function useUnifiedVisitorCount() {
  const [counts, setCounts] = useState(() => {
    const date = seoulDate();
    return {
      today: toNum(readCache(`bmm-visitor-today-cache-${date}`)),
      total: toNum(readCache(TOTAL_CACHE)),
    };
  });

  useEffect(() => {
    let cancelled = false;
    const date = seoulDate();
    const todayFlag = `bmm-visitor-today-counted-${date}`;
    const todayCache = `bmm-visitor-today-cache-${date}`;
    const alreadyCounted = readCache(todayFlag) === '1';
    const action = alreadyCounted ? 'get' : 'up';

    (async () => {
      const [pToday, pTotal] = await Promise.all([
        primaryFetch('today', action),
        primaryFetch('total', action),
      ]);

      if (!alreadyCounted) await secondaryUp();

      let today = pToday;
      let total = pTotal;
      if (today == null || total == null) {
        const sec = await secondaryStats();
        if (today == null) today = sec.today;
        if (total == null) total = sec.total;
      }

      if (cancelled) return;
      if (today != null) writeCache(todayCache, today);
      if (total != null) writeCache(TOTAL_CACHE, total);
      if (!alreadyCounted && (today != null || total != null)) writeCache(todayFlag, '1');
      setCounts((prev) => ({
        today: today != null ? today : prev.today,
        total: total != null ? total : prev.total,
      }));
    })();

    return () => { cancelled = true; };
  }, []);

  return counts;
}
