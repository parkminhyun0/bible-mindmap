// 대용량 정적 성경 데이터(lex·strongs·strongs-def·variants·places DB)의 fetch 베이스.
//
// 기본값은 앱 BASE_URL → 로컬 개발/기존 동작 그대로 유지(아무것도 안 깨짐).
// 프로덕션에서는 빌드 시 VITE_DATA_BASE_URL 을 jsDelivr 같은 CDN 으로 지정해
// 대용량 데이터를 GitHub Pages 아티팩트에서 분리한다.
//   예) VITE_DATA_BASE_URL=https://cdn.jsdelivr.net/gh/parkminhyun0/bible-mindmap@data-v1/bible-mindmap/public/
//
// URL 은 기존과 동일하게 `${DATA_BASE}data/...` 형태로 조립하므로,
// 오버라이드 값은 `.../public/` 처럼 data 상위 경로를 가리켜야 한다.
const APP_BASE = import.meta.env.BASE_URL; // 예: "/bible-mindmap/"
const OVERRIDE = import.meta.env.VITE_DATA_BASE_URL;

function normalize(base) {
  if (!base) return APP_BASE;
  const trimmed = String(base).trim();
  if (!trimmed) return APP_BASE;
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

export const DATA_BASE = normalize(OVERRIDE);
