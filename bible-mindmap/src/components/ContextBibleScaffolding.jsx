import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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

const CARD_FONT_MIN = 10;
const CARD_FONT_MAX = 24;
// 사용자 피드백: 기본 12는 특히 모바일에서 너무 작음 → 모바일 14, 데스크톱 13.
const CARD_FONT_DEFAULT_MOBILE = 14;
const CARD_FONT_DEFAULT_DESKTOP = 13;

function resolveContextFontHost() {
  if (typeof document === 'undefined') return { host: null, compact: false };
  const dialog = Array.from(document.querySelectorAll('[role="dialog"]'))
    .find((node) => (node.getAttribute('aria-label') || '').startsWith('문맥 성경'));
  if (!dialog) return { host: null, compact: false };

  // 데스크톱: 기존 [배경] 스테퍼의 부모가 전체 폰트 패널이다.
  // 그 패널 끝에 portal 하면 [배경] 오른쪽에 동일한 형식으로 배치된다.
  const bgIncrease = dialog.querySelector('button[title="배경 크게"]');
  const desktopHost = bgIncrease?.parentElement?.parentElement?.parentElement || null;
  if (desktopHost) return { host: desktopHost, compact: false };

  // 모바일: legendOpen 시 나타나는 Aa 가로 스크롤 스트립을 찾는다.
  const mobileAa = Array.from(dialog.querySelectorAll('span')).find((node) => {
    if (node.textContent?.trim() !== 'Aa') return false;
    const row = node.parentElement;
    return !!row?.querySelector('button');
  });
  return { host: mobileAa?.parentElement || null, compact: true };
}

function useContextFontHost() {
  const [target, setTarget] = useState({ host: null, compact: false });

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return undefined;
    let raf = 0;
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = resolveContextFontHost();
        setTarget((prev) => (
          prev.host === next.host && prev.compact === next.compact ? prev : next
        ));
      });
    };

    sync();
    // 문맥 성경 모달 하위만 관찰(전체 body 관찰은 오버헤드 큼).
    const dialog = Array.from(document.querySelectorAll('[role="dialog"]'))
      .find((n) => (n.getAttribute('aria-label') || '').startsWith('문맥 성경'));
    const observer = new MutationObserver(sync);
    observer.observe(dialog || document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return target;
}

// 문맥 성경 폰트 패널(host)에 추가로 스테퍼를 붙일 때 재사용 (관찰카드·구조지도 등).
// eslint-disable-next-line react-refresh/only-export-components
export { useContextFontHost };
// eslint-disable-next-line react-refresh/only-export-components
export function ContextExtraFontControl({ label, value, onBump, compact }) {
  return <ContextCardFontControl value={value} onBump={onBump} compact={compact} label={label} />;
}

function ContextCardFontControl({ value, onBump, compact, label = '관찰카드' }) {
  if (compact) {
    return (
      <div data-context-card-font-control style={{
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'rgba(255,255,255,.7)',
        border: '1px solid rgba(212,153,79,.3)',
        borderRadius: 8, padding: '2px 4px', flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#8A6027', padding: '0 4px' }}>{label}</span>
        <button type="button" onClick={() => onBump(-1)} title={`${label} 작게`} aria-label={`${label} 글자 작게`}
          style={{ minWidth: 28, minHeight: 28, background: 'transparent', border: 'none', color: '#8A6027',
            fontSize: 14, fontWeight: 800, cursor: 'pointer', borderRadius: 6, touchAction: 'manipulation' }}>−</button>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#4A3210', minWidth: 16, textAlign: 'center',
          fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        <button type="button" onClick={() => onBump(1)} title={`${label} 크게`} aria-label={`${label} 글자 크게`}
          style={{ minWidth: 28, minHeight: 28, background: 'transparent', border: 'none', color: '#8A6027',
            fontSize: 14, fontWeight: 800, cursor: 'pointer', borderRadius: 6, touchAction: 'manipulation' }}>+</button>
      </div>
    );
  }

  const stepButton = {
    width: 24, height: 24, border: 'none', background: 'transparent', color: '#8A6027',
    fontSize: 14, fontWeight: 600, lineHeight: 1, cursor: 'pointer', padding: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background .12s, color .12s',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  };
  const hoverOn = (event) => {
    event.currentTarget.style.background = 'rgba(212,153,79,.22)';
    event.currentTarget.style.color = '#4A3210';
  };
  const hoverOff = (event) => {
    event.currentTarget.style.background = 'transparent';
    event.currentTarget.style.color = '#8A6027';
  };

  return (
    <div data-context-card-font-control style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        fontSize: 10.5, fontWeight: 700, color: '#8A6027', letterSpacing: '.01em',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif",
      }}>{label}</span>
      <div style={{
        display: 'inline-flex', alignItems: 'stretch', background: 'rgba(212,153,79,.09)',
        border: '1px solid rgba(212,153,79,.32)', borderRadius: 7, overflow: 'hidden', height: 24,
      }}>
        <button type="button" onClick={() => onBump(-1)} onMouseEnter={hoverOn} onMouseLeave={hoverOff}
          title={`${label} 작게`} aria-label={`${label} 글자 작게`} style={stepButton}>−</button>
        <span style={{
          fontSize: 11.5, fontWeight: 700, color: '#4A3210', minWidth: 22, padding: '0 4px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums',
          fontFamily: "'SF Mono', 'JetBrains Mono', 'Menlo', ui-monospace, monospace",
          borderLeft: '1px solid rgba(212,153,79,.32)', borderRight: '1px solid rgba(212,153,79,.32)',
          background: 'rgba(255,251,243,.85)',
        }}>{value}</span>
        <button type="button" onClick={() => onBump(1)} onMouseEnter={hoverOn} onMouseLeave={hoverOff}
          title={`${label} 크게`} aria-label={`${label} 글자 크게`} style={stepButton}>+</button>
      </div>
    </div>
  );
}

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
  const { host: fontHost, compact } = useContextFontHost();
  // compact=true 는 모바일 legend 스트립을 뜻하므로 그것으로 기본 크기를 정한다.
  const [fontSize, setFontSize] = useState(compact ? CARD_FONT_DEFAULT_MOBILE : CARD_FONT_DEFAULT_DESKTOP);
  const bumpCardFont = (delta) => {
    setFontSize((prev) => Math.max(CARD_FONT_MIN, Math.min(CARD_FONT_MAX, prev + delta)));
  };
  const fontControl = fontHost
    ? createPortal(<ContextCardFontControl value={fontSize} onBump={bumpCardFont} compact={compact} />, fontHost)
    : null;

  const key = `${bookId}:${ch}`;
  const card = CONTEXT_CHAPTER_CARDS[key];
  const titleSize = Math.min(CARD_FONT_MAX + 1, fontSize + 1);
  const badgeSize = Math.max(9, fontSize - 2);
  const sectionSize = Math.max(10, fontSize - 1);
  const detailSize = Math.max(10, fontSize - 0.5);

  return (
    <>
      {fontControl}
      {card && (
        <section data-context-chapter-card style={{
          padding: 10, borderRadius: 10, marginBottom: 8,
          background: '#f0f9ff', border: '1px solid #7dd3fc',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: Math.max(17, fontSize + 5) }}>{card.coverEmoji}</span>
            <strong style={{ fontSize: titleSize, color: '#075985', lineHeight: 1.35 }}>{bookId} {ch}장 관찰 카드</strong>
            <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: badgeSize, fontWeight: 700,
              background: '#0284c7', color: '#fff' }}>{card.genre}</span>
          </div>
          <div style={{ fontSize: sectionSize, fontWeight: 800, color: '#075985', marginBottom: 4 }}>이 장에서 관찰할 것</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize, color: '#0c4a6e', lineHeight: 1.58 }}>
            {card.observeThis.map((o, i) => <li key={i}><GlossaryText text={o} /></li>)}
          </ol>
          {card.discourseMarkers?.length > 0 && (
            <>
              <div style={{ fontSize: sectionSize, fontWeight: 800, color: '#075985', marginTop: 8, marginBottom: 4 }}>담화 마커 신호</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {card.discourseMarkers.map((m, i) => (
                  <div key={i} style={{
                    padding: '5px 8px', borderRadius: 5, fontSize: detailSize, lineHeight: 1.5,
                    background: '#e0f2fe', color: '#075985',
                  }}>
                    <b>{m.marker}</b> — {m.role} <span style={{ opacity: .7 }}>· {m.example}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div style={{ fontSize: sectionSize, fontWeight: 800, color: '#075985', marginTop: 8, marginBottom: 4 }}>신학적 함의</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize, color: '#0c4a6e', lineHeight: 1.58 }}>
            {card.theologicalImplications.map((t, i) => <li key={i}><GlossaryText text={t} /></li>)}
          </ol>
          {card.nextChapterPreview && (
            <div style={{
              marginTop: 8, padding: '6px 9px', borderRadius: 5,
              background: '#bae6fd', color: '#075985', fontSize: detailSize, lineHeight: 1.55,
            }}>
              → 다음 · <GlossaryText text={card.nextChapterPreview} style={{ color: '#075985' }} />
            </div>
          )}
        </section>
      )}
    </>
  );
}

export function ContextBibleScaffoldingBar({
  isMobile, activeBookId, activeRef,
  activeCourse, currentStepIdx, selectedLensId,
  onSelectCourse, onExitCourse, onStepClick, onSelectLens,
  onReopenOnboarding,
}) {
  // 기본 접힘 — 본문 스크롤 영역 확보. 사용자가 '펼치기'로 선택적으로 연다.
  const [expanded, setExpanded] = useState(false);
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
            padding: expanded ? '5px 8px' : '7px 10px',
            border: expanded ? 'none' : '1px solid #b91c1c',
            background: expanded ? 'transparent' : '#dc2626',
            cursor: 'pointer', fontSize: 11, fontWeight: 800,
            color: expanded ? '#92400e' : '#ffffff',
            borderRadius: 6, textAlign: 'left',
            boxShadow: expanded ? 'none' : '0 1px 3px rgba(220,38,38,.35)',
          }}
        >
          <span>🎓 학습 스캐폴딩</span>
          <span style={{ fontSize: 9, color: expanded ? '#a16207' : 'rgba(255,255,255,.85)', fontWeight: 600 }}>
            {activeCourse ? `· 진행 중: ${activeCourse.title}` : '· 코스·렌즈·관찰 카드'}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: expanded ? 10 : 11.5, fontWeight: expanded ? 500 : 800, color: expanded ? '#a16207' : '#ffffff' }}>{expanded ? '접기 ▲' : '펼치기 ▼'}</span>
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
          {/* 관찰 카드는 오른쪽 분석 패널로 이동(ContextBibleModal) — 본문 세로 공간 확보 */}
        </div>
      )}
    </div>
  );
}
