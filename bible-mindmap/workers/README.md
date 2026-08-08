# bible-mindmap-visitor Worker

랜딩·가이드·앱 세 화면이 공유하는 방문자 카운터.
Cloudflare Workers + Cloudflare KV 로 동작.

## 최초 배포 (한 번만)

```bash
# 0) 저장소 루트가 아닌 이 폴더에서 실행
cd bible-mindmap/workers

# 1) Cloudflare 로그인 (브라우저 팝업)
npx wrangler login

# 2) KV 네임스페이스 생성 → id 획득
npx wrangler kv namespace create VISITOR_KV
#   → 출력의 id 값을 wrangler.toml 의 REPLACE_WITH_KV_NAMESPACE_ID 자리에 붙여넣기

# 3) 배포
npx wrangler deploy
#   → https://bible-mindmap-visitor.<계정서브도메인>.workers.dev 형태의 URL 획득
```

## 프론트엔드 배선

배포로 얻은 Workers URL을 저장소 루트 `.env` 에 저장:

```bash
# bible-mindmap/.env
VITE_VISITOR_API_URL=https://bible-mindmap-visitor.<계정서브도메인>.workers.dev
```

- React 앱: Vite가 `import.meta.env.VITE_VISITOR_API_URL` 로 컴파일 타임에 주입.
- 랜딩·가이드 정적 HTML: `scripts/inject-landing-visitor-status.mjs` 가 파티셜의
  `__VISITOR_API_URL__` 플레이스홀더를 이 값으로 치환.

`.env` 를 갱신했으면 다시 `npm run predeploy && npm run deploy` 로 GitHub Pages 재배포.

## 검증

```bash
# 총합 조회
curl "https://<worker-url>/?scope=total&action=get"
# → {"count":123,"scope":"total","date":"2026-08-08"}

# 오늘 카운트 +1
curl "https://<worker-url>/?scope=today&action=up"
# → {"count":45,"scope":"today","date":"2026-08-08"}
```

## 코드 변경 시 재배포

```bash
cd bible-mindmap/workers
npx wrangler deploy
```

KV 값을 직접 확인·초기화하려면:

```bash
npx wrangler kv key list --binding VISITOR_KV
npx wrangler kv key get --binding VISITOR_KV "bmm:visits:total"
npx wrangler kv key put --binding VISITOR_KV "bmm:visits:total" "0"
```
