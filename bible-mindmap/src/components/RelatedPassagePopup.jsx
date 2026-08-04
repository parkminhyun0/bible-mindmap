import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchAllTranslations, fetchVerseCount } from '../api/bibleApi';
import { getBook, isOT } from '../data/bibleBooks';
import useMobile from '../hooks/useMobile';
import PassageAnnotationPin from './PassageAnnotationPin';
import ParallelStudyModal from './ParallelStudyModal';

const TABS = [
  { id: 'krv', label: '개역한글' },
  { id: 'web', label: 'WEB' },
  { id: 'original', label: '원어' },
];

const VIEWPORT_MARGIN = 16;
const ANCHOR_GAP = 14;
const DESKTOP_WIDTH = 620;
const DESKTOP_HEIGHT = 520;

function clampPosition(position, width = DESKTOP_WIDTH, height = DESKTOP_HEIGHT) {
  const safeWidth = Math.min(width, window.innerWidth - VIEWPORT_MARGIN * 2);
  const safeHeight = Math.min(height, window.innerHeight - VIEWPORT_MARGIN * 2);
  return {
    x: Math.max(VIEWPORT_MARGIN, Math.min(position.x, window.innerWidth - safeWidth - VIEWPORT_MARGIN)),
    y: Math.max(VIEWPORT_MARGIN, Math.min(position.y, window.innerHeight - safeHeight - VIEWPORT_MARGIN)),
  };
}

function overlaps(a, b) {
  return !(
    a.right <= b.left
    || a.left >= b.right
    || a.bottom <= b.top
    || a.top >= b.bottom
  );
}

function findSelectedCanvasRect() {
  const selected = document.querySelector('.react-flow__node.selected, .react-flow__node[aria-selected="true"]');
  return selected?.getBoundingClientRect?.() || null;
}

function anchoredPosition(anchorRect, width = DESKTOP_WIDTH, height = DESKTOP_HEIGHT) {
  if (!anchorRect) {
    return clampPosition({ x: Math.max(24, window.innerWidth / 2 - width / 2), y: 84 }, width, height);
  }

  const candidates = [
    {
      side: 'right',
      x: anchorRect.right + ANCHOR_GAP,
      y: anchorRect.top,
    },
    {
      side: 'left',
      x: anchorRect.left - width - ANCHOR_GAP,
      y: anchorRect.top,
    },
    {
      side: 'bottom',
      x: anchorRect.left,
      y: anchorRect.bottom + ANCHOR_GAP,
    },
    {
      side: 'top',
      x: anchorRect.left,
      y: anchorRect.top - height - ANCHOR_GAP,
    },
  ];

  const fitsViewport = (candidate) => (
    candidate.x >= VIEWPORT_MARGIN
    && candidate.y >= VIEWPORT_MARGIN
    && candidate.x + width <= window.innerWidth - VIEWPORT_MARGIN
    && candidate.y + height <= window.innerHeight - VIEWPORT_MARGIN
  );

  const nonOverlapping = candidates.find((candidate) => {
    if (!fitsViewport(candidate)) return false;
    const popupRect = {
      left: candidate.x,
      top: candidate.y,
      right: candidate.x + width,
      bottom: candidate.y + height,
    };
    return !overlaps(popupRect, anchorRect);
  });

  if (nonOverlapping) return nonOverlapping;

  const fallback = candidates
    .map((candidate) => {
      const clamped = clampPosition(candidate, width, height);
      const popupRect = {
        left: clamped.x,
        top: clamped.y,
        right: clamped.x + width,
        bottom: clamped.y + height,
      };
      const overlapWidth = Math.max(0, Math.min(popupRect.right, anchorRect.right) - Math.max(popupRect.left, anchorRect.left));
      const overlapHeight = Math.max(0, Math.min(popupRect.bottom, anchorRect.bottom) - Math.max(popupRect.top, anchorRect.top));
      return { ...clamped, side: candidate.side, overlapArea: overlapWidth * overlapHeight };
    })
    .sort((a, b) => a.overlapArea - b.overlapArea)[0];

  return fallback || clampPosition({ x: 24, y: 84 }, width, height);
}

export default function RelatedPassagePopup({ initialRef, onClose }) {
  const isMobile = useMobile();
  const book = getBook(initialRef.bookId);
  const firstChapter = initialRef.ch || 1;
  const lastChapter = initialRef.chapterEnd || firstChapter;
  const [chapter, setChapter] = useState(firstChapter);
  const [activeTab, setActiveTab] = useState('krv');
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showParallelStudy, setShowParallelStudy] = useState(false);
  const [position, setPosition] = useState(() =>
    anchoredPosition(findSelectedCanvasRect()),
  );
  const [manuallyPositioned, setManuallyPositioned] = useState(false);
  const dragRef = useRef(null);
  const contentRef = useRef(null);
  const popupRef = useRef(null);

  const isSingleChapterSelection = firstChapter === lastChapter;
  const range = useMemo(() => {
    if (isSingleChapterSelection && initialRef.verse) {
      return {
        start: initialRef.verse,
        end: initialRef.verseEnd || initialRef.verse,
      };
    }
    return { start: 1, end: null };
  }, [initialRef, isSingleChapterSelection]);
  const [resolvedVerseEnd, setResolvedVerseEnd] = useState(range.end || null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const load = async () => {
      const verseEnd = range.end || await fetchVerseCount(initialRef.bookId, chapter);
      if (!verseEnd) throw new Error('본문의 절 범위를 확인하지 못했습니다.');
      if (!cancelled) setResolvedVerseEnd(verseEnd);
      return fetchAllTranslations(initialRef.bookId, chapter, range.start, verseEnd);
    };

    load()
      .then((result) => {
        if (cancelled) return;
        setTranslations(result);
        if (!result.krv && !result.web && !result.original) {
          setError('본문을 불러오지 못했습니다.');
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || '본문을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [chapter, initialRef.bookId, range]);

  useEffect(() => {
    if (isMobile || manuallyPositioned) return undefined;

    const placeBesideSelection = () => {
      const popupRect = popupRef.current?.getBoundingClientRect?.();
      setPosition(anchoredPosition(
        findSelectedCanvasRect(),
        popupRect?.width || DESKTOP_WIDTH,
        popupRect?.height || DESKTOP_HEIGHT,
      ));
    };

    const frame = requestAnimationFrame(placeBesideSelection);
    window.addEventListener('resize', placeBesideSelection);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', placeBesideSelection);
    };
  }, [isMobile, initialRef, manuallyPositioned]);

  useEffect(() => {
    if (isMobile) return undefined;
    const move = (event) => {
      if (!dragRef.current) return;
      const popupRect = popupRef.current?.getBoundingClientRect?.();
      setPosition(clampPosition({
        x: event.clientX - dragRef.current.offsetX,
        y: event.clientY - dragRef.current.offsetY,
      }, popupRect?.width || DESKTOP_WIDTH, popupRect?.height || DESKTOP_HEIGHT));
    };
    const end = () => { dragRef.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
    };
  }, [isMobile]);

  const displayText = translations[activeTab];
  const isHtml = typeof displayText === 'string' && displayText.includes('<');
  const referenceLabel = isSingleChapterSelection
    ? `${book?.ko || initialRef.bookId} ${chapter}:${range.start}${range.end !== range.start ? `-${range.end}` : ''}`
    : `${book?.ko || initialRef.bookId} ${chapter}장`;

  const parallelInitialRef = {
    bookId: initialRef.bookId,
    chapter,
    verseStart: range.start,
    verseEnd: resolvedVerseEnd || range.end || range.start,
    reference: referenceLabel,
  };

  return (
    <>
      <div
        ref={popupRef}
        role="dialog"
        aria-modal={isMobile ? 'true' : 'false'}
        aria-label={`${initialRef.reference || referenceLabel} 본문`}
        className={isMobile ? 'mobile-reader-dialog mobile-related-passage-sheet' : undefined}
        style={{
          position: 'fixed',
          left: isMobile ? 0 : position.x,
          top: isMobile ? 'auto' : position.y,
          right: isMobile ? 0 : undefined,
          bottom: isMobile ? 0 : undefined,
          zIndex: 2400,
          width: isMobile ? '100%' : 'min(620px, calc(100vw - 32px))',
          height: isMobile ? 'min(52dvh, 560px)' : undefined,
          maxHeight: isMobile ? 'calc(100dvh - 72px)' : 'min(72vh, 680px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: isMobile ? '1px solid #bfdbfe' : '1.5px solid #2563eb',
          borderBottom: isMobile ? 'none' : undefined,
          borderRadius: isMobile ? '20px 20px 0 0' : 14,
          background: '#fff',
          boxShadow: isMobile
            ? '0 -16px 44px rgba(15,23,42,0.24)'
            : '0 18px 52px rgba(15,23,42,0.28)',
          fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
        }}
      >
        {isMobile && (
          <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, background: '#dbeafe' }}>
            <span style={{ width: 40, height: 4, borderRadius: 999, background: '#93c5fd' }} />
          </div>
        )}
        <div
          onPointerDown={(event) => {
            if (isMobile) return;
            if (event.button !== 0) return;
            const rect = event.currentTarget.parentElement.getBoundingClientRect();
            dragRef.current = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
            setManuallyPositioned(true);
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          style={{
            minHeight: isMobile ? 52 : 42,
            padding: isMobile
              ? '6px 10px 8px 14px'
              : '7px 8px 7px 13px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#1d4ed8',
            background: '#dbeafe',
            borderBottom: '1px solid #93c5fd',
            cursor: isMobile ? 'default' : 'grab',
            userSelect: 'none',
          }}
          title={isMobile ? undefined : '상단바를 드래그해 이동'}
        >
          <span>📖</span>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 800 }}>
            교차 참조 · {initialRef.reference || referenceLabel}
          </span>
          {!isMobile && <span style={{ fontSize: 10, opacity: 0.62 }}>⋮⋮ 이동</span>}
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onClose}
            aria-label="본문 팝업 닫기"
            style={{
              width: isMobile ? 40 : 26, height: isMobile ? 40 : 26, padding: 0, display: 'grid', placeItems: 'center',
              border: 'none', borderRadius: 7, background: 'rgba(255,255,255,0.8)',
              color: '#1d4ed8', cursor: 'pointer', fontSize: 18,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: isMobile ? '10px 14px 0' : '10px 14px 0', background: '#fff' }}>
          {!isSingleChapterSelection && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
              <button type="button" disabled={chapter <= firstChapter} onClick={() => setChapter((value) => value - 1)}>← 이전 장</button>
              <select value={chapter} onChange={(event) => setChapter(Number(event.target.value))}>
                {Array.from({ length: lastChapter - firstChapter + 1 }, (_, index) => firstChapter + index)
                  .map((value) => <option key={value} value={value}>{value}장</option>)}
              </select>
              <button type="button" disabled={chapter >= lastChapter} onClick={() => setChapter((value) => value + 1)}>다음 장 →</button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <strong style={{ marginRight: 6, color: '#1e3a8a', fontSize: 13 }}>{referenceLabel}</strong>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '4px 9px', border: 'none', borderRadius: 6, cursor: 'pointer',
                  background: activeTab === tab.id ? '#2563eb' : '#eff6ff',
                  color: activeTab === tab.id ? '#fff' : '#475569',
                  fontWeight: activeTab === tab.id ? 800 : 500, fontSize: 11,
                }}
              >
                {tab.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowParallelStudy(true)}
              disabled={!resolvedVerseEnd}
              title="이 본문을 기준으로 공관복음·구약↔신약·인용·반향 본문을 비교"
              style={{
                minHeight: isMobile ? 36 : 28,
                padding: isMobile ? '5px 10px' : '4px 9px',
                border: '1px solid #c4b5fd', borderRadius: 6,
                background: '#f5f3ff', color: '#6d28d9', cursor: resolvedVerseEnd ? 'pointer' : 'default',
                fontWeight: 800, fontSize: 11, opacity: resolvedVerseEnd ? 1 : .45,
              }}
            >
              ⇄ 병렬 연구
            </button>
            {resolvedVerseEnd && (
              <PassageAnnotationPin
                passage={{
                  bookId: initialRef.bookId,
                  chapter,
                  verseStart: range.start,
                  verseEnd: resolvedVerseEnd,
                }}
                referenceLabel={referenceLabel}
                translationId={activeTab}
                selectionRootRef={contentRef}
              />
            )}
          </div>
        </div>

        <div
          ref={contentRef}
          data-annotation-root
          style={{
            padding: isMobile
              ? '14px 17px calc(env(safe-area-inset-bottom, 0px) + 18px)'
              : '13px 16px 18px',
            flex: 1,
            overflow: 'auto',
            color: '#1e293b',
            fontSize: isMobile ? 15 : 14,
            lineHeight: isMobile ? 1.85 : 1.8,
            userSelect: 'text',
            cursor: 'text',
            direction: activeTab === 'original' && isOT(initialRef.bookId) ? 'rtl' : 'ltr',
          }}
        >
          {loading ? (
            <span style={{ color: '#94a3b8' }}>본문을 불러오는 중…</span>
          ) : error || !displayText ? (
            <span style={{ color: '#dc2626' }}>{error || '선택한 역본을 불러오지 못했습니다.'}</span>
          ) : isHtml ? (
            <div className="rich-text-display" dangerouslySetInnerHTML={{ __html: displayText }} />
          ) : (
            displayText
          )}
        </div>
      </div>

      {showParallelStudy && (
        <ParallelStudyModal
          initialRef={parallelInitialRef}
          onClose={() => setShowParallelStudy(false)}
        />
      )}
    </>
  );
}
