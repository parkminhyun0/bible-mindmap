import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CANONICAL_CONCEPTS, CONCEPT_CATEGORIES } from '../data/canonicalConcepts';
import { getBook } from '../data/bibleBooks';
import { useCanvas } from '../context/CanvasContext';
import useMobile from '../hooks/useMobile';
import LexiconPopup from './LexiconPopup';
import VersePreviewPopup from './VersePreviewPopup';

/**
 * 정경 추적 · 핵심 개념 카드 (파일럿 6개).
 * 하나의 개념이 창세기→요한계시록으로 계시·성취되는 흐름을 4개 탭으로 제시:
 *   📜 정경 흐름 · 🗺️ 용례 지도 · 🔤 원문 분석 · ✝️ 신학 해설
 * 데스크톱: 헤더 드래그 이동 · 우하단 리사이즈 · 축소(헤더만).
 * 글자 크기: 창 안 [타이틀][분류텍스트][본문] 단위별 −/+ 스테퍼 (문맥 성경과 동일, 최대 50pt).
 * 모바일: 하단 시트.
 * 데이터: src/data/canonicalConcepts.js (CANONICAL_CONCEPTS)
 */

// 언약 라벨/색상
const COVENANTS = {
  adamic:    { ko: '아담 언약', color: '#78716c' },
  noahic:    { ko: '노아 언약', color: '#0891b2' },
  abrahamic: { ko: '아브라함 언약', color: '#7c3aed' },
  mosaic:    { ko: '모세(시내) 언약', color: '#d97706' },
  davidic:   { ko: '다윗 언약', color: '#2563eb' },
  new:       { ko: '새 언약', color: '#dc2626' },
  none:      { ko: '—', color: '#94a3b8' },
};

// 연결 등급(근거 강도) A~E
const CONNECTIONS = {
  A: { ko: '직접 인용', desc: '신약이 이 본문을 명시적으로 인용', color: '#dc2626' },
  B: { ko: '명시적 성취', desc: '본문이 성취·모형 관계를 직접 진술', color: '#ea580c' },
  C: { ko: '언약적 발전', desc: '언약 구조를 따라 주제가 전진', color: '#d97706' },
  D: { ko: '주제적 반향', desc: '동일 주제·모티프의 재등장', color: '#059669' },
  E: { ko: '예표적 암시', desc: '원형·그림자 수준의 예표', color: '#6b7280' },
};

// 정경 타임라인(심화) — 언약 시대 순서. 각 개념의 arc가 어느 언약 시대에 활동하는지 교차 색인한다.
const COVENANT_ORDER = ['adamic', 'noahic', 'abrahamic', 'mosaic', 'davidic', 'new'];

const FONT_MIN = 9;
const FONT_MAX = 50;

function parseRef(ref) {
  const [bookId, ch, v] = String(ref).split(':');
  return { bookId, chapter: Number(ch), verse: Number(v) };
}

export default function CanonicalConceptModal({ initialConcept = null, onClose }) {
  const isMobile = useMobile();
  const { onAddVerse } = useCanvas() || {};
  const keys = useMemo(() => Object.keys(CANONICAL_CONCEPTS), []);
  const [active, setActive] = useState(initialConcept && CANONICAL_CONCEPTS[initialConcept] ? initialConcept : keys[0]);
  const [tab, setTab] = useState('arc'); // arc | map | lex | note
  // 탐색: 개념이 늘어도 무너지지 않게 브라우즈(인덱스) ↔ 상세 2단 구조.
  const [browse, setBrowse] = useState(!initialConcept); // 진입 시 개념 지정 없으면 인덱스부터
  const [browseMode, setBrowseMode] = useState('theme'); // theme | timeline
  const [query, setQuery] = useState('');

  // 테마(카테고리)별 그룹 — 등장하는 카테고리만, order순
  const groups = useMemo(() => {
    const byCat = {};
    for (const k of keys) {
      const cat = CANONICAL_CONCEPTS[k].category || 'redemption';
      (byCat[cat] ||= []).push(k);
    }
    return Object.keys(byCat)
      .sort((a, b) => (CONCEPT_CATEGORIES[a]?.order || 99) - (CONCEPT_CATEGORIES[b]?.order || 99))
      .map((cat) => ({ cat, meta: CONCEPT_CATEGORIES[cat] || {}, items: byCat[cat] }));
  }, [keys]);

  // 검색 필터 (한/히/헬 라벨 + 테마명)
  const matchQuery = useCallback((k) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const c = CANONICAL_CONCEPTS[k];
    const hay = [c.labelKo, c.labelHe, c.labelGr, CONCEPT_CATEGORIES[c.category]?.ko].join(' ').toLowerCase();
    return hay.includes(q);
  }, [query]);
  const [lexEntry, setLexEntry] = useState(null);
  const [versePopups, setVersePopups] = useState([]); // 여러 개 동시 오픈: [{ key, bookId, chapter, verseStart, verseEnd, reference, z }]
  const popupSeq = useRef(0);
  const topZ = useRef(1270);
  const [minimized, setMinimized] = useState(false);

  // ── 글자 크기 (단위별) ────────────────────────────────────────────
  const [fontSizes, setFontSizes] = useState({
    title: 20,     // 타이틀: 개념명(한/히/헬)·원어 단어
    category: 12,  // 분류텍스트: 단계명·언약/등급 배지·섹션 헤더·칩
    body: 14,      // 본문: 요약·신학 해설·설명·구절 참조
  });
  const bumpFont = useCallback((key, delta) => {
    setFontSizes((prev) => ({
      ...prev,
      [key]: Math.max(FONT_MIN, Math.min(FONT_MAX, prev[key] + delta)),
    }));
  }, []);
  const T = fontSizes.title;
  const C = fontSizes.category;
  const B = fontSizes.body;

  // ── 위치 / 크기 (데스크톱) ────────────────────────────────────────
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return { x: 240, y: 80 };
    const w = Math.min(720, window.innerWidth - 40);
    return { x: Math.max(20, (window.innerWidth - w) / 2), y: Math.max(20, (window.innerHeight - 640) / 2) };
  });
  const [size, setSize] = useState(() => {
    if (typeof window === 'undefined') return { w: 720, h: 640 };
    return { w: Math.min(720, window.innerWidth - 40), h: Math.min(640, window.innerHeight - 60) };
  });
  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0 });

  const onHeaderMouseDown = useCallback((e) => {
    if (isMobile || e.button !== 0) return;
    if (e.target.closest('button, input')) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  }, [isMobile, pos]);

  const onResizeMouseDown = useCallback((e) => {
    if (isMobile || e.button !== 0) return;
    resizing.current = true;
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
    e.preventDefault();
    e.stopPropagation();
  }, [isMobile, size]);

  useEffect(() => {
    if (isMobile) return;
    const onMove = (e) => {
      if (dragging.current) {
        const dx = e.clientX - dragStart.current.mx;
        const dy = e.clientY - dragStart.current.my;
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - 200, dragStart.current.px + dx)),
          y: Math.max(0, Math.min(window.innerHeight - 60, dragStart.current.py + dy)),
        });
      }
      if (resizing.current) {
        const dw = e.clientX - resizeStart.current.mx;
        const dh = e.clientY - resizeStart.current.my;
        setSize({
          w: Math.max(420, Math.min(window.innerWidth - 40, resizeStart.current.w + dw)),
          h: Math.max(260, Math.min(window.innerHeight - 40, resizeStart.current.h + dh)),
        });
      }
    };
    const onUp = () => { dragging.current = false; resizing.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isMobile]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (versePopups.length) {
        // 가장 위(z 최대) 팝업부터 닫기
        setVersePopups((prev) => {
          if (!prev.length) return prev;
          const top = prev.reduce((a, b) => (b.z > a.z ? b : a));
          return prev.filter((p) => p.key !== top.key);
        });
      } else if (lexEntry) setLexEntry(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, lexEntry, versePopups.length]);

  const concept = CANONICAL_CONCEPTS[active];

  const addRef = (ref) => {
    if (!onAddVerse) return;
    const { bookId, chapter, verse } = parseRef(ref);
    const book = getBook(bookId);
    onAddVerse({
      bookId, chapter, verseStart: verse, verseEnd: verse,
      reference: `${book?.ko || bookId} ${chapter}:${verse}`,
    }, null);
  };

  // 용례지도: 구절을 구절 성경 팝업(VersePreviewPopup)으로 미리보기 — 여러 개 동시 오픈
  const openVerse = (ref) => {
    const { bookId, chapter, verse } = parseRef(ref);
    const book = getBook(bookId);
    const key = ++popupSeq.current;
    const z = ++topZ.current;
    const n = versePopups.length;
    setVersePopups((prev) => [...prev, {
      key, z, bookId, chapter, verseStart: verse, verseEnd: verse,
      reference: `${book?.ko || bookId} ${chapter}:${verse}`,
      // 겹치지 않게 계단식 배치
      x: Math.max(20, Math.min(vw - 400, vw / 2 - 180 + (n % 6) * 28)),
      y: Math.max(20, Math.min(vh - 340, vh / 2 - 150 + (n % 6) * 26)),
    }]);
  };
  const closeVerse = (key) => setVersePopups((prev) => prev.filter((p) => p.key !== key));
  const focusVerse = (key) => {
    const z = ++topZ.current;
    setVersePopups((prev) => prev.map((p) => (p.key === key ? { ...p, z } : p)));
  };

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  const TABS = [
    { key: 'arc', label: '📜 정경 흐름' },
    { key: 'map', label: '🗺️ 용례 지도' },
    { key: 'lex', label: '🔤 원문 분석' },
    { key: 'note', label: '✝️ 신학 해설' },
  ];

  const containerStyle = isMobile
    ? {
        left: 0, bottom: 0, top: 'auto', transform: 'none',
        width: vw, maxHeight: minimized ? undefined : '90dvh',
        borderRadius: '16px 16px 0 0',
      }
    : {
        left: pos.x, top: pos.y, bottom: 'auto', transform: 'none',
        width: size.w,
        height: minimized ? undefined : size.h,
        maxHeight: minimized ? undefined : size.h,
        borderRadius: 14,
      };

  const iconBtn = {
    background: 'rgba(255,255,255,.14)', border: 'none', color: '#f1f5f9',
    height: 30, minWidth: isMobile ? 38 : 30, minHeight: isMobile ? 38 : 30,
    padding: '0 8px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  return createPortal(
    <>
      <div
        onClick={minimized ? undefined : onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1249,
          background: minimized ? 'transparent' : 'rgba(15,23,42,.45)',
          pointerEvents: minimized ? 'none' : 'auto',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`정경 추적 · ${concept.labelKo}`}
        className={isMobile ? 'momentum-scroll' : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          zIndex: 1250,
          ...containerStyle,
          background: '#fff',
          boxShadow: '0 24px 64px rgba(15,23,42,.35)',
          border: isMobile ? 'none' : '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
          paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : 0,
          userSelect: dragging.current ? 'none' : 'auto',
        }}
      >
        {/* 헤더 (드래그 핸들) */}
        <div
          onMouseDown={onHeaderMouseDown}
          style={{
            padding: '12px 14px',
            background: 'linear-gradient(135deg,#1e293b,#334155)',
            color: '#f1f5f9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
            cursor: isMobile ? 'default' : (dragging.current ? 'grabbing' : 'grab'),
            userSelect: 'none', flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span aria-hidden="true" style={{ fontSize: 18 }}>🧭</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                정경 추적 · 핵심 개념
              </div>
              {!minimized && (
                <div style={{ fontSize: 11, color: '#cbd5e1' }}>창세기 → 요한계시록 계시·성취 흐름</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => setMinimized((m) => !m)}
              style={iconBtn}
              aria-label={minimized ? '펼치기' : '축소'}
              title={minimized ? '펼치기' : '축소'}
            >{minimized ? '▢' : '—'}</button>
            <button
              onClick={onClose}
              style={iconBtn}
              aria-label="닫기"
              title="닫기 (Esc)"
            >✕</button>
          </div>
        </div>

        {!minimized && (
          <>
            {/* 글자 크기 스테퍼 — [타이틀][분류텍스트][본문] 단위별 (문맥 성경 동일) */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderBottom: '1px solid #e2e8f0',
              background: 'rgba(30,41,59,.04)', flexShrink: 0,
              overflowX: 'auto', WebkitOverflowScrolling: 'touch',
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: '.02em', flexShrink: 0 }}>Aa</span>
              {[
                { key: 'title',    label: '타이틀' },
                { key: 'category', label: '분류텍스트' },
                { key: 'body',     label: '본문' },
              ].map((g) => (
                <div key={g.key} style={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  background: '#fff', border: '1px solid #cbd5e1',
                  borderRadius: 8, padding: '2px 4px', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', padding: '0 4px' }}>{g.label}</span>
                  <button onClick={() => bumpFont(g.key, -1)}
                    aria-label={`${g.label} 글자 작게`}
                    style={{ minWidth: 28, minHeight: 28, background: 'transparent', border: 'none', color: '#334155', fontSize: 15, fontWeight: 800, cursor: 'pointer', borderRadius: 6 }}>−</button>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', minWidth: 22, textAlign: 'center' }}>{fontSizes[g.key]}</span>
                  <button onClick={() => bumpFont(g.key, 1)}
                    aria-label={`${g.label} 글자 크게`}
                    style={{ minWidth: 28, minHeight: 28, background: 'transparent', border: 'none', color: '#334155', fontSize: 15, fontWeight: 800, cursor: 'pointer', borderRadius: 6 }}>+</button>
                </div>
              ))}
            </div>

            {/* 네비게이션: 검색 + 전체목록/타임라인 토글 */}
            <div style={{
              display: 'flex', gap: 6, alignItems: 'center', padding: '8px 14px',
              borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0, flexWrap: 'wrap',
            }}>
              {!browse && (
                <button
                  onClick={() => { setBrowse(true); setQuery(''); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 12, fontWeight: 800, color: '#1e293b',
                    background: '#fff', border: '1px solid #cbd5e1', minHeight: isMobile ? 38 : undefined,
                  }}
                  title="전체 개념 목록"
                >← 전체 개념</button>
              )}
              <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
                <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#94a3b8' }}>🔍</span>
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); if (!browse) setBrowse(true); }}
                  placeholder="개념 검색 (목자·어린양·성전…)"
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '7px 10px 7px 28px',
                    borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, color: '#1e293b',
                    background: '#fff', outline: 'none', minHeight: isMobile ? 38 : undefined,
                  }}
                />
              </div>
              {browse && (
                <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                  {[{ k: 'theme', t: '테마별' }, { k: 'timeline', t: '🗺️ 타임라인' }].map(({ k, t }) => (
                    <button
                      key={k}
                      onClick={() => setBrowseMode(k)}
                      style={{
                        padding: '6px 10px', border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 800,
                        background: browseMode === k ? '#1e293b' : '#fff',
                        color: browseMode === k ? '#fff' : '#64748b',
                        minHeight: isMobile ? 38 : undefined,
                      }}
                    >{t}</button>
                  ))}
                </div>
              )}
            </div>

            {/* 브라우즈(인덱스): 테마별 그리드 / 정경 타임라인 */}
            {browse && (
              <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '12px 14px' }}>
                {browseMode === 'theme' && groups.map(({ cat, meta, items }) => {
                  const shown = items.filter(matchQuery);
                  if (!shown.length) return null;
                  return (
                    <div key={cat} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 15 }}>{meta.emoji}</span>
                        <span style={{ fontSize: C, fontWeight: 800, color: meta.color || '#334155' }}>{meta.ko}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', borderRadius: 999, padding: '1px 7px' }}>{shown.length}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 8 }}>
                        {shown.map((k) => {
                          const c = CANONICAL_CONCEPTS[k];
                          return (
                            <button
                              key={k}
                              onClick={() => { setActive(k); setTab('arc'); setBrowse(false); }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                                padding: '10px 11px', borderRadius: 10, cursor: 'pointer',
                                border: '1px solid #e2e8f0', background: '#fff',
                                borderLeft: `3px solid ${meta.color || '#cbd5e1'}`,
                                minHeight: isMobile ? 52 : undefined,
                              }}
                            >
                              <span style={{ fontSize: 20, flexShrink: 0 }}>{c.emoji}</span>
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: B, fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.labelKo}</span>
                                <span style={{ display: 'block', fontSize: Math.max(9, B - 3), color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.canonicalArc.length}단계 · {c.labelHe?.split(' ')[0]}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {browseMode === 'theme' && groups.every(({ items }) => !items.filter(matchQuery).length) && (
                  <div style={{ fontSize: B, color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>‘{query}’에 해당하는 개념이 없습니다.</div>
                )}

                {browseMode === 'timeline' && (
                  <div>
                    <div style={{ fontSize: Math.max(10, B - 2), color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>
                      각 언약 시대에 <b>활동하는 개념</b>을 교차 색인했습니다. 개념을 누르면 그 개념의 정경 흐름이 열립니다. 여러 개념이 <b>새 언약</b>에서 그리스도께로 수렴하는 흐름을 확인해 보세요.
                    </div>
                    {COVENANT_ORDER.map((cv) => {
                      const cov = COVENANTS[cv];
                      const hits = keys
                        .filter(matchQuery)
                        .filter((k) => CANONICAL_CONCEPTS[k].canonicalArc.some((s) => s.covenantLink === cv));
                      if (!hits.length) return null;
                      return (
                        <div key={cv} style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 12 }}>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: cov.color, marginTop: 4 }} />
                            {cv !== 'new' && <span style={{ width: 2, flex: 1, background: '#e2e8f0', minHeight: 20 }} />}
                          </div>
                          <div style={{ paddingBottom: 14, flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: C, fontWeight: 800, color: cov.color, marginBottom: 6 }}>{cov.ko}</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {hits.map((k) => {
                                const c = CANONICAL_CONCEPTS[k];
                                return (
                                  <button
                                    key={k}
                                    onClick={() => { setActive(k); setTab('arc'); setBrowse(false); }}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 5,
                                      padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                                      fontSize: Math.max(11, B - 2), fontWeight: 700,
                                      border: '1px solid #e2e8f0', background: '#fff', color: '#334155',
                                      minHeight: isMobile ? 36 : undefined,
                                    }}
                                  ><span style={{ fontSize: 14 }}>{c.emoji}</span>{c.labelKo}</button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!browse && (<>
            {/* 개념 요약 (타이틀) */}
            <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: T, fontWeight: 800, color: '#1e293b' }}>{concept.emoji} {concept.labelKo}</span>
                <span style={{ fontSize: Math.round(T * 0.75), color: '#92400e', fontFamily: '"SBL BibLit", serif' }}>{concept.labelHe}</span>
                <span style={{ fontSize: Math.round(T * 0.75), color: '#1d4ed8', fontFamily: '"Gentium Plus", Cardo, serif' }}>{concept.labelGr}</span>
                {CONCEPT_CATEGORIES[concept.category] && (
                  <span style={{
                    fontSize: Math.max(9, C - 2), fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                    color: '#fff', background: CONCEPT_CATEGORIES[concept.category].color,
                  }}>{CONCEPT_CATEGORIES[concept.category].emoji} {CONCEPT_CATEGORIES[concept.category].ko}</span>
                )}
              </div>
            </div>

            {/* 탭 바 */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    flex: 1, padding: '9px 0', border: 'none', fontSize: C, fontWeight: 700,
                    cursor: 'pointer',
                    background: tab === key ? '#fff' : 'transparent',
                    color: tab === key ? '#1e293b' : '#64748b',
                    borderBottom: tab === key ? '2px solid #1e293b' : '2px solid transparent',
                    minHeight: isMobile ? 44 : undefined,
                  }}
                >{label}</button>
              ))}
            </div>

            {/* 콘텐츠 */}
            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>

              {tab === 'arc' && (
                <div style={{ padding: '14px 16px' }}>
                  {concept.canonicalArc.map((s, i) => {
                    const { bookId, chapter, verse } = parseRef(s.ref);
                    const book = getBook(bookId);
                    const cov = COVENANTS[s.covenantLink] || COVENANTS.none;
                    const con = CONNECTIONS[s.connectionType] || {};
                    const last = i === concept.canonicalArc.length - 1;
                    return (
                      <div key={i} style={{ display: 'flex', gap: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{ width: 11, height: 11, borderRadius: '50%', background: cov.color, marginTop: 4, flexShrink: 0 }} />
                          {!last && <div style={{ width: 2, flex: 1, background: '#e2e8f0', minHeight: 24 }} />}
                        </div>
                        <div style={{ paddingBottom: last ? 0 : 16, flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                            <span style={{ fontSize: C, fontWeight: 800, color: '#1e293b' }}>{s.stage}</span>
                            <button
                              onClick={() => openVerse(s.ref)}
                              title={`${book?.ko || bookId} ${chapter}:${verse} 본문 보기`}
                              style={{
                                fontSize: B, fontFamily: 'monospace', fontWeight: 700,
                                color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe',
                                borderRadius: 4, padding: '1px 6px', cursor: 'pointer',
                              }}
                            >{book?.ko || bookId} {chapter}:{verse}</button>
                          </div>
                          <div style={{ fontSize: B, color: '#334155', lineHeight: 1.55, marginBottom: 5 }}>{s.summary}</div>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: Math.max(9, C - 2), fontWeight: 700, padding: '1px 6px', borderRadius: 4, color: '#fff', background: cov.color }}>{cov.ko}</span>
                            <span title={con.desc} style={{ fontSize: Math.max(9, C - 2), fontWeight: 700, padding: '1px 6px', borderRadius: 4, color: con.color, background: '#f1f5f9', border: `1px solid ${con.color}33` }}>{s.connectionType}급 · {con.ko}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === 'map' && (
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: B, color: '#64748b', marginBottom: 10 }}>
                    개념이 등장하는 본문을 언약 구조에 따라 배치했습니다. 구절을 누르면 본문 팝업이 열립니다.
                  </div>
                  {Object.keys(COVENANTS).filter((cv) => concept.canonicalArc.some((s) => s.covenantLink === cv)).map((cv) => {
                    const cov = COVENANTS[cv];
                    const items = concept.canonicalArc.filter((s) => s.covenantLink === cv);
                    return (
                      <div key={cv} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: cov.color }} />
                          <span style={{ fontSize: C, fontWeight: 800, color: '#334155' }}>{cov.ko}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 15 }}>
                          {items.map((s, i) => {
                            const { bookId, chapter, verse } = parseRef(s.ref);
                            const book = getBook(bookId);
                            return (
                              <button
                                key={i}
                                onClick={() => openVerse(s.ref)}
                                title={`${book?.ko || bookId} ${chapter}:${verse} 본문 보기`}
                                style={{
                                  fontSize: B, fontFamily: 'monospace', fontWeight: 700,
                                  color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe',
                                  borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                                }}
                              >{book?.ko || bookId} {chapter}:{verse}</button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === 'lex' && (
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <LexRow
                      lang="히브리어" flag="🟠" strong={concept.strong?.he}
                      label={concept.labelHe} isHebrew T={T} C={C}
                      onOpen={() => setLexEntry({ s: concept.strong?.he, w: concept.labelHe?.split(' ')[0], tr: concept.labelHe, l: concept.labelHe?.split(' ')[0] })}
                    />
                    <LexRow
                      lang="헬라어" flag="🔵" strong={concept.strong?.gr}
                      label={concept.labelGr} T={T} C={C}
                      onOpen={() => setLexEntry({ s: concept.strong?.gr, w: concept.labelGr?.split(' ')[0], tr: concept.labelGr, l: concept.labelGr?.split(' ')[0] })}
                    />
                  </div>
                  <div style={{ marginTop: 12, fontSize: B, color: '#94a3b8' }}>
                    단어를 누르면 원어 사전 카드(정의·용례)가 열립니다.
                  </div>
                </div>
              )}

              {tab === 'note' && (
                <div style={{ padding: '14px 16px' }}>
                  <div style={{
                    fontSize: B, color: '#1e293b', lineHeight: 1.7,
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px',
                  }}>
                    {concept.theologicalNote}
                  </div>
                  {concept.reformedAnchors?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: Math.max(9, C - 2), fontWeight: 800, color: '#94a3b8', letterSpacing: 1, marginBottom: 6 }}>개혁주의 신학 앵커</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {concept.reformedAnchors.map((a, i) => (
                          <span key={i} style={{ fontSize: C, fontWeight: 700, padding: '3px 9px', borderRadius: 999, color: '#065f46', background: '#d1fae5', border: '1px solid #6ee7b7' }}>{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: Math.max(9, C - 2), fontWeight: 800, color: '#94a3b8', letterSpacing: 1, marginBottom: 6 }}>연결 등급 (근거 강도)</div>
                    {Object.entries(CONNECTIONS).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: 8, fontSize: B, marginBottom: 3, alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 800, color: v.color, minWidth: 14 }}>{k}</span>
                        <span style={{ fontWeight: 700, color: '#334155', minWidth: 66 }}>{v.ko}</span>
                        <span style={{ color: '#64748b' }}>{v.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
            </>)}

            {/* 출처 */}
            <div style={{
              padding: '6px 14px', borderTop: '1px solid #e2e8f0',
              fontSize: 9, color: '#94a3b8', background: '#f8fafc', flexShrink: 0,
            }}>
              해석 기준: 장로교 개혁주의(언약신학·구속사) · 본문 전문 미복제, 참조·요약·해설만 제공
            </div>

            {/* 리사이즈 핸들 (데스크톱) */}
            {!isMobile && (
              <div
                onMouseDown={onResizeMouseDown}
                title="크기 조절"
                style={{
                  position: 'absolute', right: 0, bottom: 0, width: 18, height: 18,
                  cursor: 'se-resize', zIndex: 2,
                  background: 'linear-gradient(135deg, transparent 50%, #94a3b8 50%, #94a3b8 60%, transparent 60%, transparent 72%, #94a3b8 72%, #94a3b8 82%, transparent 82%)',
                }}
              />
            )}
          </>
        )}
      </div>

      {lexEntry?.s && (
        <LexiconPopup
          entry={lexEntry}
          anchor={{ x: vw / 2, y: vh / 2 }}
          bookId={null}
          onClose={() => setLexEntry(null)}
          zIndex={1260}
        />
      )}

      {versePopups.map((p) => (
        <VersePreviewPopup
          key={p.key}
          id={`canon-verse-${p.key}`}
          bookId={p.bookId}
          chapter={p.chapter}
          verseStart={p.verseStart}
          verseEnd={p.verseEnd}
          reference={p.reference}
          initialX={p.x}
          initialY={p.y}
          zIndex={p.z}
          onClose={() => closeVerse(p.key)}
          onFocus={() => focusVerse(p.key)}
          onAddToBoard={onAddVerse ? () => addRef(`${p.bookId}:${p.chapter}:${p.verseStart}`) : undefined}
        />
      ))}
    </>,
    document.body
  );
}

function LexRow({ lang, flag, strong, label, isHebrew, onOpen, T, C }) {
  if (!strong) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 10,
      border: '1px solid #e2e8f0', background: '#fff',
    }}>
      <span style={{ fontSize: 16 }}>{flag}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: Math.max(9, C - 2), fontWeight: 800, color: '#94a3b8', letterSpacing: 0.5 }}>{lang}</div>
        <button
          onClick={onOpen}
          style={{
            fontSize: Math.round(T * 0.85), fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer',
            color: isHebrew ? '#92400e' : '#1d4ed8', padding: 0, textAlign: 'left',
            fontFamily: isHebrew ? '"SBL BibLit", serif' : '"Gentium Plus", Cardo, serif',
          }}
          title="원어 사전 열기"
        >{label}</button>
      </div>
      <span style={{
        fontSize: C, fontFamily: 'monospace', fontWeight: 700, color: '#475569',
        background: '#f1f5f9', borderRadius: 4, padding: '2px 6px',
      }}>{strong}</span>
    </div>
  );
}
