import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useMobile from '../hooks/useMobile';
import { parseReference } from '../utils/citationDetector';
import MorphologyKoreanCard from './MorphologyKoreanCard';

const WordSearchModal = lazy(() => import('./WordSearchModal'));
const SyntaxPanel = lazy(() => import('./SyntaxPanel'));
const ParallelStudyModal = lazy(() => import('./ParallelStudyModal'));

const STEP_LABELS = {
  concordance: '전체 성경 용례',
  syntax: '이 절 구문',
  parallel: '병렬 본문',
};

const FALLBACK_STYLE = {
  position: 'fixed',
  inset: 0,
  zIndex: 9001,
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(15,23,42,.42)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
};

function resolvePassageFromAnchor(anchor) {
  if (typeof document === 'undefined' || !anchor) return null;
  const x = Number(anchor.x);
  const y = Number(anchor.y) - 6;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const elements = document.elementsFromPoint(x, Math.max(0, y));
  for (const element of elements) {
    const root = element.closest?.('[data-annotation-root]');
    if (!root) continue;
    const headerText = root.firstElementChild?.textContent?.replace(/^\s*📖\s*/, '').trim();
    const parsed = headerText ? parseReference(headerText) : null;
    if (!parsed) continue;
    return {
      bookId: parsed.book,
      chapter: parsed.chapter,
      verseStart: parsed.verseStart,
      verseEnd: parsed.verseEnd || parsed.verseStart,
    };
  }
  return null;
}

export default function OriginalLanguageResearchActions({
  entry,
  anchor,
  passage,
  isHebrew,
  onActiveChange,
}) {
  const isMobile = useMobile();
  const [step, setStep] = useState(null);
  const [sourcePassage] = useState(() => passage || resolvePassageFromAnchor(anchor));
  const returnFocusRef = useRef(null);

  const hasPassage = Boolean(
    sourcePassage?.bookId
      && Number(sourcePassage?.chapter)
      && Number(sourcePassage?.verseStart),
  );
  const query = entry?.l || entry?.w || entry?.s || '';

  useEffect(() => () => onActiveChange?.(false), [onActiveChange]);

  if (!entry) return null;

  const openStep = (nextStep, event) => {
    returnFocusRef.current = event.currentTarget;
    onActiveChange?.(true);
    setStep(nextStep);
  };

  const closeStep = () => {
    setStep(null);
    onActiveChange?.(false);
    requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  const buttonStyle = {
    minHeight: isMobile ? 44 : 36,
    padding: isMobile ? '9px 10px' : '7px 9px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    background: '#fff',
    color: '#334155',
    fontSize: isMobile ? 12 : 11,
    fontWeight: 750,
    cursor: 'pointer',
    touchAction: 'manipulation',
  };

  const loading = (
    <div style={FALLBACK_STYLE} role="status" aria-live="polite">
      원어 연구 도구를 불러오는 중…
    </div>
  );

  return (
    <>
      <div style={{ padding: '0 12px 10px', background: '#fff' }}>
        <MorphologyKoreanCard code={entry.m} isHebrew={isHebrew} />
      </div>

      {hasPassage && (
        <section
          aria-label="원어 단어 연구 이어가기"
          data-original-language-research-actions
          data-origin-passage={`${sourcePassage.bookId}-${sourcePassage.chapter}-${sourcePassage.verseStart}-${sourcePassage.verseEnd}`}
          style={{
            padding: '9px 12px',
            borderTop: '1px solid #e2e8f0',
            background: isHebrew ? '#fffbeb' : '#eff6ff',
          }}
        >
          <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 800, color: '#64748b' }}>
            이 단어로 연구 이어가기
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,minmax(0,1fr))', gap: 6 }}>
            <button
              type="button"
              aria-haspopup="dialog"
              data-original-research-action="concordance"
              onClick={(event) => openStep('concordance', event)}
              style={buttonStyle}
            >
              🔎 전체 성경 용례
            </button>
            <button
              type="button"
              aria-haspopup="dialog"
              data-original-research-action="syntax"
              onClick={(event) => openStep('syntax', event)}
              style={buttonStyle}
            >
              🔤 이 절 구문
            </button>
            <button
              type="button"
              aria-haspopup="dialog"
              data-original-research-action="parallel"
              onClick={(event) => openStep('parallel', event)}
              style={buttonStyle}
            >
              ⇄ 병렬 본문
            </button>
          </div>
        </section>
      )}

      <span
        aria-live="polite"
        style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
      >
        {step ? `${STEP_LABELS[step]} 연구 단계가 열렸습니다.` : ''}
      </span>

      {step === 'concordance' && createPortal(
        <Suspense fallback={loading}>
          <WordSearchModal
            initialQuery={query}
            initialMode="original"
            onClose={closeStep}
          />
        </Suspense>,
        document.body,
      )}

      {step === 'syntax' && (
        <Suspense fallback={loading}>
          <SyntaxPanel passage={sourcePassage} onClose={closeStep} panelIndex={0} />
        </Suspense>
      )}

      {step === 'parallel' && (
        <Suspense fallback={loading}>
          <ParallelStudyModal initialRef={sourcePassage} onClose={closeStep} />
        </Suspense>
      )}
    </>
  );
}
