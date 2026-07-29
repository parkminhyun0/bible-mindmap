import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ── 캐시 세대 단일 소스 (bump 시 이 두 값만 수정) ─────────────────────────
const HTML_CACHE = 'bm-app-html-v4'
const CHUNK_CACHE = 'bm-feature-chunks-v3'

// ── 빌드 provenance (배포 반영 확인 장치) ────────────────────────────────
// 매 빌드마다 git commit SHA + 빌드 시각을 앱과 version.json에 심는다.
// 앱 [사용법]의 '현재 빌드' 배지 + scripts/verify-deploy.mjs 로 "라이브가 최신인가"를 확인.
function resolveCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim()
  } catch {
    return (process.env.GITHUB_SHA || 'dev').slice(0, 7)
  }
}
const BUILD_COMMIT = resolveCommit()
const BUILD_TIME = new Date().toISOString()

// dist 루트에 version.json 방출 → 라이브 배포 반영 검증용 엔드포인트
const emitVersionJson = () => ({
  name: 'emit-version-json',
  writeBundle(options) {
    const dir = options.dir || 'dist/app'
    const payload = {
      commit: BUILD_COMMIT,
      buildTime: BUILD_TIME,
      htmlCache: HTML_CACHE,
      chunkCache: CHUNK_CACHE,
    }
    try { writeFileSync(resolve(dir, 'version.json'), JSON.stringify(payload, null, 2)) } catch { /* noop */ }
  },
})

// build 시 BUILD_ID 주입 · index.html 의 __BM_BUILD_ID__ 를 매 배포 timestamp 로 치환
// 목적: 클라이언트가 이 값을 localStorage 저장분과 비교 → 새 배포 감지 시 강제 재로드 (모바일 캐시 방어)
const stampBuildId = () => ({
  name: 'stamp-build-id',
  transformIndexHtml(html) {
    return html.replace(/__BM_BUILD_ID__/g, String(Date.now()))
  },
})

// https://vite.dev/config/
export default defineConfig({
  base: '/bible-mindmap/app/',
  build: { outDir: 'dist/app' },
  define: {
    __BM_BUILD_COMMIT__: JSON.stringify(BUILD_COMMIT),
    __BM_BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  plugins: [
    react(),
    stampBuildId(),
    emitVersionJson(),
    VitePWA({
      // 자동 업데이트: 새 SW 배포 시 다음 방문에 활성화
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // 개발 중에도 SW 사용 안 함 (dev HMR 방해 방지)
      devOptions: { enabled: false },
      // 홈 화면 아이콘·앱 정보
      manifest: {
        name: '성경 마인드맵',
        short_name: '성경맵',
        description: '성경 원문(헬라어·히브리어)과 인물·장소·시대를 연결하는 인터랙티브 성경 마인드맵',
        start_url: '/bible-mindmap/app/',
        scope: '/bible-mindmap/app/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#ffffff',
        theme_color: '#d97706',
        lang: 'ko',
        icons: [
          { src: 'favicon-32.png',  sizes: '32x32',   type: 'image/png' },
          { src: 'favicon-180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
          { src: 'favicon-180.png', sizes: '180x180', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg',     sizes: 'any',     type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // HTML은 precache하지 않는다. 이전 HTML이 삭제된 번들 해시를 가리켜
        // 모바일에서 흰 화면이 되는 것을 막고, 탐색 요청은 NetworkFirst로 처리한다.
        globPatterns: [
          'assets/index-*.js',
          'assets/index-*.css',
          'assets/rolldown-runtime-*.js',
          'registerSW.js',
          'favicon.{svg,png,ico}',
          'favicon-*.png',
        ],
        // 큰 lex 데이터 파일도 precache 대상에 넣지 말 것 (초기 다운로드 무겁게)
        // → runtimeCaching 으로 사용 시점에 CacheFirst
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB (index bundle 대응)
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigationPreload: true,
        runtimeCaching: [
          {
            urlPattern: /\/bible-mindmap\/app\/(?:index\.html)?(?:\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: HTML_CACHE,
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 3, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // 문맥성경·논증지도·매뉴얼 등 실행 코드의 최신성을 우선한다.
            // 이전 CacheFirst(v1)는 오래된 지연 로드 청크가 남아 새 기능 반영을 가릴 수 있었다.
            // SWR은 캐시를 즉시 사용할 수 있으면서도 매 요청마다 새 청크를 백그라운드 갱신한다.
            urlPattern: /\/bible-mindmap\/app\/assets\/.+\.js$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: CHUNK_CACHE,
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // 원어 lex 데이터 (히/헬 66권) — 거의 정적. CacheFirst.
            urlPattern: /\/bible-mindmap\/app\/data\/lex\/.+\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bm-lex-data-v1',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30일
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Strong 사전 정의 (BDB/Strong's) — 거의 정적
            urlPattern: /\/bible-mindmap\/app\/data\/strongs.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bm-strongs-v1',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // KRV/ESV 등 성경 본문 API (bolls.life) — 변경 드묾. StaleWhileRevalidate.
            urlPattern: /^https:\/\/bolls\.life\/.*$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'bm-bolls-v1',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7일
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts CSS
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*$/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'bm-google-fonts-css-v1' },
          },
          {
            // Google Fonts 실제 파일 (gstatic)
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bm-google-fonts-files-v1',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1년
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // 오래된 precache app-shell 대신 위 NetworkFirst 탐색 캐시를 사용한다.
        navigateFallback: null,
      },
    }),
  ],
})
