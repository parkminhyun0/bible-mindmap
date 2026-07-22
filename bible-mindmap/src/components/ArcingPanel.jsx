import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ROLE_CFG, parseVerseRef } from '../data/ruth1Arcing';
import { loadVerseLexicon, humanizeMorph } from '../utils/lexicon';
import { buildArcingFromPassage } from '../utils/arcingBuilder';
import { ALL_BOOKS, isOT } from '../data/bibleBooks';
import LexiconPopup from './LexiconPopup';

// ── 선행 종속절 행 ──────────────────────────────────────────────────────────
function PrecedingRow({ item, fontSize }) {
  const cfg = ROLE_CFG[item.role] || ROLE_CFG.temporal;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '36px auto 1fr', alignItems: 'start', gap: 8, padding: '4px 0 4px 16px' }}>
      <span style={{ fontSize: fontSize - 2, color: '#94a3b8', paddingTop: 2 }}>{item.verse}</span>
      <span style={{
        fontSize: fontSize - 3, fontWeight: 700, padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap',
        color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30`, alignSelf: 'start', marginTop: 1,
      }}>{cfg.label}</span>
      <span style={{ fontSize, color: '#64748b', lineHeight: 1.65 }}>{item.ko}</span>
    </div>
  );
}

// ── 후행 종속절 행 ──────────────────────────────────────────────────────────
function FollowingRow({ item, fontSize }) {
  const cfg = ROLE_CFG[item.role] || ROLE_CFG.identification;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '20px 36px auto 1fr', alignItems: 'start', gap: 8, padding: '3px 0 3px 40px' }}>
      <span style={{ color: '#cbd5e1', fontSize: fontSize - 1, paddingTop: 2 }}>└</span>
      <span style={{ fontSize: fontSize - 2, color: '#94a3b8', paddingTop: 2 }}>{item.verse}</span>
      <span style={{
        fontSize: fontSize - 3, fontWeight: 700, padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap',
        color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30`, alignSelf: 'start', marginTop: 1,
      }}>{cfg.label}</span>
      <span style={{ fontSize, color: '#475569', lineHeight: 1.65 }}>{item.ko}</span>
    </div>
  );
}

// 헬라어 주동사 감지 (직설법·명령법·가정법)
function isGrkMainVerb(m) { return /^V-[A-Z]{2}[IMS]/.test(m || ''); }

// 헬라어 동사 어형 → 간략 라벨
function grkVerbLabel(m) {
  const mood = m?.match(/^V-[A-Z]{2}([IMS])/)?.[1];
  return { I: '직설법', M: '명령법', S: '가정법' }[mood] || '동사';
}

// ── 주동사 절 행 ────────────────────────────────────────────────────────────
function MainRow({ item, hasPreceding, fontSize, isExpanded, onToggle, words, loadingWords, onWordClick, isHebrew }) {
  const verbFont   = isHebrew
    ? '"Ezra SIL", "SBL BibLit", serif'
    : '"SBL BibLit", "Palatino Linotype", Palatino, "Times New Roman", serif';
  const verbDir    = isHebrew ? 'rtl' : 'ltr';

  const verbLabel  = isHebrew
    ? 'wayyiqtol (וַיִּקְטֹל)'
    : `${grkVerbLabel(item.morph)} 동사`;
  const verbNote   = isHebrew
    ? '주동사 · 단어 클릭 → 어형 분석 · 사전 · 용례'
    : '주동사 · 단어 클릭 → 어형 분석 · 사전 · 용례';

  return (
    <div>
      <div
        onClick={onToggle}
        style={{
          display: 'grid', gridTemplateColumns: '20px auto 40px 1fr auto',
          alignItems: 'start', gap: 10, padding: '7px 12px 7px 16px',
          cursor: 'pointer', borderRadius: 6,
          background: isExpanded ? '#f5f3ff' : 'transparent', transition: 'background .15s',
        }}
        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#fafafa'; }}
        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ color: '#6d28d9', fontWeight: 900, fontSize, paddingTop: 3 }}>
          {hasPreceding ? '↳' : '★'}
        </span>
        <span style={{
          fontFamily: verbFont,
          fontSize: fontSize + 5, color: '#6d28d9', fontWeight: 700,
          direction: verbDir, lineHeight: 1, paddingTop: 1,
        }}>{item.heb}</span>
        <span style={{ fontSize: fontSize - 2, color: '#94a3b8', paddingTop: 4 }}>{item.verse}</span>
        <span style={{ fontSize, color: '#1e293b', fontWeight: 500, lineHeight: 1.7 }}>{item.ko}</span>
        <span style={{ fontSize: fontSize - 3, color: '#6d28d9', paddingTop: 4, whiteSpace: 'nowrap' }}>
          {isExpanded ? '▲ 닫기' : '▼ 원어'}
        </span>
      </div>

      {isExpanded && (
        <div style={{
          margin: '2px 16px 10px 42px', padding: '12px 16px',
          background: '#faf8ff', border: '1px solid #e9d5ff', borderRadius: 8,
        }}>
          {loadingWords ? (
            <span style={{ fontSize: fontSize - 2, color: '#94a3b8' }}>불러오는 중…</span>
          ) : words.length > 0 ? (
            <>
              <div style={{
                direction: verbDir, lineHeight: 2.6, fontSize: fontSize + 4,
                fontFamily: verbFont,
              }}>
                {words.map((e, i) => {
                  const isMain = isHebrew
                    ? /V[qpnhNPDQHTCAEF]w/.test(e.m || '')
                    : isGrkMainVerb(e.m);
                  return (
                    <span key={i}
                      onClick={(ev) => { ev.stopPropagation(); const r = ev.currentTarget.getBoundingClientRect(); onWordClick(e, { x: r.left + r.width / 2, y: r.bottom + 6 }); }}
                      title={`${e.tr || ''}  ·  ${humanizeMorph(e.m)}  ·  ${e.g || ''}`}
                      style={{
                        display: 'inline-block', margin: '0 3px', padding: isMain ? '2px 8px' : '1px 5px',
                        borderRadius: 5, cursor: 'pointer', transition: 'background .12s',
                        background: isMain ? '#fef3c7' : 'transparent',
                        color: isMain ? '#92400e' : '#4c1d95',
                        fontWeight: isMain ? 800 : 400,
                        border: isMain ? '1.5px solid #f59e0b' : '1.5px solid transparent',
                        boxShadow: isMain ? '0 1px 3px rgba(245,158,11,0.2)' : 'none',
                      }}
                      onMouseEnter={ev => { ev.currentTarget.style.background = isMain ? '#fde68a' : '#ede9fe'; }}
                      onMouseLeave={ev => { ev.currentTarget.style.background = isMain ? '#fef3c7' : 'transparent'; }}
                    >{e.w}</span>
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, direction: 'ltr' }}>
                <span style={{ fontSize: Math.max(9, fontSize - 3), padding: '1px 7px', borderRadius: 4, background: '#fef3c7', color: '#92400e', border: '1.5px solid #f59e0b', fontWeight: 700 }}>
                  {verbLabel}
                </span>
                <span style={{ fontSize: Math.max(9, fontSize - 3), color: '#94a3b8' }}>{verbNote}</span>
              </div>
            </>
          ) : (
            <span style={{ fontSize: fontSize - 2, color: '#94a3b8' }}>원어 데이터 없음</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── 본문 선택 폼 ────────────────────────────────────────────────────────────
function PassageForm({ initial, onAnalyze, fontSize }) {
  const [bookId, setBookId] = useState(initial?.bookId || 'Ruth');
  const [chapter, setChapter] = useState(initial?.chapter || 1);
  const [vStart, setVStart] = useState(initial?.verseStart || 1);
  const [vEnd, setVEnd] = useState(initial?.verseEnd || 22);

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#4c1d95' }}>📖 분석할 본문 선택</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <select value={bookId} onChange={e => setBookId(e.target.value)} style={inpSty}>
          <optgroup label="구약">
            {ALL_BOOKS.slice(0, 39).map(b => <option key={b.id} value={b.id}>{b.ko}</option>)}
          </optgroup>
          <optgroup label="신약">
            {ALL_BOOKS.slice(39).map(b => <option key={b.id} value={b.id}>{b.ko}</option>)}
          </optgroup>
        </select>
        <span style={{ fontSize: 12, color: '#64748b' }}>장</span>
        <input type="number" min="1" max="150" value={chapter}
          onChange={e => setChapter(parseInt(e.target.value) || 1)}
          style={{ ...inpSty, width: 52 }} />
        <span style={{ fontSize: 12, color: '#64748b' }}>절</span>
        <input type="number" min="1" max="200" value={vStart}
          onChange={e => setVStart(parseInt(e.target.value) || 1)}
          style={{ ...inpSty, width: 52 }} />
        <span style={{ fontSize: 12, color: '#64748b' }}>—</span>
        <input type="number" min="1" max="200" value={vEnd}
          onChange={e => setVEnd(parseInt(e.target.value) || vStart)}
          style={{ ...inpSty, width: 52 }} />
        <span style={{ fontSize: 12, color: '#64748b' }}>절</span>
        <button
          onClick={() => onAnalyze({ bookId, chapter, verseStart: vStart, verseEnd: vEnd })}
          style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#6d28d9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
        >분석 ↗</button>
      </div>
      <div style={{ fontSize: Math.max(9, fontSize - 2), color: '#94a3b8', lineHeight: 1.6 }}>
        히브리어: וַיִּ(와이) wayyiqtol 동사 → 주선 자동 감지 &nbsp;|&nbsp; 헬라어: 직설법·명령법·가정법 동사 → 주선
      </div>
    </div>
  );
}

const inpSty = { padding: '5px 8px', borderRadius: 5, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff' };

// ── 아이콘 버튼 스타일 ──────────────────────────────────────────────────────
const iconBtn = {
  height: 26, minWidth: 26, padding: '0 6px', borderRadius: 6,
  border: '1px solid #4338ca',
  background: 'transparent', color: '#c7d2fe',
  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, whiteSpace: 'nowrap',
};

// ── 메인 팝업 ────────────────────────────────────────────────────────────────
export default function ArcingPanel({ passage: passageProp, onClose, panelIndex = 0 }) {
  // ── 팝업 위치·크기 ────────────────────────────────────────────────────────
  const [pos, setPos]   = useState(() => {
    const offset = panelIndex * 36;
    return { x: Math.max(0, window.innerWidth / 2 - 380 + offset), y: 60 + offset };
  });
  const [size, setSize] = useState({ w: 760, h: 580 });
  const [minimized, setMinimized] = useState(false);

  const dragging    = useRef(false);
  const resizing    = useRef(false);
  const dragStart   = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0 });

  const onHeaderMouseDown = useCallback((e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  }, [pos]);

  const onResizeMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    resizing.current = true;
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
    e.preventDefault(); e.stopPropagation();
  }, [size]);

  useEffect(() => {
    const onMove = (e) => {
      if (dragging.current) {
        const dx = e.clientX - dragStart.current.mx;
        const dy = e.clientY - dragStart.current.my;
        setPos({
          x: Math.max(0, Math.min(window.innerWidth  - 200, dragStart.current.px + dx)),
          y: Math.max(0, Math.min(window.innerHeight -  60, dragStart.current.py + dy)),
        });
      }
      if (resizing.current) {
        const dw = e.clientX - resizeStart.current.mx;
        const dh = e.clientY - resizeStart.current.my;
        setSize({
          w: Math.max(480, Math.min(window.innerWidth  - 40, resizeStart.current.w + dw)),
          h: Math.max(200, Math.min(window.innerHeight - 80, resizeStart.current.h + dh)),
        });
      }
    };
    const onUp = () => { dragging.current = false; resizing.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',  onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  // ── 분석 상태 ────────────────────────────────────────────────────────────
  const [passage, setPassage]   = useState(passageProp || null);
  const [structure, setStructure] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [fontSize, setFontSize] = useState(13);
  const [showOnlyMain, setShowOnlyMain] = useState(false);
  const [expandedKey, setExpandedKey]   = useState(null);
  const [lexCache, setLexCache] = useState({});
  const [loadingKeys, setLoadingKeys] = useState(new Set());
  const [popup, setPopup]       = useState(null);
  const [showForm, setShowForm] = useState(!passageProp);

  // ESC 닫기
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const analyze = useCallback(async (p) => {
    setPassage(p); setShowForm(false); setLoading(true); setError(null); setStructure(null); setExpandedKey(null);
    try {
      setStructure(await buildArcingFromPassage(p.bookId, p.chapter, p.verseStart, p.verseEnd));
    } catch (err) {
      setError(err.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (passageProp) analyze(passageProp); }, []); // eslint-disable-line

  const getLexKey = useCallback((verseRef) => {
    if (!passage) return null;
    const p = parseVerseRef(verseRef);
    return p ? `${passage.bookId}-${p.chapter}-${p.verseStart}` : null;
  }, [passage]);

  const loadLex = useCallback(async (verseRef) => {
    if (!passage) return;
    const key = getLexKey(verseRef);
    if (!key || lexCache[key] || loadingKeys.has(key)) return;
    const p = parseVerseRef(verseRef);
    if (!p) return;
    setLoadingKeys(prev => new Set([...prev, key]));
    try {
      const words = await loadVerseLexicon(passage.bookId, p.chapter, p.verseStart, p.verseEnd);
      setLexCache(prev => ({ ...prev, [key]: words || [] }));
    } finally {
      setLoadingKeys(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  }, [passage, lexCache, loadingKeys, getLexKey]);

  const handleToggle = useCallback((key, verseRef) => {
    setExpandedKey(k => k === key ? null : key);
    if (expandedKey !== key) loadLex(verseRef);
  }, [expandedKey, loadLex]);

  const handleWordClick = useCallback((entry, anchor) => setPopup({ entry, anchor }), []);

  const isHebrew = !passage || isOT(passage.bookId);

  // 표시용 라벨
  const bookKo = passage ? (ALL_BOOKS.find(b => b.id === passage.bookId)?.ko || passage.bookId) : '';
  const passageLabel = passage
    ? `${bookKo} ${passage.chapter}:${passage.verseStart}${passage.verseEnd !== passage.verseStart ? `-${passage.verseEnd}` : ''}절`
    : '';

  const keyed = (structure || []).map((item, i) => ({ ...item, _key: `item-${i}` }));

  return createPortal(
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y, width: size.w,
      zIndex: 9000,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 20px 60px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.12)',
      border: '1px solid #c4b5fd',
      fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
      display: 'flex', flexDirection: 'column',
      userSelect: dragging.current ? 'none' : 'auto',
    }}>

      {/* ── 타이틀바 (드래그 핸들) ── */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap',
          padding: '0 12px', height: 44, flexShrink: 0,
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          borderRadius: minimized ? 12 : '12px 12px 0 0',
          cursor: 'grab', userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 14 }}>📖</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#e0e7ff', flexShrink: 0 }}>
          본문 흐름 분석 {passage ? (isHebrew ? '(히브리어)' : '(헬라어)') : ''}
        </span>
        {passageLabel && (
          <span style={{ fontSize: 11, color: '#818cf8', flexShrink: 0, marginLeft: 2 }}>
            — {passageLabel}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* 글자 크기 */}
        {!minimized && !showForm && (
          <div onMouseDown={e => e.stopPropagation()} style={{
            display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0,
            background: 'rgba(255,255,255,0.10)', borderRadius: 8,
            border: '1px solid rgba(165,180,252,0.35)',
            padding: '3px 6px',
          }}>
            <span style={{ fontSize: 10, color: '#a5b4fc', fontWeight: 700, marginRight: 3, letterSpacing: '0.03em' }}>크기</span>
            {[['−−', -5], ['−', -1]].map(([lbl, d]) => (
              <button key={lbl} onClick={() => setFontSize(s => Math.max(10, s + d))}
                style={{ ...iconBtn, background: 'rgba(99,102,241,0.25)', border: '1px solid #6366f1', color: '#c7d2fe' }}>
                A{lbl}
              </button>
            ))}
            <span style={{
              fontSize: 12, fontWeight: 800, color: '#fbbf24',
              minWidth: 24, textAlign: 'center',
              background: 'rgba(251,191,36,0.15)', borderRadius: 4,
              padding: '1px 4px', border: '1px solid rgba(251,191,36,0.4)',
            }}>{fontSize}</span>
            {[['+', 1], ['++', 5]].map(([lbl, d]) => (
              <button key={lbl} onClick={() => setFontSize(s => Math.min(50, s + d))}
                style={{ ...iconBtn, background: 'rgba(99,102,241,0.25)', border: '1px solid #6366f1', color: '#c7d2fe' }}>
                A{lbl}
              </button>
            ))}
          </div>
        )}

        {/* 주동사만 */}
        {!minimized && !showForm && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setShowOnlyMain(v => !v)}
            style={{ ...iconBtn, padding: '0 8px', width: 'auto', background: showOnlyMain ? '#4f46e5' : 'transparent', border: `1px solid ${showOnlyMain ? '#6366f1' : '#4338ca'}`, fontSize: 11 }}
          >
            {showOnlyMain ? '★ 주선만' : '전체'}
          </button>
        )}

        {/* 본문 선택 */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setShowForm(v => !v)}
          style={{ ...iconBtn, padding: '0 8px', width: 'auto', background: showForm ? '#4f46e5' : 'transparent', fontSize: 11 }}
          title="분석 본문 선택"
        >
          {showForm ? '▲' : '본문'}
        </button>

        {/* 최소화 */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setMinimized(v => !v)}
          title={minimized ? '펼치기' : '최소화'}
          style={iconBtn}
        >
          {minimized ? '▲' : '▼'}
        </button>

        {/* 닫기 */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          title="닫기"
          style={{ ...iconBtn, border: '1px solid #7f1d1d', color: '#fca5a5' }}
        >✕</button>
      </div>

      {/* ── 본문 선택 폼 ── */}
      {!minimized && showForm && (
        <PassageForm initial={passage} onAnalyze={(p) => { analyze(p); setShowForm(false); }} fontSize={fontSize} />
      )}

      {/* ── 내용 영역 ── */}
      {!minimized && !showForm && (
        <div style={{ height: size.h, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '0 0 12px 12px' }}>

          {/* 범례 + 언어별 설명 — fontSize에 연동 */}
          {structure && (
            <div style={{
              padding: '8px 16px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
            }}>
              {/* ① 이 탭이 하는 일 */}
              <div style={{ fontSize: Math.max(9, fontSize - 2), color: '#312e81', lineHeight: 1.75, marginBottom: 6 }}>
                <b>본문 흐름 분석이란?</b> — 성경 본문의 각 절을 <b>"핵심 동사(★)"</b>를 중심으로 나눠서, 어떤 절이 이야기를 이끌고 어떤 절이 그것을 보충하는지 한눈에 보여줍니다.<br />
                <span style={{ color: '#6b7280', fontSize: Math.max(8, fontSize - 3) }}>
                  {isHebrew
                    ? '히브리어에서는 וַיִּ(와이)로 시작하는 동사(wayyiqtol)가 "그리고 …했다"는 뜻으로 이야기를 앞으로 이끌어 갑니다. ★이 붙은 행이 그 핵심 동사 절이에요.'
                    : '헬라어에서는 직설법(사실 서술) · 명령법(지시·명령) · 가정법(조건·바람)으로 쓰인 동사가 절의 중심이 됩니다. ★이 붙은 행이 그 핵심 동사 절이에요.'}
                  {' '}나머지 행(시간·배경, 이유, 결과 등)은 그 핵심 동사를 보충하는 종속절입니다.
                  <br />원어 단어 옆 <b>▼ 원어</b> 버튼을 누르면 해당 절의 원어 단어가 펼쳐집니다.
                </span>
              </div>
              {/* ② 범례 칩 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: Math.max(8, fontSize - 3), color: '#94a3b8', fontWeight: 700, marginRight: 2 }}>범례</span>
                <span style={{
                  fontSize: Math.max(8, fontSize - 3), padding: '1px 7px', borderRadius: 3,
                  color: '#6d28d9', background: '#f5f3ff', border: '1px solid #c4b5fd', fontWeight: 700,
                }}>
                  ★ 주동사 {isHebrew ? '(wayyiqtol)' : '(직설법·명령법·가정법)'}
                </span>
                {Object.entries(ROLE_CFG).map(([k, v]) => (
                  <span key={k} style={{
                    fontSize: Math.max(8, fontSize - 3), padding: '1px 6px', borderRadius: 3,
                    color: v.color, background: v.bg, border: `1px solid ${v.color}40`,
                  }}>{v.label}</span>
                ))}
              </div>
            </div>
          )}

          {/* 로딩 */}
          {loading && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ fontSize: 24 }}>⏳</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>원어 데이터 분석 중…</div>
            </div>
          )}

          {/* 오류 */}
          {error && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ fontSize: 24 }}>⚠️</div>
              <div style={{ fontSize: 13, color: '#dc2626' }}>{error}</div>
              <button onClick={() => { setShowForm(true); setError(null); }}
                style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#6d28d9', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                다시 선택
              </button>
            </div>
          )}

          {/* 구조 목록 */}
          {!loading && structure && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px 24px' }}>
              {keyed.map((item) => {
                if (item.divider) return null; // 자동 생성 구조에는 divider 없음
                const hasPre   = (item.preceding?.length ?? 0) > 0;
                const isExp    = expandedKey === item._key;
                const lexKey   = item.main ? getLexKey(item.main.verse) : null;
                const words    = (lexKey && lexCache[lexKey]) || [];
                const loadingW = lexKey ? loadingKeys.has(lexKey) : false;

                return (
                  <div key={item._key} style={{
                    marginBottom: 4,
                    borderLeft: hasPre ? '2px solid #e2e8f0' : 'none',
                    paddingLeft: hasPre ? 4 : 0,
                  }}>
                    {!showOnlyMain && (item.preceding || []).map((p, j) => (
                      <PrecedingRow key={j} item={p} fontSize={fontSize} />
                    ))}
                    {item.main && (
                      <MainRow
                        item={item.main}
                        hasPreceding={hasPre && !showOnlyMain}
                        fontSize={fontSize}
                        isExpanded={isExp}
                        onToggle={() => handleToggle(item._key, item.main.verse)}
                        words={words}
                        loadingWords={loadingW}
                        onWordClick={handleWordClick}
                        isHebrew={isHebrew}
                      />
                    )}
                    {!showOnlyMain && (item.following || []).map((f, j) => (
                      <FollowingRow key={j} item={f} fontSize={fontSize} />
                    ))}
                  </div>
                );
              })}
              {keyed.length === 0 && (
                <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                  주동사를 감지하지 못했습니다. 다른 본문을 선택해보세요.
                </div>
              )}
            </div>
          )}

          {/* 안내 (구조 없음 + 오류도 없음 + 로딩도 아님) */}
          {!loading && !structure && !error && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>위 "본문" 버튼을 눌러 분석할 구절을 선택하세요.</div>
            </div>
          )}
        </div>
      )}

      {/* ── 리사이즈 핸들 (우하단) ── */}
      {!minimized && (
        <div
          onMouseDown={onResizeMouseDown}
          style={{
            position: 'absolute', right: 0, bottom: 0,
            width: 16, height: 16, cursor: 'se-resize',
            background: 'linear-gradient(135deg, transparent 50%, #a78bfa 50%)',
            borderRadius: '0 0 12px 0',
          }}
        />
      )}

      {/* LexiconPopup */}
      {popup && (
        <LexiconPopup
          entry={popup.entry}
          anchor={popup.anchor}
          bookId={passage?.bookId || 'Ruth'}
          onClose={() => setPopup(null)}
          zIndex={9500}
        />
      )}
    </div>,
    document.body
  );
}
