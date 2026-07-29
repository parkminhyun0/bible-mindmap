import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_BOOKS } from '../src/data/bibleBooks.js';
import { CONTEXT_STUDY_LENSES } from '../src/data/contextStudyLenses.js';
import { CONTEXT_GUIDED_STUDIES } from '../src/data/contextGuidedStudies.js';
import { CONTEXT_ONBOARDING } from '../src/data/contextOnboardingScript.js';
import { RESEARCH_GLOSSARY_CONTEXT } from '../src/data/researchGlossaryContext.js';
import { CONTEXT_CHAPTER_CARDS } from '../src/data/contextChapterCards.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const issues = [];
const fail = (m) => issues.push(m);

const bookIds = new Set(ALL_BOOKS.map((b) => b.id));
const lensIds = new Set(CONTEXT_STUDY_LENSES.map((l) => l.id));

if (CONTEXT_STUDY_LENSES.length !== 8) fail(`contextStudyLenses: 8종 필요, ${CONTEXT_STUDY_LENSES.length}`);
for (const lens of CONTEXT_STUDY_LENSES) {
  for (const key of ['id','label','icon','tone','oneLiner','scholarTerm','uiHooks','prompts','workflow','watchOut','difficulty']) {
    if (!(key in lens)) fail(`lens ${lens.id||'?'}: ${key} 누락`);
  }
  if (!Array.isArray(lens.prompts) || lens.prompts.length < 3) fail(`lens ${lens.id}: prompts 3개 이상`);
  if (!Array.isArray(lens.workflow) || lens.workflow.length < 3) fail(`lens ${lens.id}: workflow 3단계 이상`);
  if (!Array.isArray(lens.uiHooks) || lens.uiHooks.length < 2) fail(`lens ${lens.id}: uiHooks 2개 이상 (실제 UI 요소)`);
  if (!['beginner','intermediate','advanced'].includes(lens.difficulty)) fail(`lens ${lens.id}: difficulty 값 오류`);
}

if (CONTEXT_GUIDED_STUDIES.length < 12) fail(`contextGuidedStudies: 12개 이상 필요, ${CONTEXT_GUIDED_STUDIES.length}`);
for (const course of CONTEXT_GUIDED_STUDIES) {
  for (const key of ['id','title','subtitle','difficulty','estimatedMinutes','book','chapterRange','recommendedLensIds','learningGoals','steps','keyTakeaway']) {
    if (!(key in course)) fail(`course ${course.id||'?'}: ${key} 누락`);
  }
  if (!bookIds.has(course.book)) fail(`course ${course.id}: 미등록 book "${course.book}"`);
  if (!Array.isArray(course.chapterRange) || course.chapterRange.length !== 2) fail(`course ${course.id}: chapterRange [start,end] 필요`);
  for (const lid of course.recommendedLensIds || []) {
    if (!lensIds.has(lid)) fail(`course ${course.id}: 미등록 렌즈 ${lid}`);
  }
  if (!Array.isArray(course.steps) || course.steps.length < 3) fail(`course ${course.id}: steps 3단계 이상`);
}

if (!CONTEXT_ONBOARDING.version || !Array.isArray(CONTEXT_ONBOARDING.steps) || CONTEXT_ONBOARDING.steps.length !== 3) {
  fail('contextOnboardingScript: version + 3단계 steps 필요');
}
const requiredSelectors = ['[data-context-book-index]','[data-context-courses]','[data-context-lens-picker]'];
const selectorsInOnboarding = new Set(CONTEXT_ONBOARDING.steps.map((s) => s.targetSelector));
for (const sel of requiredSelectors) {
  if (!selectorsInOnboarding.has(sel)) fail(`contextOnboardingScript: targetSelector "${sel}" 누락`);
}

if (RESEARCH_GLOSSARY_CONTEXT.length < 20) fail(`researchGlossaryContext: 20항 이상 필요, ${RESEARCH_GLOSSARY_CONTEXT.length}`);
const glossaryIds = new Set();
for (const g of RESEARCH_GLOSSARY_CONTEXT) {
  if (glossaryIds.has(g.id)) fail(`glossary: id 중복 ${g.id}`);
  glossaryIds.add(g.id);
  for (const key of ['id','term','shortDef','difficulty']) {
    if (!(key in g)) fail(`glossary ${g.id||'?'}: ${key} 누락`);
  }
}

const cardKeys = Object.keys(CONTEXT_CHAPTER_CARDS);
if (cardKeys.length < 30) fail(`contextChapterCards: 30개 이상 필요, ${cardKeys.length}`);
for (const key of cardKeys) {
  const [b, chStr] = key.split(':');
  if (!bookIds.has(b)) fail(`chapter card ${key}: 미등록 book`);
  const ch = Number(chStr);
  if (!Number.isInteger(ch) || ch < 1) fail(`chapter card ${key}: ch 정수 아님`);
  const card = CONTEXT_CHAPTER_CARDS[key];
  for (const k of ['observeThis','theologicalImplications']) {
    if (!Array.isArray(card[k]) || card[k].length < 3) fail(`chapter card ${key}: ${k} 3개 이상`);
  }
}

// UI 통합 마커
const scaffoldingPath = path.resolve(__dirname, '../src/components/ContextBibleScaffolding.jsx');
const modalPath = path.resolve(__dirname, '../src/components/ContextBibleModal.jsx');
const scaffoldingSource = fs.readFileSync(scaffoldingPath, 'utf8');
const modalSource = fs.readFileSync(modalPath, 'utf8');
for (const marker of ['data-context-chapter-card']) {
  if (!scaffoldingSource.includes(marker)) fail(`ContextBibleScaffolding 마커 누락: ${marker}`);
}
for (const marker of ['data-context-book-index']) {
  if (!modalSource.includes(marker)) fail(`ContextBibleModal 마커 누락: ${marker}`);
}
for (const name of ['ContextBibleScaffoldingBar','ContextOnboardingOverlay','useContextOnboarding','handleSelectContextCourse','handleContextStepClick','activeCourse','selectedLensId']) {
  if (!modalSource.includes(name)) fail(`ContextBibleModal에 ${name} 사용 흔적 없음`);
}
for (const helper of ['ContextBibleScaffoldingBar','ContextChapterCard','ContextOnboardingOverlay','useContextOnboarding']) {
  if (!scaffoldingSource.includes(`export function ${helper}`) && !scaffoldingSource.includes(`export const ${helper}`)) {
    fail(`ContextBibleScaffolding export 누락: ${helper}`);
  }
}

console.log(`문맥 성경 학습 스캐폴딩 verifier · lenses ${CONTEXT_STUDY_LENSES.length} · courses ${CONTEXT_GUIDED_STUDIES.length} · glossary ${RESEARCH_GLOSSARY_CONTEXT.length} · chapter cards ${cardKeys.length}`);

if (issues.length) {
  console.error('✗ 문맥 성경 스캐폴딩 검증 실패');
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

console.log('✓ 문맥 성경 학습 스캐폴딩 데이터·UI 통합 검증 통과');
