import { useMemo, useState } from 'react';
import {
  GuidedCourseCarousel,
  LensPicker,
  LensDetailPanel,
  OnboardingOverlay,
  useOnboarding,
  findLens,
  GlossaryText,
} from './ParallelStudyScaffolding';
import { CONTEXT_STUDY_LENSES } from '../data/contextStudyLenses';
import { CONTEXT_GUIDED_STUDIES } from '../data/contextGuidedStudies';
import { CONTEXT_ONBOARDING } from '../data/contextOnboardingScript';
import { CONTEXT_CHAPTER_CARDS } from '../data/contextChapterCards';

const DIFF_BADGE = {
  beginner: { label: '입문', bg: '#dcfce7', color: '#166534' },
  intermediate: { label: '중급', bg: '#fef3c7', color: '#92400e' },
  advanced: { label: '고급', bg: '#fee2e2', color: '#991b1b' },
};

export function useContextOnboarding() {
  return useOnboarding(CONTEXT_ONBOARDING, 'context-bible');
}

export function ContextOnboardingOverlay({ onDone }) {
  return (
    <OnboardingOverlay
      onDone={onDone}
      onboarding={CONTEXT_ONBOARDING}
      marker="data-context-onboarding"
    />
  );
}

function ContextActiveCoursePanel({ course, currentStepIdx, onStepClick, onExit }) {
  if (!course) return null;
  const diff = DIFF_BADGE[course.difficulty];
  return (
    <section style={{
      padding: 10, borderRadius: 10, marginBottom: 8,
      background: 'linear-gradient(135deg,#fef3c7,#fef9e7)',
      border: '1px solid #fbbf24',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{course.coverEmoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 800,
              background: diff.bg, color: diff.color }}>{diff.label}</span>
            <span style={{ fontSize: 10, color: '#78350f' }}>· {course.estimatedMinutes}분 · {course.book} {course.chapterRange?.[0]}{course.chapterRange && course.chapterRange[0] !== course.chapterRange[1] ? `-${course.chapterRange[1]}` : ''}장</span>
          </div>
          <strong style={{ display: 'block', fontSize: 12, color: '#78350f' }}>{course.title}</strong>
          <div style={{ fontSize: 10, color: '#92400e', marginTop: 2 }}>{course.subtitle}</div>
        </div>
        <button type="button" onClick={onExit} aria-label="코스 종료"
          style={{ border: 'none', background: 'transparent', color: '#78350f', fontSize: 11,
            cursor: 'pointer', padding: 4 }}>종료</button>
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#78350f', marginBottom: 3 }}>학습 목표</div>
      <ul style={{ margin: 0, paddingLeft: 15, fontSize: 10.5, color: '#78350f', lineHeight: 1.5 }}>
        {course.learningGoals.map((g, i) => <li key={i}><GlossaryText text={g} /></li>)}
      </ul>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#78350f', marginTop: 7, marginBottom: 3 }}>진행 스텝</div>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {course.steps.map((step, i) => {
          const active = i === currentStepIdx;
          const done = i < currentStepIdx;
          return (
            <li key={i}>
              <button type="button" onClick={() => onStepClick(i, step)}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '6px 8px', borderRadius: 6, fontSize: 10.5, lineHeight: 1.5,
                  background: active ? '#d97706' : done ? '#fde68a' : '#fffbeb',
                  color: active ? '#fff' : '#78350f',
                  border: `1px solid ${active ? '#d97706' : done ? '#fbbf24' : '#fde68a'}`,
                }}>
                <div style={{ fontWeight: 700, marginBottom: 1 }}>{done ? '✓ ' : ''}{step.title}{step.targetVerse ? ` · ${step.targetVerse}절` : ''}</div>
                <div style={{ opacity: active ? .95 : .8 }}>{step.prompt}</div>
              </button>
            </li>
          );
        })}
      </ol>
      <div style={{
        marginTop: 7, padding: '6px 8px', borderRadius: 6,
        background: '#78350f', color: '#fef3c7', fontSize: 10, lineHeight: 1.55,
      }}>
        <b>핵심 요지 · </b><GlossaryText text={course.keyTakeaway} style={{ color: '#fef3c7' }} />
      </div>
    </section>
  );
}

export function ContextChapterCard({ bookId, ch }) {
  const key = `${bookId}:${ch}`;
  const card = CONTEXT_CHAPTER_CARDS[key];
  if (!card) return null;
  return (
    <section data-context-chapter-card style={{
      padding: 10, borderRadius: 10, marginBottom: 8,
      background: '#f0f9ff', border: '1px solid #7dd3fc',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 16 }}>{card.coverEmoji}</span>
        <strong style={{ fontSize: 11.5, color: '#075985' }}>{bookId} {ch}장 관찰 카드</strong>
        <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
          background: '#0284c7', color: '#fff' }}>{card.genre}</span>
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#075985', marginBottom: 3 }}>이 장에서 관찰할 것</div>
      <ol style={{ margin: 0, paddingLeft: 15, fontSize: 10.5, color: '#0c4a6e', lineHeight: 1.5 }}>
        {card.observeThis.map((o, i) => <li key={i}><GlossaryText text={o} /></li>)}
      </ol>
      {card.discourseMarkers?.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#075985', marginTop: 7, marginBottom: 3 }}>담화 마커 신호</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {card.discourseMarkers.map((m, i) => (
              <div key={i} style={{
                padding: '4px 7px', borderRadius: 5, fontSize: 10, lineHeight: 1.4,
                background: '#e0f2fe', color: '#075985',
              }}>
                <b>{m.marker}</b> — {m.role} <span style={{ opacity: .7 }}>· {m.example}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ fontSize: 10, fontWeight: 800, color: '#075985', marginTop: 7, marginBottom: 3 }}>신학적 함의</div>
      <ol style={{ margin: 0, paddingLeft: 15, fontSize: 10.5, color: '#0c4a6e', lineHeight: 1.5 }}>
        {card.theologicalImplications.map((t, i) => <li key={i}><GlossaryText text={t} /></li>)}
      </ol>
      {card.nextChapterPreview && (
        <div style={{
          marginTop: 7, padding: '5px 8px', borderRadius: 5,
          background: '#bae6fd', color: '#075985', fontSize: 10, lineHeight: 1.5,
        }}>
          → 다음 · <GlossaryText text={card.nextChapterPreview} style={{ color: '#075985' }} />
        </div>
      )}
    </section>
  );
}

export function ContextBibleScaffoldingBar({
  isMobile, activeBookId, activeRef,
  activeCourse, currentStepIdx, selectedLensId,
  onSelectCourse, onExitCourse, onStepClick, onSelectLens,
  onReopenOnboarding,
}) {
  // 모바일에선 기본 접힘 — 본문 스크롤 영역 확보. 데스크톱은 기본 펼침.
  const [expanded, setExpanded] = useState(!isMobile);
  const selectedLens = useMemo(() => findLens(selectedLensId, CONTEXT_STUDY_LENSES), [selectedLensId]);
  const recommendedLensIds = activeCourse?.recommendedLensIds || [];

  return (
    <div style={{
      padding: isMobile ? '6px 12px 8px' : '6px 20px 8px',
      background: 'linear-gradient(180deg,#fffbeb,rgba(255,251,235,0))',
      borderBottom: '1px solid rgba(217,119,6,.15)',
      // 본문 영역(flex:1)이 0으로 눌리지 않도록 스트립이 양보(flexShrink:1)하고,
      // 확장 시 최대 높이를 낮춰 본문이 항상 스크롤 가능한 공간을 확보한다.
      flexShrink: 1,
      minHeight: 0,
      maxHeight: expanded ? (isMobile ? '40vh' : '42vh') : 'none',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 8px', border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#92400e',
            borderRadius: 6, textAlign: 'left',
          }}
        >
          <span>🎓 학습 스캐폴딩</span>
          <span style={{ fontSize: 9, color: '#a16207', fontWeight: 600 }}>
            {activeCourse ? `· 진행 중: ${activeCourse.title}` : '· 코스·렌즈·관찰 카드'}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#a16207' }}>{expanded ? '접기 ▲' : '펼치기 ▼'}</span>
        </button>
        {onReopenOnboarding && (
          <button
            type="button"
            onClick={onReopenOnboarding}
            data-context-onboarding-reopen
            aria-label="문맥 성경 사용법 안내 다시 보기"
            title="사용법 안내 다시 보기"
            style={{
              minHeight: 32, padding: '4px 8px', border: '1px solid #fbbf24',
              borderRadius: 6, background: '#fef3c7', color: '#78350f',
              fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
            }}
          >🎓 <span>안내</span></button>
        )}
      </div>

      {expanded && (
        <div
          style={{
            marginTop: 6,
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            paddingRight: 2,
          }}
        >
          <GuidedCourseCarousel
            activeCourseId={activeCourse?.id || null}
            onSelectCourse={onSelectCourse}
            isMobile={isMobile}
            courses={CONTEXT_GUIDED_STUDIES}
            marker="data-context-courses"
            headerLabel="문맥 성경 · 가이드 학습 코스"
            headerNote="· 담화·구조·핵심어를 순서대로 훈련"
          />
          {activeCourse && (
            <ContextActiveCoursePanel
              course={activeCourse}
              currentStepIdx={currentStepIdx}
              onStepClick={onStepClick}
              onExit={onExitCourse}
            />
          )}
          <LensPicker
            selectedLensId={selectedLensId}
            onSelect={onSelectLens}
            recommendedIds={recommendedLensIds}
            lenses={CONTEXT_STUDY_LENSES}
            marker="data-context-lens-picker"
          />
          {selectedLens && <LensDetailPanel lens={selectedLens} />}
          <ContextChapterCard bookId={activeBookId} ch={activeRef?.ch} />
        </div>
      )}
    </div>
  );
}
