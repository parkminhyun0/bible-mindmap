import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  plugins: [react(), stampBuildId()],
  base: '/bible-mindmap/app/',
  build: { outDir: 'dist/app' },
})
