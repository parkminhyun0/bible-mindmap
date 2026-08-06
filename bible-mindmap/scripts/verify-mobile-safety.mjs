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
const fail = (message) => issues.push(message);
const read = (relativePath) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

const appSource = read('../src/App.jsx');
const appCssSource = read('../src/App.css');
const sidebarSource = read('../src/components/Sidebar.jsx');
const launcherSource = read('../src/components/ParallelStudyLauncher.jsx');
const parallelModalSource = read('../src/components/ParallelStudyModal.jsx');

if (!appSource.includes('mobileSidebarOpen') || !/\(\s*!isMobile\s*\|\|\s*mobileSidebarOpen\s*\)/.test(appSource)) {
  fail('App.jsx의 Sidebar 조건부 마운트 패턴(!isMobile || mobileSidebarOpen)이 감지되지 않음 — 모바일 모달 규칙 전제 재확인 필요');
}

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

if (/onBeforeOpen/.test(launcherSource)) {
  fail('ParallelStudyLauncher: onBeforeOpen prop 잔존 — 모바일 시트 닫기 유도 위험. 제거할 것.');
}

const rootOverlayZ = [...parallelModalSource.matchAll(/position:\s*'fixed'[^}]*?zIndex:\s*(\d+)/g)].map((match) => Number(match[1]));
if (rootOverlayZ.length < 2) {
  fail(`ParallelStudyModal: 루트 fixed 오버레이(모바일 백드롭 + 데스크톱 컨테이너 2개)를 찾지 못함. 감지 ${rootOverlayZ.length}개`);
}
if (rootOverlayZ.some((zIndex) => zIndex <= 1201)) {
  fail(`ParallelStudyModal: 루트 오버레이 zIndex가 모바일 시트(1201) 이하 → 시트 뒤에 가려짐. 현재값 ${rootOverlayZ.join(',')}`);
}

if (!parallelModalSource.includes('overscrollBehavior') || !parallelModalSource.includes('WebkitOverflowScrolling')) {
  fail('ParallelStudyModal: 본문 스크롤에 overscrollBehavior/WebkitOverflowScrolling 방어 누락');
}

function walkSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkSourceFiles(absolutePath);
    return /\.(?:[cm]?[jt]sx?)$/u.test(entry.name) ? [absolutePath] : [];
  });
}

function relativeSourcePath(absolutePath) {
  return path.relative(path.resolve(__dirname, '../src'), absolutePath).replaceAll(path.sep, '/');
}

const srcRoot = path.resolve(__dirname, '../src');
const sourceFiles = walkSourceFiles(srcRoot);
const observerInventory = [];
const highFrequencyGlobalListeners = [];

sourceFiles.forEach((absolutePath) => {
  const source = fs.readFileSync(absolutePath, 'utf8');
  const relativePath = relativeSourcePath(absolutePath);
  const observerCount = [...source.matchAll(/new\s+MutationObserver\s*\(/gu)].length;
  if (observerCount) observerInventory.push({ path: relativePath, count: observerCount });

  source.split('\n').forEach((line, index) => {
    const match = line.match(/\b(window(?:\.visualViewport\?)?|document)\.addEventListener\(\s*['"](scroll|touchmove|resize|pointermove)['"]/u);
    if (!match) return;
    highFrequencyGlobalListeners.push({
      path: relativePath,
      line: index + 1,
      target: match[1],
      event: match[2],
      passiveOnLine: /passive\s*:\s*true/u.test(line),
    });
  });
});

const performanceSources = {
  threeColumn: read('../src/utils/markResearchThreeColumnRepair.js'),
  layerBridge: read('../src/utils/markResearchLayerBridge.js'),
  crossReference: read('../src/utils/crossReferenceToolbarBridge.js'),
  legacyModal: read('../src/components/LegacyModalAccessibilityBridge.jsx'),
  visitorCounter: read('../src/utils/visitorCounterRepair.js'),
  canonicalSuggestion: read('../src/components/CanonicalConceptSuggestionPanel.jsx'),
  canonicalSemantic: read('../src/components/CanonicalSemanticComparisonPanel.jsx'),
  canonicalLauncher: read('../src/components/CanonicalConceptLauncher.jsx'),
  contextScaffolding: read('../src/components/ContextBibleScaffolding.jsx'),
  mobileFrame: read('../src/components/MobileModalFrame.jsx'),
  modalDialog: read('../src/hooks/useModalDialog.js'),
};

if (/characterData\s*:\s*true/u.test(performanceSources.threeColumn)) {
  fail('markResearchThreeColumnRepair: characterData 상시 관찰 금지');
}
if (/observer\.observe\(document\.body/u.test(performanceSources.threeColumn)) {
  fail('markResearchThreeColumnRepair: document.body 직접 전역 관찰 금지');
}
if (!performanceSources.threeColumn.includes('activeObserver.disconnect()')
  || !performanceSources.threeColumn.includes('if (frame) return')) {
  fail('markResearchThreeColumnRepair: 활성 뷰 scoped observer + 프레임 코얼레싱 계약 누락');
}
if (!performanceSources.threeColumn.includes('passive: true')
  || !performanceSources.threeColumn.includes('moveFrame')) {
  fail('markResearchThreeColumnRepair: pointermove 프레임 코얼레싱/passive 계약 누락');
}
if (!performanceSources.threeColumn.includes("layout.dataset.markThreeColumnReady === 'true'")) {
  fail('markResearchThreeColumnRepair: 완성된 3열 DOM 멱등 가드 누락');
}

if (/observer\.observe\(document\.body/u.test(performanceSources.layerBridge)) {
  fail('markResearchLayerBridge: document.body 직접 전역 관찰 금지');
}
if (!performanceSources.layerBridge.includes('activeObserver.disconnect()')
  || !performanceSources.layerBridge.includes('if (frame) return')) {
  fail('markResearchLayerBridge: 활성 모달 scoped observer + 프레임 코얼레싱 계약 누락');
}
if (!performanceSources.layerBridge.includes('moveFrame')) {
  fail('markResearchLayerBridge: resize pointermove 프레임 코얼레싱 누락');
}

if (/observer\.observe\(document\.body/u.test(performanceSources.crossReference)) {
  fail('crossReferenceToolbarBridge: document.body 직접 전역 관찰 금지');
}
if (!performanceSources.crossReference.includes('nearestSharedContainer')
  || !performanceSources.crossReference.includes('activeObserver.disconnect()')
  || !performanceSources.crossReference.includes('if (frame) return')) {
  fail('crossReferenceToolbarBridge: 공통 컨테이너 scoped observer/프레임 코얼레싱 계약 누락');
}
if (!performanceSources.crossReference.includes('setAttributeIfChanged')
  || !performanceSources.crossReference.includes('button.textContent !== nextLabel')) {
  fail('crossReferenceToolbarBridge: observer 자기발화 방지 멱등 가드 누락');
}

if (!performanceSources.legacyModal.includes('mutationContainsTrackedDialog')
  || !performanceSources.legacyModal.includes('if (frame) return')
  || /observer\.observe\(document\.body/u.test(performanceSources.legacyModal)) {
  fail('LegacyModalAccessibilityBridge: 관련 모달 mutation 필터/rAF/root scope 계약 누락');
}

if (/observer\.observe\(document\.documentElement/u.test(performanceSources.visitorCounter)
  || /document\.querySelectorAll\(\s*['"]\*['"]\s*\)/u.test(performanceSources.visitorCounter)
  || !performanceSources.visitorCounter.includes('pendingRoots')
  || !performanceSources.visitorCounter.includes('stop();')) {
  fail('visitorCounterRepair: 전역 DOM 반복 스캔 또는 성공 후 즉시 disconnect 계약 누락');
}

for (const [label, source] of [
  ['CanonicalConceptSuggestionPanel', performanceSources.canonicalSuggestion],
  ['CanonicalSemanticComparisonPanel', performanceSources.canonicalSemantic],
]) {
  if (!source.includes('if (disposed || scheduled) return')
    || !source.includes('hostRef.current?.isConnected')) {
    fail(`${label}: #178/#180 프레임 코얼레싱·연결 호스트 단축 반환 회귀`);
  }
}

if (!performanceSources.canonicalLauncher.includes('observer.disconnect()')) {
  fail('CanonicalConceptLauncher: 일회형 상세 열기 observer self-disconnect 계약 누락');
}
if (!performanceSources.contextScaffolding.includes('observer.disconnect()')
  || !performanceSources.contextScaffolding.includes('dialog || document.body')) {
  fail('ContextBibleScaffolding: dialog 우선 scoped observer·cleanup 계약 누락');
}

if (!performanceSources.modalDialog.includes('scheduleViewportSync')
  || !performanceSources.modalDialog.includes('if (viewportFrame) return')
  || !performanceSources.modalDialog.includes('activeScrollArea')
  || !performanceSources.modalDialog.includes("visualViewport?.addEventListener('scroll', scheduleViewportSync, { passive: true })")) {
  fail('useModalDialog: visualViewport 프레임 코얼레싱·터치 대상 캐시·passive viewport listener 계약 누락');
}
if (!performanceSources.modalDialog.includes("document.addEventListener('touchmove', onTouchMove, { passive: false")) {
  fail('useModalDialog: 배경 스크롤 차단용 의도적 non-passive touchmove 계약 누락');
}
if (!/if\s*\(event\.touches\s*&&\s*event\.touches\.length\s*>\s*1\)\s*return;/u.test(performanceSources.modalDialog)) {
  fail('useModalDialog: touchmove 멀티터치 조기 반환(touches.length > 1 return) 게이트 누락');
}
if (!performanceSources.modalDialog.includes('syncMobileModalFrameGeometry(backdrop, window.visualViewport)')
  || /viewport\?\.width\s*\|\|\s*window\.innerWidth/u.test(performanceSources.modalDialog)) {
  fail('useModalDialog: 공통 MobileModalFrame geometry 연결 또는 핀치 중 visualViewport 폭 재계산 금지 계약 위반');
}

if (!performanceSources.mobileFrame.includes("element.style.width = '100%'")
  || !performanceSources.mobileFrame.includes('PINCH_SCALE_EPSILON')
  || !performanceSources.mobileFrame.includes("data-mobile-modal-frame=\"true\"")
  || /window\.innerWidth/u.test(performanceSources.mobileFrame)) {
  fail('MobileModalFrame: percentage 폭·핀치 scale 가드·공통 표식·window.innerWidth 금지 계약 누락');
}

if (!appCssSource.includes(":has(> button:nth-child(4):last-child)")
  || !appCssSource.includes('overflow-x: auto !important')
  || !appCssSource.includes('min-width: 0 !important')) {
  fail('CanonicalConceptModal: 상세 탭 min-width:0 + 좁은 화면 가로 스크롤 fallback 누락');
}
if (!performanceSources.canonicalSemantic.includes('minWidth: 72')
  || performanceSources.canonicalSemantic.includes('minWidth: 96')) {
  fail('CanonicalSemanticComparisonPanel: NVIDIA 다시 비교 버튼 최소폭 완화 계약 누락');
}

console.log('모바일 안전 verifier · Sidebar 언마운트 · zIndex · 스크롤 · 런타임 성능 점검');
console.log(`[mobile-performance-audit] sourceFiles=${sourceFiles.length} mutationObserverFiles=${observerInventory.length} mutationObservers=${observerInventory.reduce((sum, item) => sum + item.count, 0)}`);
observerInventory.forEach((item) => {
  console.log(`[mobile-performance-audit:observer] ${item.path} count=${item.count}`);
});
console.log(`[mobile-performance-audit] globalHighFrequencyListeners=${highFrequencyGlobalListeners.length}`);
highFrequencyGlobalListeners.forEach((item) => {
  console.log(`[mobile-performance-audit:listener] ${item.path}:${item.line} ${item.target}.${item.event} passiveOnLine=${item.passiveOnLine}`);
});
console.log('[mobile-performance-audit:classification] persistent-scoped=markResearchThreeColumnRepair,markResearchLayerBridge,crossReferenceToolbarBridge,LegacyModalAccessibilityBridge,ContextBibleScaffolding');
console.log('[mobile-performance-audit:classification] bounded=visitorCounterRepair,CanonicalConceptLauncher');
console.log('[mobile-performance-audit:classification] coalesced-existing=CanonicalConceptSuggestionPanel,CanonicalSemanticComparisonPanel');
console.log('[mobile-performance-audit:classification] touchmove-nonpassive-intentional=useModalDialog(background-scroll-lock)');
console.log('[mobile-performance-audit:classification] viewport-coalesced=useModalDialog+MobileModalFrame(scale=1,height-only,width=100%)');
console.log('[mobile-performance-audit:classification] canonical-tabs=horizontal-scroll-fallback');

if (issues.length) {
  console.error('✗ 모바일 안전 검증 실패');
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

console.log('✓ 모바일 안전·성능 규칙 통과 (멀티터치·공통 프레임·탭 fallback·전역 옵저버 축소·프레임 코얼레싱)');
