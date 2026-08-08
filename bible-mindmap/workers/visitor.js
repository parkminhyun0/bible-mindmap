const ALLOWED_ORIGIN_HOSTS = new Set([
  'parkminhyun0.github.io',
  'localhost',
  '127.0.0.1',
]);
const ALLOWED_ORIGIN_SUFFIXES = ['.vercel.app', '.workers.dev', '.pages.dev'];

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

function corsHeaders(request) {
  const origin = request.headers.get('origin');
  const headers = {
    'vary': 'origin',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
  if (originAllowed(origin)) {
    headers['access-control-allow-origin'] = origin;
  }
  return headers;
}

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'GET') {
      return json(405, { error: 'method-not-allowed' }, cors);
    }
    const kv = env.VISITOR_KV;
    if (!kv) {
      return json(500, { error: 'kv-binding-missing', message: 'VISITOR_KV binding is not configured' }, cors);
    }

    const url = new URL(request.url);
    const scope = url.searchParams.get('scope') === 'today' ? 'today' : 'total';
    const action = url.searchParams.get('action') === 'up' ? 'up' : 'get';
    const date = seoulDate();
    const key = scope === 'today' ? keyToday(date) : KEY_TOTAL;

    try {
      const raw = await kv.get(key);
      const current = raw == null ? 0 : Number(raw);
      let count = current;
      if (action === 'up') {
        count = current + 1;
        const putOpts = scope === 'today' ? { expirationTtl: TODAY_TTL_SECONDS } : undefined;
        await kv.put(key, String(count), putOpts);
      }
      return json(200, { count, scope, date }, cors);
    } catch (error) {
      return json(502, { error: 'upstream-failure', message: String(error?.message || error) }, cors);
    }
  },
};
