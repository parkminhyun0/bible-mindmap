// 모바일 안전 가드 verifier
// 배경: App.jsx는 (!isMobile || mobileSidebarOpen) 조건으로 Sidebar를 마운트한다.
// 따라서 Sidebar 내부에서 모달을 여는 버튼이 시트를 닫으면(onMobileClose 호출)
// Sidebar 전체가 언마운트되어 모달 상태·렌더가 통째로 파괴된다(모바일에서 모달이
// 열리자마자 사라지는 크래시). 이 파일은 그 안티패턴이 재도입되지 않도록 강제한다.
// 참조: Notion "모바일 안전 규칙" · [[mobile-modal-unmount-rule]]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const issues = [];
const fail = (m) => issues.push(m);
const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

const appSource = read('../src/App.jsx');
const sidebarSource = read('../src/components/Sidebar.jsx');
const launcherSource = read('../src/components/ParallelStudyLauncher.jsx');
const parallelModalSource = read('../src/components/ParallelStudyModal.jsx');

// 1) App.jsx가 여전히 조건부로 Sidebar를 마운트하는지 확인(규칙의 전제).
//    전제가 바뀌면(항상 마운트) 이 규칙 자체를 재검토해야 하므로 경고.
if (!appSource.includes('mobileSidebarOpen') || !/\(\s*!isMobile\s*\|\|\s*mobileSidebarOpen\s*\)/.test(appSource)) {
  fail('App.jsx의 Sidebar 조건부 마운트 패턴(!isMobile || mobileSidebarOpen)이 감지되지 않음 — 모바일 모달 규칙 전제 재확인 필요');
}

// 2) 모바일 "문맥 성경" 버튼 블록이 onMobileClose를 호출하지 않아야 함.
const ctxIdx = sidebarSource.indexOf('문맥 성경 (모바일)');
if (ctxIdx === -1) {
  fail('Sidebar: 모바일 문맥 성경 블록 주석을 찾지 못함(구조 변경 시 이 verifier 갱신 필요)');
} else {
  const block = sidebarSource.slice(ctxIdx, ctxIdx + 900);
  if (/onClick=\{\s*\(\)\s*=>\s*\{[^}]*onMobileClose[^}]*setShowContextBible/.test(block)) {
    fail('Sidebar: 모바일 문맥 성경 버튼이 onMobileClose를 호출함 → 시트 언마운트로 모달 파괴. 제거할 것.');
  }
  if (/<ParallelStudyLauncher\s+onBeforeOpen/.test(block)) {
    fail('Sidebar: 모바일 ParallelStudyLauncher에 onBeforeOpen(onMobileClose) 전달 → 언마운트 크래시. 제거할 것.');
  }
}

// 3) ParallelStudyLauncher는 onBeforeOpen prop을 받지 않아야 함(위험 패턴 봉인).
if (/onBeforeOpen/.test(launcherSource)) {
  fail('ParallelStudyLauncher: onBeforeOpen prop 잔존 — 모바일 시트 닫기 유도 위험. 제거할 것.');
}

// 4) ParallelStudyModal의 루트 오버레이(position:fixed 컨테이너)는 모바일 시트(zIndex 1201)
//    위에 뜨도록 zIndex >= 1250 이어야 함. 내부 요소(리사이즈 핸들 등)의 낮은 z는 무관하므로
//    "position: 'fixed' ... zIndex: N" 형태의 루트 컨테이너만 검사한다.
const rootOverlayZ = [...parallelModalSource.matchAll(/position:\s*'fixed'[^}]*?zIndex:\s*(\d+)/g)].map((m) => Number(m[1]));
if (rootOverlayZ.length < 2) {
  fail(`ParallelStudyModal: 루트 fixed 오버레이(모바일 백드롭 + 데스크톱 컨테이너 2개)를 찾지 못함. 감지 ${rootOverlayZ.length}개`);
}
if (rootOverlayZ.some((z) => z <= 1201)) {
  fail(`ParallelStudyModal: 루트 오버레이 zIndex가 모바일 시트(1201) 이하 → 시트 뒤에 가려짐. 현재값 ${rootOverlayZ.join(',')}`);
}

// 5) 두 모달 스크롤 컨테이너에 iOS momentum / overscroll 방어가 있어야 함.
if (!parallelModalSource.includes('overscrollBehavior') || !parallelModalSource.includes("WebkitOverflowScrolling")) {
  fail('ParallelStudyModal: 본문 스크롤에 overscrollBehavior/WebkitOverflowScrolling 방어 누락');
}

console.log('모바일 안전 verifier · Sidebar 언마운트 안티패턴 · zIndex 계층 · 스크롤 방어 점검');

if (issues.length) {
  console.error('✗ 모바일 안전 검증 실패');
  for (const i of issues) console.error(`  - ${i}`);
  process.exit(1);
}

console.log('✓ 모바일 안전 규칙 통과 (모달 언마운트 방지 · zIndex 계층 · 스크롤 방어)');
