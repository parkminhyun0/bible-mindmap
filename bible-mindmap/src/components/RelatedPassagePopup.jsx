import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchAllTranslations, fetchVerseCount } from '../api/bibleApi';
import { getBook, isOT } from '../data/bibleBooks';
import useMobile from '../hooks/useMobile';
import PassageAnnotationPin from './PassageAnnotationPin';

const TABS = [
  { id: 'krv', label: '개역한글' },
  { id: 'esv', label: 'ESV' },
  { id: 'original', label: '원어' },
];

function clampPosition(position, width = 620, height = 360) {
  return {
    x: Math.max(12, Math.min(position.x, window.innerWidth - Math.min(width, window.innerWidth - 24))),
    y: Math.max(12, Math.min(position.y, window.innerHeight - Math.min(height, window.innerHeight - 24))),
  };
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
  const [position, setPosition] = useState(() =>
    clampPosition({ x: Math.max(24, window.innerWidth / 2 - 310), y: 84 }),
  );
  const dragRef = useRef(null);
  const contentRef = useRef(null);

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
        if (!result.krv && !result.esv && !result.original) {
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
    if (isMobile) return undefined;
    const move = (event) => {
      if (!dragRef.current) return;
      setPosition(clampPosition({
        x: event.clientX - dragRef.current.offsetX,
        y: event.clientY - dragRef.current.offsetY,
      }));
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

  return (
    <div
      role="dialog"
      aria-modal={isMobile ? 'true' : 'false'}
      aria-label={`${initialRef.reference || referenceLabel} 본문`}
      className={isMobile ? 'h-screen-safe mobile-reader-dialog' : undefined}
      style={{
        position: 'fixed',
        left: isMobile ? 0 : position.x,
        top: isMobile ? 0 : position.y,
        right: isMobile ? 0 : undefined,
        bottom: isMobile ? 0 : undefined,
        zIndex: 2400,
        width: isMobile ? '100%' : 'min(620px, calc(100vw - 24px))',
        maxHeight: isMobile ? '100dvh' : 'min(72vh, 680px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: isMobile ? 'none' : '1.5px solid #2563eb',
        borderRadius: isMobile ? 0 : 14,
        background: '#fff',
        boxShadow: '0 18px 52px rgba(15,23,42,0.28)',
        fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
      }}
    >
      <div
        onPointerDown={(event) => {
          if (isMobile) return;
          if (event.button !== 0) return;
          const rect = event.currentTarget.parentElement.getBoundingClientRect();
          dragRef.current = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        style={{
          minHeight: isMobile ? 56 : 42,
          padding: isMobile
            ? 'calc(env(safe-area-inset-top, 0px) + 8px) 10px 8px 14px'
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
          관련 성경 본문 · {initialRef.reference || referenceLabel}
        </span>
        {!isMobile && <span style={{ fontSize: 10, opacity: 0.62 }}>⋮⋮ 이동</span>}
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          aria-label="본문 팝업 닫기"
          style={{
            width: isMobile ? 44 : 26, height: isMobile ? 44 : 26, padding: 0, display: 'grid', placeItems: 'center',
            border: 'none', borderRadius: 7, background: 'rgba(255,255,255,0.8)',
            color: '#1d4ed8', cursor: 'pointer', fontSize: 18,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: isMobile ? '12px 14px 0' : '10px 14px 0', background: '#fff' }}>
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
            ? '15px 17px calc(env(safe-area-inset-bottom, 0px) + 24px)'
            : '13px 16px 18px',
          flex: 1,
          overflow: 'auto',
          color: '#1e293b',
          fontSize: isMobile ? 16 : 14,
          lineHeight: isMobile ? 1.9 : 1.8,
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
  );
}
