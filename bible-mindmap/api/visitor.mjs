import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const ALLOWED_ORIGIN_HOSTS = new Set([
  'parkminhyun0.github.io',
  'localhost',
  '127.0.0.1',
]);
const ALLOWED_ORIGIN_SUFFIXES = ['.vercel.app'];

const KEY_TOTAL = 'bmm:visits:total';
const keyToday = (date) => `bmm:visits:day:${date}`;
const TODAY_TTL_SECONDS = 60 * 24 * 60 * 60;

function seoulDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function originAllowed(origin) {
  if (!origin) return false;
  let url;
  try { url = new URL(origin); } catch { return false; }
  if (ALLOWED_ORIGIN_HOSTS.has(url.hostname)) return true;
  return ALLOWED_ORIGIN_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix));
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (originAllowed(origin)) {
    res.setHeader('access-control-allow-origin', origin);
  }
  res.setHeader('vary', 'origin');
  res.setHeader('access-control-allow-methods', 'GET, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('access-control-max-age', '86400');
}

function json(res, status, body) {
  res.status(status).setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  return res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'method-not-allowed' });

  const url = new URL(req.url, 'http://localhost');
  const scope = url.searchParams.get('scope') === 'today' ? 'today' : 'total';
  const action = url.searchParams.get('action') === 'up' ? 'up' : 'get';
  const date = seoulDate();
  const key = scope === 'today' ? keyToday(date) : KEY_TOTAL;

  try {
    let count;
    if (action === 'up') {
      count = await redis.incr(key);
      if (scope === 'today') {
        await redis.expire(key, TODAY_TTL_SECONDS);
      }
    } else {
      const raw = await redis.get(key);
      count = raw == null ? 0 : Number(raw);
    }
    return json(res, 200, { count, scope, date });
  } catch (error) {
    return json(res, 502, { error: 'upstream-failure', message: String(error?.message || error) });
  }
}
