import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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
  plugins: [
    react(),
    stampBuildId(),
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
        // App shell precache — 배포 시점 fingerprint 된 파일들
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // 큰 lex 데이터 파일도 precache 대상에 넣지 말 것 (초기 다운로드 무겁게)
        // → runtimeCaching 으로 사용 시점에 CacheFirst
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB (index bundle 대응)
        runtimeCaching: [
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
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'bm-google-fonts-css-v1' },
          },
          {
            // Google Fonts 실제 파일 (gstatic)
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bm-google-fonts-files-v1',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1년
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // navigate 요청 (SPA 라우팅) — 오프라인일 때 index.html 로 fallback
        navigateFallback: '/bible-mindmap/app/index.html',
        // Cross-origin (bolls.life 등) 요청은 navigate fallback 대상 아님
        navigateFallbackDenylist: [/^\/bible-mindmap\/app\/data\//, /^https?:\/\//],
      },
    }),
  ],
})
