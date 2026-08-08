// 대용량 정적 성경 데이터(lex·strongs·strongs-def·variants·places DB)의 fetch 베이스.
//
// 기본값은 앱 BASE_URL → 로컬 개발/기존 동작 그대로 유지(아무것도 안 깨짐).
// 프로덕션에서는 빌드 시 VITE_DATA_BASE_URL 을 jsDelivr 같은 CDN 으로 지정해
// 대용량 데이터를 GitHub Pages 아티팩트에서 분리한다.
//   예) VITE_DATA_BASE_URL=https://cdn.jsdelivr.net/gh/parkminhyun0/bible-mindmap@data-v1/bible-mindmap/public/
//
// URL 은 기존과 동일하게 `${DATA_BASE}data/...` 형태로 조립하므로,
// 오버라이드 값은 `.../public/` 처럼 data 상위 경로를 가리켜야 한다.
//
// [2차 미러 폴백] CDN 단일 출처 장애/지역 차단에 대비해, 1차(primary) fetch 실패 시
// 자동으로 미러(mirror)로 재시도한다. jsDelivr(@tag) 참조면 동일 tag 기준으로
// Statically·GitHub raw 미러를 자동 유도하며, 마지막 폴백은 앱 동일출처(APP_BASE)다.
// 미러를 직접 지정하려면 VITE_DATA_BASE_URL_MIRROR(쉼표로 다중) 를 사용한다.
const APP_BASE = import.meta.env.BASE_URL; // 예: "/bible-mindmap/"
const OVERRIDE = import.meta.env.VITE_DATA_BASE_URL;
const MIRROR_OVERRIDE = import.meta.env.VITE_DATA_BASE_URL_MIRROR;

function normalize(base) {
  if (!base) return APP_BASE;
  const trimmed = String(base).trim();
  if (!trimmed) return APP_BASE;
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

// jsDelivr(`cdn.jsdelivr.net/gh/<user>/<repo>@<tag>/<path>`) 참조에서 동일 tag 기준
// 미러 베이스들을 유도한다. 매칭 실패 시 빈 배열.
function deriveMirrors(primary) {
  const m = /^https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)@([^/]+)\/(.*)$/.exec(primary);
  if (!m) return [];
  const [, user, repo, tag, path] = m;
  return [
    `https://cdn.statically.io/gh/${user}/${repo}/${tag}/${path}`,
    `https://raw.githubusercontent.com/${user}/${repo}/${tag}/${path}`,
  ];
}

export const DATA_BASE = normalize(OVERRIDE);

// fetch 후보 베이스 목록(중복 제거). primary → 미러들 → 앱 동일출처(최종 폴백).
export const DATA_BASES = (() => {
  const list = [DATA_BASE];
  if (MIRROR_OVERRIDE) {
    for (const part of String(MIRROR_OVERRIDE).split(',')) {
      const n = normalize(part);
      if (n) list.push(n);
    }
  } else if (OVERRIDE) {
    // 미러 미지정 시 jsDelivr 참조에서 자동 유도.
    for (const mir of deriveMirrors(DATA_BASE)) list.push(normalize(mir));
  }
  // 최종 폴백은 항상 앱 동일출처(빌드 산출물에 데이터가 있으면 구제).
  if (!list.includes(APP_BASE)) list.push(APP_BASE);
  // 중복 제거, 순서 유지.
  return [...new Set(list)];
})();

// `data/...` 상대 경로를 후보 베이스 순서대로 시도하는 폴백 fetch.
// 반환값은 fetch 와 동일한 Response(성공한 첫 베이스). 모두 실패하면 마지막 에러를 throw.
// - init.signal(AbortController) 그대로 전달. abort 는 즉시 중단(폴백 안 함).
export async function fetchData(relPath, init) {
  const rel = String(relPath).replace(/^\//, '');
  let lastErr;
  for (let i = 0; i < DATA_BASES.length; i += 1) {
    const url = `${DATA_BASES[i]}${rel}`;
    try {
      const res = await fetch(url, init);
      // 4xx/5xx 는 다음 베이스로 폴백(다만 마지막 베이스면 그대로 반환).
      if (res.ok || i === DATA_BASES.length - 1) return res;
      lastErr = new Error(`HTTP ${res.status} for ${url}`);
    } catch (err) {
      // abort 는 폴백하지 않고 즉시 전파.
      if (err && err.name === 'AbortError') throw err;
      lastErr = err;
    }
  }
  throw lastErr || new Error(`fetchData 실패: ${rel}`);
}

// 기존 호출부 호환용 드롭인. url 이 1차 DATA_BASE 로 시작하면 미러 폴백 체인으로
// 라우팅하고, 그 외(외부 API·앱 동일출처 등)는 표준 fetch 로 그대로 통과시킨다.
export function resilientFetch(url, init) {
  if (DATA_BASE !== APP_BASE && typeof url === 'string' && url.startsWith(DATA_BASE)) {
    return fetchData(url.slice(DATA_BASE.length), init);
  }
  return fetch(url, init);
}
