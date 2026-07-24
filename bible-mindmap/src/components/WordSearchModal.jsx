import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import useMobile from '../hooks/useMobile';
import {
  searchByOriginal, searchByEnglish, searchByKorean, detectInputMode,
  fetchKRVVerses, fetchESVVerses, fetchOrigLangVerses, deriveOriginalFromKorean,
} from '../utils/wordSearch';
import { fetchStrongDefinition, humanizeMorph, linkifyDefinition } from '../utils/lexicon';
import LexiconPopup from './LexiconPopup';

const HEB_FONT = '"Ezra SIL","SBL BibLit","Noto Serif Hebrew",serif';
const GRK_FONT = '"SBL BibLit","Gentium Plus","Palatino Linotype",serif';

const FS_MIN = 10, FS_MAX = 50, FS_DEF = 13;
const COL_MIN = 120;
const HANDLE_W = 6;
const RESULT_CAP = 3000;

const CAT_COLORS = [
  '#2a78d6', '#1baf7a', '#eda100', '#008300',
  '#4a3aa7', '#e34948', '#e87ba4', '#eb6834', '#94a3b8',
];

const isHebStrong = (s) => s?.startsWith('H');
const origFont    = (s) => isHebStrong(s) ? HEB_FONT : GRK_FONT;
const origDir     = (s) => isHebStrong(s) ? 'rtl' : 'ltr';
const accentColor = (s) => isHebStrong(s) ? '#b45309' : '#1d4ed8';
const accentBg    = (s) => isHebStrong(s) ? '#fef3c7' : '#dbeafe';
const accentBorder= (s) => isHebStrong(s) ? '#fcd34d' : '#93c5fd';
const cleanForm   = (w) => w?.replace(/\//g, '') || '';

// Find the most common pure-Korean substring (2-4 chars) shared across multiple verse texts
function findKoreanWord(texts) {
  const valid = texts.filter(Boolean);
  if (!valid.length) return null;
  const threshold = Math.max(1, Math.ceil(valid.length * 0.3));
  const freq = new Map();
  for (const text of valid) {
    const seen = new Set();
    for (let len = 2; len <= 4; len++) {
      for (let i = 0; i <= text.length - len; i++) {
        const sub = text.slice(i, i + len);
        if (!/^[가-힣]+$/.test(sub)) continue;
        if (seen.has(sub)) continue;
        seen.add(sub);
        freq.set(sub, (freq.get(sub) || 0) + 1);
      }
    }
  }
  if (!freq.size) return null;
  const best = [...freq.entries()]
    .filter(([, c]) => c >= threshold)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
  return best[0]?.[0] || null;
}

// Highlight ALL occurrences of `query` in `text`, case-insensitive by default.
function ColorHighlightText({ text, query, color, dir = 'ltr', fontFamily, fallback = '(본문 없음)', caseSensitive = false }) {
  const baseStyle = { color: '#374151', direction: dir, ...(fontFamily ? { fontFamily } : {}) };
  if (!text) return <span style={{ color: '#94a3b8' }}>{fallback}</span>;
  if (!query) return <span style={baseStyle}>{text}</span>;
  const hay = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  if (!needle) return <span style={baseStyle}>{text}</span>;

  const parts = [];
  let idx = 0;
  while (idx < text.length) {
    const found = hay.indexOf(needle, idx);
    if (found === -1) { parts.push({ h: false, s: text.slice(idx) }); break; }
    if (found > idx) parts.push({ h: false, s: text.slice(idx, found) });
    parts.push({ h: true, s: text.slice(found, found + needle.length) });
    idx = found + needle.length;
  }
  if (!parts.some(p => p.h)) return <span style={baseStyle}>{text}</span>;

  return (
    <span style={baseStyle}>
      {parts.map((p, i) => p.h
        ? <mark key={i} style={{ background: color + '33', color, fontWeight: 700, borderRadius: 2, padding: '0 1px' }}>{p.s}</mark>
        : <span key={i}>{p.s}</span>
      )}
    </span>
  );
}

// Pick the best English gloss variant to highlight: prefer one that actually appears in `verse`.
function pickEnglishHl(glossStr, verse) {
  if (!glossStr) return null;
  const parts = glossStr.split('/').map(s => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  if (!verse) return parts[0];
  const lower = verse.toLowerCase();
  return parts.find(p => lower.includes(p.toLowerCase())) || parts[0];
}

function lighten(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + 40);
  const g = Math.min(255, ((n >> 8) & 0xff) + 40);
  const b = Math.min(255, (n & 0xff) + 40);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function groupByLemma(wordResults) {
  const map = new Map();
  for (const r of wordResults) {
    const key = r.word.s || r.word.l || r.word.w || '?';
    if (!map.has(key)) {
      map.set(key, {
        key, strong: r.word.s || '', lemma: r.word.l || r.word.w || '?',
        gloss: r.word.g || '', tr: r.word.tr || '',
        isHeb: isHebStrong(r.word.s), items: [],
      });
    }
    map.get(key).items.push(r);
  }
  return [...map.values()].sort((a, b) => b.items.length - a.items.length);
}

function HighlightText({ text, query }) {
  if (!query || !text) return <span>{text}</span>;
  const hay = text.toLowerCase();
  const needle = query.toLowerCase();
  const parts = [];
  let idx = 0;
  while (idx < text.length) {
    const found = hay.indexOf(needle, idx);
    if (found === -1) { parts.push({ h: false, s: text.slice(idx) }); break; }
    if (found > idx) parts.push({ h: false, s: text.slice(idx, found) });
    parts.push({ h: true, s: text.slice(found, found + needle.length) });
    idx = found + needle.length;
  }
  return (
    <span>
      {parts.map((p, i) => p.h
        ? <mark key={i} style={{ background: '#fef08a', padding: '0 1px', borderRadius: 2, color: '#1e293b' }}>{p.s}</mark>
        : <span key={i}>{p.s}</span>
      )}
    </span>
  );
}

function MorphTag({ code, isHeb, fs }) {
  if (!code) return null;
  const parts = humanizeMorph(code).split(/\s*[·|]\s*/).filter(Boolean);
  const tagFs = Math.max(8, (fs || FS_DEF) - 3);
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
      {parts.map((p, i) => (
        <span key={i} style={{
          fontSize: tagFs, padding: '1px 4px', borderRadius: 99,
          background: isHeb ? '#fef9ee' : '#eff6ff',
          color:      isHeb ? '#92400e' : '#1e40af',
          border:     `1px solid ${isHeb ? '#fde68a' : '#bfdbfe'}`,
          fontWeight: 600, whiteSpace: 'nowrap',
        }}>{p}</span>
      ))}
    </span>
  );
}

function DonutChart({ items, selectedBook, onSelectBook }) {
  const [hovered, setHovered] = useState(null);
  const total = items.length;

  const segments = useMemo(() => {
    if (!total) return [];
    const R = 50;
    const circumference = 2 * Math.PI * R;
    const byBook = {};
    items.forEach(r => { byBook[r.bookKo] = (byBook[r.bookKo] || 0) + 1; });
    const sorted = Object.entries(byBook).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 8);
    const otherCount = sorted.slice(8).reduce((s, [, c]) => s + c, 0);
    if (otherCount > 0) top.push(['기타', otherCount]);

    let accDeg = 0;
    return top.map(([book, count], i) => {
      const fraction = count / total;
      const startDeg = accDeg;
      accDeg += fraction * 360;
      return {
        book, count, fraction, startDeg,
        dashLen: fraction * circumference,
        color: CAT_COLORS[Math.min(i, CAT_COLORS.length - 1)],
      };
    });
  }, [items, total]);

  if (!total) return null;

  const R = 50, CX = 70, CY = 70, SW = 22;
  const circumference = 2 * Math.PI * R;

  const handleSelect = (book) => {
    if (book === '기타') return;
    onSelectBook(selectedBook === book ? null : book);
  };

  return (
    <div style={{ padding: '6px 10px 10px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, marginBottom: 4, textAlign: 'center' }}>
        책별 분포 · 클릭으로 필터
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <svg width={140} height={140} viewBox="0 0 140 140" style={{ display: 'block', overflow: 'visible' }}>
          <g transform={`rotate(-90, ${CX}, ${CY})`}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={SW} />
            {segments.map((seg, i) => {
              const isActive = hovered === i || selectedBook === seg.book;
              return (
                <circle key={i} cx={CX} cy={CY} r={R} fill="none"
                  stroke={isActive ? lighten(seg.color) : seg.color}
                  strokeWidth={isActive ? SW + 4 : SW}
                  strokeDasharray={`${seg.dashLen} ${circumference}`}
                  transform={`rotate(${seg.startDeg}, ${CX}, ${CY})`}
                  style={{ transition: 'stroke-width 0.15s, stroke 0.15s', cursor: seg.book === '기타' ? 'default' : 'pointer' }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleSelect(seg.book)}
                />
              );
            })}
          </g>
          <text x={CX} y={CY - 6} textAnchor="middle" style={{ fontSize: 18, fontWeight: 800, fill: '#1e293b' }}>
            {selectedBook ? segments.find(s => s.book === selectedBook)?.count ?? total : total}
          </text>
          <text x={CX} y={CY + 10} textAnchor="middle" style={{ fontSize: 9, fill: '#94a3b8' }}>
            {selectedBook || '총 용례'}
          </text>
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {segments.map((seg, i) => {
          const isSelected = selectedBook === seg.book;
          return (
            <div key={i}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              onClick={() => handleSelect(seg.book)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '3px 5px', borderRadius: 5,
                cursor: seg.book === '기타' ? 'default' : 'pointer',
                background: isSelected ? `${seg.color}18` : hovered === i ? '#f8fafc' : 'transparent',
                border: isSelected ? `1px solid ${seg.color}66` : '1px solid transparent',
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 10, color: isSelected ? seg.color : '#374151', fontWeight: isSelected ? 800 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seg.book}</span>
              <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', flexShrink: 0 }}>{seg.count}</span>
              <span style={{ fontSize: 9, color: '#cbd5e1', flexShrink: 0, minWidth: 26, textAlign: 'right' }}>{Math.round(seg.fraction * 100)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DragHandle({ onMouseDown, active, borderColor }) {
  const [hovered, setHovered] = useState(false);
  const show = hovered || active;
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: HANDLE_W, flexShrink: 0, cursor: 'col-resize',
        background: show
          ? 'linear-gradient(to bottom, #93c5fd44, #3b82f688, #93c5fd44)'
          : `linear-gradient(to bottom, ${borderColor}44, ${borderColor}aa, ${borderColor}44)`,
        transition: 'background 0.15s',
      }}
    />
  );
}

function DictionaryPanel({ strong, isHeb, fs, items, viewMode, verseMap, searchedQuery }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [def, setDef] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterBook, setFilterBook] = useState(null);
  const [filterForm, setFilterForm] = useState(null);
  const [lexPopup, setLexPopup] = useState(null);
  const [colW, setColW] = useState({ dict: null, usage: null, donut: 185 });
  const [dragActive, setDragActive] = useState(false);

  const col1Ref = useRef(null);
  const col2Ref = useRef(null);
  const col3Ref = useRef(null);
  const dragRef = useRef(null);
  const containerRef = useRef(null);

  const isEnglishView = viewMode === 'english';
  const isKoreanView  = viewMode === 'korean';
  const fz = fs || FS_DEF;
  const ab = accentBorder(strong);
  const ac = accentColor(strong);
  const abg = accentBg(strong);
  const font = origFont(strong);
  const dir = origDir(strong);

  useEffect(() => { setFilterBook(null); setFilterForm(null); setLexPopup(null); }, [strong]);

  useEffect(() => {
    if (!strong) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetchStrongDefinition(strong)
      .then(d => { if (!cancelled) { setDef(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [strong]);

  useEffect(() => {
    if (!dragActive) return;
    const onMove = (e) => {
      if (!dragRef.current) return;
      const { which, startX, total, startDict, startDonut } = dragRef.current;
      const dx = e.clientX - startX;
      if (which === 1) {
        const newDict = Math.max(COL_MIN, Math.min(startDict + dx, total - startDonut - COL_MIN));
        setColW({ dict: newDict, usage: total - startDonut - newDict, donut: startDonut });
      } else {
        const newDonut = Math.max(COL_MIN, Math.min(startDonut - dx, total - startDict - COL_MIN));
        setColW({ dict: startDict, usage: total - startDict - newDonut, donut: newDonut });
      }
    };
    const onUp = () => {
      dragRef.current = null;
      setDragActive(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragActive]);

  const startDrag = (which, e) => {
    e.preventDefault(); e.stopPropagation();
    const startDict  = col1Ref.current?.clientWidth ?? 0;
    const startDonut = col3Ref.current?.clientWidth ?? 0;
    const containerWidth = containerRef.current?.clientWidth ?? (startDict + (col2Ref.current?.clientWidth ?? 0) + startDonut + 2 * HANDLE_W);
    dragRef.current = {
      which, startX: e.clientX,
      total: containerWidth - 2 * HANDLE_W,
      startDict,
      startDonut,
    };
    setDragActive(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const allItems = items || [];
  const morphKeyOf = (r) => r.word.m || cleanForm(r.word.w) || '?';

  // Book filter applies to both chip counts (formStats) and displayed rows (filteredItems)
  // so the numbers stay in sync when a book is selected on the donut.
  const bookScoped = useMemo(
    () => (filterBook ? allItems.filter(r => r.bookKo === filterBook) : allItems),
    [allItems, filterBook]
  );

  const filteredItems = useMemo(
    () => (filterForm ? bookScoped.filter(r => morphKeyOf(r) === filterForm) : bookScoped),
    [bookScoped, filterForm]
  );

  // Precompute morphKey → {color, count} — group by morphology code, not raw word form
  // This collapses cantillation/accent variants of the same grammatical form into one entry.
  const formStats = useMemo(() => {
    const counts = new Map();
    for (const r of bookScoped) {
      const key = morphKeyOf(r);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return new Map(sorted.map(([key, count], i) => [key, { color: CAT_COLORS[i % CAT_COLORS.length], count }]));
  }, [bookScoped]);

  // Precompute morphKey → Korean grammatical label (for legend chips) — uses all items so labels stay stable across book filters
  const morphLabels = useMemo(() => {
    const m = new Map();
    for (const r of allItems) {
      const key = morphKeyOf(r);
      if (m.has(key)) continue;
      m.set(key, r.word.m ? humanizeMorph(r.word.m) : cleanForm(r.word.w) || key);
    }
    return m;
  }, [allItems]);

  // Book filter can remove the currently-selected form — clear it so chip count matches rows.
  useEffect(() => {
    if (filterForm && !formStats.has(filterForm)) setFilterForm(null);
  }, [filterForm, formStats]);

  // Precompute morphKey → most common Korean word (Korean tab only)
  const formHighlightWords = useMemo(() => {
    if (!isKoreanView || !verseMap) return null;
    const groups = new Map();
    for (const r of allItems) {
      const key = morphKeyOf(r);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    const result = new Map();
    for (const [key, gItems] of groups) {
      const texts = gItems.map(r => verseMap.get(`${r.bookId}-${r.chapter}-${r.verse}`));
      const word = findKoreanWord(texts);
      if (word) result.set(key, word);
    }
    return result;
  }, [allItems, isKoreanView, verseMap]);

  const srcLabel = def?.source === 'bdbt' ? 'BDB' : "Strong's";
  const srcColor = def?.source === 'bdbt' ? { bg: '#fef3c7', text: '#92400e' } : { bg: '#d1fae5', text: '#065f46' };

  const col1Style = isMobile
    ? { width: '100%', flexShrink: 0, flexGrow: 0 }
    : (colW.dict != null ? { width: colW.dict, flexShrink: 0, flexGrow: 0 } : { flex: '1.2', minWidth: COL_MIN });
  const col2Style = isMobile
    ? { width: '100%', flexShrink: 0, flexGrow: 0 }
    : (colW.usage != null ? { width: colW.usage, flexShrink: 0, flexGrow: 0 } : { flex: '1', minWidth: COL_MIN });
  const col3Style = isMobile
    ? { width: '100%', flexShrink: 0, flexGrow: 0 }
    : { width: colW.donut ?? 185, flexShrink: 0, flexGrow: 0 };

  return (
    <div style={{ borderTop: `1px solid ${ab}`, background: isHeb ? '#fffbf0' : '#f8faff' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 14px 6px', borderBottom: `1px solid ${ab}`, background: abg, flexWrap: 'wrap' }}>
        <span style={{ fontSize: fz - 3, fontWeight: 800, color: ac, letterSpacing: 1 }}>
          {isEnglishView ? 'ENGLISH LEXICON' : isHeb ? 'HEBREW LEXICON' : 'GREEK LEXICON'}
        </span>
        {def && <span style={{ fontSize: fz - 3, borderRadius: 3, padding: '1px 6px', fontWeight: 700, background: srcColor.bg, color: srcColor.text }}>{srcLabel}</span>}
        {strong && (
          <a href={`https://biblehub.com/${isHeb ? 'hebrew' : 'greek'}/${strong.replace(/^[GH]/, '')}.htm`}
            target="_blank" rel="noreferrer"
            style={{ marginLeft: 'auto', fontSize: fz - 3, color: '#94a3b8', textDecoration: 'none' }}>
            📖 BibleHub ({strong}) ↗
          </a>
        )}
      </div>

      <div ref={containerRef} style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        height: isMobile ? 'auto' : 460,
        overflow: 'hidden',
      }}>
        {/* Col 1: Dictionary */}
        <div ref={col1Ref} className={isMobile ? 'momentum-scroll' : undefined}
          style={{ ...col1Style, overflowY: 'auto', padding: '12px 14px', boxSizing: 'border-box',
            maxHeight: isMobile ? 260 : undefined,
            borderBottom: isMobile ? '1px solid rgba(15,23,42,.08)' : undefined,
            WebkitOverflowScrolling: 'touch' }}>
          {loading && <div style={{ color: '#94a3b8', fontSize: fz - 1 }}>사전 조회 중…</div>}
          {!loading && !def && (
            <div style={{ fontSize: fz - 1, color: '#94a3b8' }}>
              정의를 찾을 수 없습니다.{' '}
              {strong && <a href={`https://biblehub.com/${isHeb ? 'hebrew' : 'greek'}/${strong.replace(/^[GH]/, '')}.htm`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>BibleHub ↗</a>}
            </div>
          )}
          {def && (
            <div className="lex-def"
              style={{ fontSize: fz, lineHeight: 1.8, color: '#374151', width: '100%', boxSizing: 'border-box' }}
              dangerouslySetInnerHTML={{ __html: linkifyDefinition(def.definition || '', isHeb) }}
            />
          )}
        </div>

        {!isMobile && (
          <DragHandle onMouseDown={e => startDrag(1, e)} active={dragActive && dragRef.current?.which === 1} borderColor={ab} />
        )}

        {/* Col 2: Usage list */}
        <div ref={col2Ref} className={isMobile ? 'momentum-scroll' : undefined}
          style={{ ...col2Style, overflowY: 'auto',
            minWidth: isMobile ? undefined : COL_MIN,
            maxHeight: isMobile ? 320 : undefined,
            borderBottom: isMobile ? '1px solid rgba(15,23,42,.08)' : undefined,
            WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: '#f8fafc', borderBottom: `1px solid ${ab}`, position: 'sticky', top: 0, zIndex: 1 }}>
            {filterBook || filterForm ? (
              <>
                <span style={{ fontSize: fz - 2, fontWeight: 700, color: ac, flex: 1 }}>
                  {[filterBook && `📌 ${filterBook}`, filterForm && `🏷 ${morphLabels?.get(filterForm) || filterForm}`].filter(Boolean).join(' · ')}
                  {' '}({filteredItems.length}회)
                </span>
                <button onClick={() => { setFilterBook(null); setFilterForm(null); }} style={{ fontSize: 10, border: 'none', background: '#e2e8f0', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', color: '#475569' }}>전체 보기</button>
              </>
            ) : (
              <span style={{ fontSize: fz - 3, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5 }}>
                {isKoreanView ? `한글(KRV) 용례 ${allItems.length}회` : `용례 ${allItems.length}회 · 단어 클릭 → 상세 팝업`}
              </span>
            )}
          </div>

          {/* Form legend — all tabs, Korean grammatical labels */}
          {formStats && formStats.size > 1 && (
            <div style={{ display: 'flex', gap: 4, padding: '5px 10px', background: '#fafafa', borderBottom: `1px solid ${ab}`, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: fz - 4, color: '#94a3b8', fontWeight: 700, flexShrink: 0 }}>단어형:</span>
              {[...formStats.entries()].slice(0, 20).map(([form, { color, count }]) => {
                const label = morphLabels?.get(form) || form;
                const isSelected = filterForm === form;
                return (
                  <span key={form}
                    onClick={() => setFilterForm(isSelected ? null : form)}
                    title={isSelected ? '필터 해제' : '이 형태만 보기'}
                    style={{
                      background: isSelected ? color : color + '18',
                      border: `1px solid ${isSelected ? color : color + '66'}`,
                      color: isSelected ? '#fff' : color,
                      borderRadius: 99, padding: '2px 8px', fontSize: fz - 4, fontWeight: 700,
                      whiteSpace: 'nowrap', cursor: 'pointer',
                      boxShadow: isSelected ? `0 1px 4px ${color}55` : 'none',
                      transition: 'all 0.15s',
                    }}>
                    {label} <span style={{ fontFamily: 'monospace', fontWeight: 500, color: isSelected ? 'rgba(255,255,255,0.85)' : undefined }}>{count}</span>
                  </span>
                );
              })}
              {formStats.size > 20 && (
                <span style={{ fontSize: fz - 4, color: '#94a3b8' }}>+{formStats.size - 20}</span>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '7.5em 1fr', padding: '3px 10px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: fz - 4, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5 }}>
            <span>{isKoreanView ? '참조' : '참조 · 단어'}</span>
            <span>{isKoreanView ? '한글 본문 (KRV)' : isEnglishView ? '영어 본문 (ESV)' : `원문 본문 (${isHeb ? 'WLC' : 'NA28'})`}</span>
          </div>

          {filteredItems.map((r, i) => {
            const form = cleanForm(r.word.w);
            const morphKey = r.word.m || form || '?';
            const fc = formStats?.get(morphKey)?.color || '#94a3b8';
            const verseText = verseMap?.get(`${r.bookId}-${r.chapter}-${r.verse}`);
            // Highlight query per tab — prefer user's original search query if it appears in the verse.
            const userQ = searchedQuery?.trim();
            const verseLower = verseText?.toLowerCase();
            const userHit = userQ && verseLower && verseLower.includes(userQ.toLowerCase());
            let hlWord;
            if (isKoreanView) {
              hlWord = userHit ? userQ : (formHighlightWords?.get(morphKey) || null);
            } else if (isEnglishView) {
              hlWord = userHit ? userQ : pickEnglishHl(r.word.g, verseText);
            } else {
              // Original tab: prefer exact form (verse text is composed of these), else user query.
              hlWord = form || (userHit ? userQ : null);
            }
            // Direction & font per tab
            const textDir = isKoreanView || isEnglishView ? 'ltr' : dir;
            const textFont = isKoreanView || isEnglishView ? undefined : font;
            const fallbackMsg = isKoreanView ? '(한글 본문 없음)' : isEnglishView ? '(영어 본문 없음)' : '(원문 없음)';
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '7.5em 1fr', alignItems: 'flex-start', gap: 8, padding: '6px 10px 6px 8px', background: i % 2 === 0 ? `${fc}0d` : '#fff', borderBottom: '1px solid #f1f5f9', borderLeft: `3px solid ${fc}` }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
                  <span style={{ fontSize: fz - 1, color: fc, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{r.bookKo} {r.chapter}:{r.verse}</span>
                  {!isKoreanView && (
                    <span
                      onClick={e => setLexPopup({ entry: r.word, anchor: { x: e.clientX, y: e.clientY }, bookId: r.bookId })}
                      title="클릭하여 상세 정보 보기"
                      style={{
                        cursor: 'pointer', fontSize: fz - 2, fontWeight: 700, lineHeight: 1.2,
                        fontFamily: isEnglishView ? 'inherit' : font,
                        direction: isEnglishView ? 'ltr' : dir,
                        color: isEnglishView ? '#065f46' : fc,
                        borderBottom: '1px dashed currentColor', display: 'inline-block',
                      }}
                    >
                      {isEnglishView ? (r.word.g?.split('/')[0] || r.word.w) : form}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: fz, lineHeight: 1.65 }}>
                  <ColorHighlightText text={verseText} query={hlWord} color={fc}
                    dir={textDir} fontFamily={textFont} fallback={fallbackMsg}
                    caseSensitive={!isKoreanView && !isEnglishView} />
                </span>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div style={{ padding: '24px 10px', textAlign: 'center', color: '#94a3b8', fontSize: fz - 1 }}>용례가 없습니다.</div>
          )}
        </div>

        {!isMobile && (
          <DragHandle onMouseDown={e => startDrag(2, e)} active={dragActive && dragRef.current?.which === 2} borderColor={ab} />
        )}

        {/* Col 3: Donut */}
        <div ref={col3Ref} className={isMobile ? 'momentum-scroll' : undefined}
          style={{ ...col3Style, overflowY: 'auto', background: '#fafbfc',
            minWidth: isMobile ? undefined : COL_MIN,
            maxHeight: isMobile ? 320 : undefined,
            WebkitOverflowScrolling: 'touch' }}>
          <DonutChart items={allItems} selectedBook={filterBook} onSelectBook={setFilterBook} />
        </div>
      </div>

      {lexPopup && (
        <LexiconPopup entry={lexPopup.entry} anchor={lexPopup.anchor} bookId={lexPopup.bookId} onClose={() => setLexPopup(null)} zIndex={2500} />
      )}
    </div>
  );
}

function LemmaGroup({ group, showDict, onToggleDict, fs, viewMode, verseMap, searchedQuery }) {
  const fz = fs || FS_DEF;
  const ac = accentColor(group.strong);
  const abg = accentBg(group.strong);
  const ab = accentBorder(group.strong);
  const font = origFont(group.strong);
  const isEnglishView = viewMode === 'english';

  return (
    <div style={{ borderBottom: `2px solid ${ab}`, marginBottom: 2 }}>
      <div style={{ background: `linear-gradient(to right, ${abg}, #f8fafc)`, borderLeft: `4px solid ${ac}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 6px', flexWrap: 'wrap' }}>
          {isEnglishView ? (
            <>
              <span style={{ fontSize: fz + 6, fontWeight: 800, color: '#1e293b' }}>{group.gloss || group.lemma}</span>
              <span style={{ fontSize: fz + 2, fontFamily: font, direction: origDir(group.strong), color: ac, fontWeight: 600, opacity: 0.75 }}>{group.lemma}</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: fz + 8, fontFamily: font, direction: origDir(group.strong), color: ac, fontWeight: 700, lineHeight: 1.3 }}>{group.lemma}</span>
              {group.tr && <span style={{ fontSize: fz - 1, color: '#64748b', fontStyle: 'italic' }}>{group.tr}</span>}
            </>
          )}
          {group.strong && (
            <span style={{ fontSize: fz - 2, background: abg, color: ac, border: `1px solid ${ab}`, borderRadius: 4, padding: '2px 7px', fontWeight: 800, fontFamily: 'monospace' }}>
              {group.strong}
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: fz - 1, fontWeight: 700, color: ac, background: abg, border: `1px solid ${ab}`, borderRadius: 99, padding: '2px 10px' }}>
            {group.items.length}회
          </span>
        </div>
        <div style={{ padding: '0 14px 8px', fontSize: fz, color: '#374151' }}>
          {isEnglishView
            ? group.tr && <span style={{ fontWeight: 500 }}>{group.tr}</span>
            : group.gloss && <>
                <span style={{ color: '#94a3b8', fontSize: fz - 2, fontWeight: 700, marginRight: 6 }}>기본뜻</span>
                <span style={{ fontWeight: 500 }}>{group.gloss}</span>
              </>
          }
        </div>
        <div style={{ padding: '0 14px 10px' }}>
          <button onClick={onToggleDict} style={{
            fontSize: fz - 2, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', fontWeight: 600,
            background: showDict ? ac : '#fff', color: showDict ? '#fff' : ac, border: `1px solid ${ac}`,
          }}>
            📖 {showDict ? '사전·용례 닫기' : '사전·용례 보기'}
          </button>
        </div>
      </div>
      {showDict && (
        <DictionaryPanel strong={group.strong} isHeb={group.isHeb} fs={fs} items={group.items} viewMode={viewMode} verseMap={verseMap} searchedQuery={searchedQuery} />
      )}
    </div>
  );
}

function VerseRow({ r, fs }) {
  const fz = fs || FS_DEF;
  return (
    <div style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '8em 1fr', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ fontSize: fz - 1, fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap', paddingTop: 1 }}>
        {r.bookKo} {r.chapter}:{r.verse}
      </span>
      <span style={{ fontSize: fz, color: '#374151', lineHeight: 1.7 }}>
        <HighlightText text={r.text} query={r.matchedQuery} />
      </span>
    </div>
  );
}

function FontSizeControl({ fs, setFs }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.12)', borderRadius: 6, padding: '3px 8px' }}>
      <button onClick={() => setFs(v => Math.max(FS_MIN, v - 1))} disabled={fs <= FS_MIN}
        style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: 13, cursor: fs <= FS_MIN ? 'not-allowed' : 'pointer', opacity: fs <= FS_MIN ? 0.4 : 1, padding: '0 2px', fontWeight: 700 }}>A−</button>
      <span onClick={() => setFs(FS_DEF)} style={{ fontSize: 10, color: fs === FS_DEF ? '#93c5fd' : '#fde68a', cursor: 'pointer', minWidth: 22, textAlign: 'center', fontWeight: 700 }}>{fs}</span>
      <button onClick={() => setFs(v => Math.min(FS_MAX, v + 1))} disabled={fs >= FS_MAX}
        style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: 13, cursor: fs >= FS_MAX ? 'not-allowed' : 'pointer', opacity: fs >= FS_MAX ? 0.4 : 1, padding: '0 2px', fontWeight: 700 }}>A+</button>
    </div>
  );
}

const INPUT_OPTS = [
  { key: 'original', label: '원문 입력', sub: '히·헬' },
  { key: 'english',  label: '영어 입력', sub: 'Gloss' },
  { key: 'korean',   label: '한글 입력', sub: 'KRV' },
];
const TAB_LABELS = { original: '원문', english: '영어', korean: '한글' };
const TAB_COLORS = { original: '#1d4ed8', english: '#059669', korean: '#d97706' };
const PLACEHOLDERS = {
  original: '히브리어·헬라어 입력 (예: אֱלֹהִים, λόγος)',
  english:  'English gloss (예: love, create)',
  korean:   '한글 검색 (예: 사랑, 하나님)',
};

export default function WordSearchModal({ initialQuery = '', initialMode = 'original', onClose }) {
  const isMobile = useMobile();
  const [minimized, setMinimized] = useState(false);
  const [pos,  setPos]  = useState(() => isMobile
    ? { x: 0, y: 0 }
    : { x: Math.max(20, (typeof window !== 'undefined' ? window.innerWidth / 2 - 450 : 100)), y: 60 });
  const [size, setSize] = useState(() => isMobile
    ? { w: typeof window !== 'undefined' ? window.innerWidth : 375,
        h: typeof window !== 'undefined' ? window.innerHeight : 667 }
    : { w: Math.min(960, (typeof window !== 'undefined' ? window.innerWidth - 40 : 800)), h: 640 });

  // 모바일 orientation/resize 대응
  useEffect(() => {
    if (!isMobile) return;
    const onR = () => {
      setPos({ x: 0, y: 0 });
      setSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onR);
    window.addEventListener('orientationchange', onR);
    return () => {
      window.removeEventListener('resize', onR);
      window.removeEventListener('orientationchange', onR);
    };
  }, [isMobile]);

  const [query, setQuery] = useState(initialQuery);
  const [inputLang, setInputLang] = useState(initialMode);
  const [koScope, setKoScope] = useState('all');
  const [fs, setFs] = useState(FS_DEF);

  const [byMode, setByMode] = useState({ original: [], english: [], korean: [], origLangText: [], englishText: [] });
  const [displayMode, setDisplayMode] = useState(initialMode);
  const [searchedQuery, setSearchedQuery] = useState(initialQuery);
  const [primarySearching, setPrimarySearching] = useState(false);
  const [derivingLangs, setDerivingLangs] = useState(false);
  const [done, setDone] = useState(false);
  const [dictKeys, setDictKeys] = useState(new Set());
  const [isDerived, setIsDerived] = useState({ original: false, english: false, korean: false });

  const abortRef = useRef(null);
  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragStart = useRef({});
  const resizeStart = useRef({});

  const addTo = useCallback((mode) => (hits) => {
    setByMode(prev => {
      const cur = prev[mode];
      if (cur.length >= RESULT_CAP) return prev;
      return { ...prev, [mode]: [...cur, ...hits].slice(0, RESULT_CAP) };
    });
  }, []);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const signal = ctrl.signal;

    setByMode({ original: [], english: [], korean: [], origLangText: [], englishText: [] });
    setDictKeys(new Set());
    setDone(false);
    setIsDerived({ original: false, english: false, korean: false });
    setSearchedQuery(q);

    const detected = detectInputMode(q) || inputLang;
    setDisplayMode(detected);

    const primaryAcc = [];
    const onPrimary = (hits) => {
      primaryAcc.push(...hits);
      addTo(detected)(hits);
    };

    setPrimarySearching(true);
    try {
      if (detected === 'original' || detected === 'english') {
        // 원문/영어 입력: lex JSON 단어 검색 → 각 언어별 절 본문 파생
        const searchFn = detected === 'original' ? searchByOriginal : searchByEnglish;
        const shareMode = detected === 'original' ? 'english' : 'original';
        await searchFn(q, onPrimary, signal);
        if (signal.aborted) return;

        // 다른 원어/영어 탭에도 동일 단어 목록 공유 (레마 그룹 재사용)
        setByMode(prev => ({ ...prev, [shareMode]: primaryAcc.slice(0, RESULT_CAP) }));
        setPrimarySearching(false);
        setDerivingLangs(true);

        await Promise.all([
          fetchKRVVerses(primaryAcc, addTo('korean'), signal),
          fetchESVVerses(primaryAcc, addTo('englishText'), signal),
          fetchOrigLangVerses(primaryAcc, addTo('origLangText'), signal),
        ]);
      } else {
        // 한글 입력: KRV 절 검색 → 원어 단어 파생 → ESV/원어 절 본문 파생
        await searchByKorean(q, koScope, onPrimary, signal);
        if (signal.aborted || !primaryAcc.length) return;

        setPrimarySearching(false);
        setDerivingLangs(true);

        const derivedAcc = [];
        await deriveOriginalFromKorean(primaryAcc, (hits) => {
          derivedAcc.push(...hits);
          addTo('original')(hits);
          addTo('english')(hits);
        }, signal);
        setIsDerived({ original: true, english: true, korean: false });

        if (!signal.aborted && derivedAcc.length) {
          await Promise.all([
            fetchESVVerses(derivedAcc, addTo('englishText'), signal),
            fetchOrigLangVerses(derivedAcc, addTo('origLangText'), signal),
          ]);
        }
      }
    } catch (err) {
      if (err?.name !== 'AbortError') console.error('WordSearch error', err);
    } finally {
      setPrimarySearching(false);
      setDerivingLangs(false);
      setDone(true);
    }
  }, [query, inputLang, koScope, addTo]);

  useEffect(() => { if (initialQuery) handleSearch(); }, []); // eslint-disable-line

  const handleStop = () => {
    abortRef.current?.abort();
    setPrimarySearching(false);
    setDerivingLangs(false);
    setDone(true);
  };

  const onHeaderMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
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
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - 200, dragStart.current.px + e.clientX - dragStart.current.mx)),
          y: Math.max(0, Math.min(window.innerHeight - 60, dragStart.current.py + e.clientY - dragStart.current.my)),
        });
      }
      if (resizing.current) {
        setSize({
          w: Math.max(640, Math.min(1400, resizeStart.current.w + e.clientX - resizeStart.current.mx)),
          h: Math.max(200, Math.min(window.innerHeight - 80, resizeStart.current.h + e.clientY - resizeStart.current.my)),
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
  }, []);

  // Verse text maps per language — memoized for stable DictionaryPanel reference
  const koreanMap = useMemo(() => {
    const m = new Map();
    for (const r of byMode.korean) {
      if (r.type === 'verse') m.set(`${r.bookId}-${r.chapter}-${r.verse}`, r.text);
    }
    return m;
  }, [byMode.korean]);

  const englishMap = useMemo(() => {
    const m = new Map();
    for (const r of byMode.englishText) {
      if (r.type === 'verse') m.set(`${r.bookId}-${r.chapter}-${r.verse}`, r.text);
    }
    return m;
  }, [byMode.englishText]);

  const origLangMap = useMemo(() => {
    const m = new Map();
    for (const r of byMode.origLangText) {
      if (r.type === 'verse') m.set(`${r.bookId}-${r.chapter}-${r.verse}`, r.text);
    }
    return m;
  }, [byMode.origLangText]);

  // Groups: original/english use their own data; korean tab reuses byMode.original
  const { groups, wordCount, verseResults } = useMemo(() => {
    const displayResults = byMode[displayMode] || [];
    const source = displayMode === 'korean' ? byMode.original : displayResults;
    const words = source.filter(r => r.type === 'word');
    const verses = displayResults.filter(r => r.type === 'verse');
    return { groups: groupByLemma(words), wordCount: words.length, verseResults: verses };
  }, [byMode, displayMode]);

  const toggleDict    = (key) => setDictKeys(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const openAllDicts  = () => setDictKeys(new Set(groups.map(g => g.key)));
  const closeAllDicts = () => setDictKeys(new Set());

  const tabCounts = {
    original: byMode.original.filter(r => r.type === 'word').length,
    english:  byMode.english.filter(r => r.type === 'word').length,
    korean:   byMode.korean.filter(r => r.type === 'verse').length,
  };

  const isSearching = primarySearching || derivingLangs;
  const statusText = primarySearching ? '검색 중…' : derivingLangs ? '다른 언어 파생 중…' : '';

  const handleQueryChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    const det = detectInputMode(v);
    if (det) setInputLang(det);
  };

  const hasResults = groups.length > 0 || verseResults.length > 0;

  return (
    <div
      role="dialog"
      aria-modal={isMobile ? 'true' : 'false'}
      aria-label="원어 성경 다언어 검색"
      className={isMobile ? 'h-screen-safe' : undefined}
      style={{
        position: 'fixed',
        left: isMobile ? 0 : pos.x,
        top: isMobile ? 0 : pos.y,
        width: isMobile ? '100%' : size.w,
        height: isMobile ? undefined : (minimized ? 'auto' : size.h),
        zIndex: 2100,
        background: '#fff',
        borderRadius: isMobile ? 0 : 12,
        boxShadow: isMobile ? 'none' : '0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.10)',
        border: isMobile ? 'none' : '1px solid #e2e8f0',
        fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
        display: 'flex', flexDirection: 'column',
      }}>
      {/* Titlebar */}
      <div onMouseDown={isMobile ? undefined : onHeaderMouseDown} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: isMobile
          ? 'calc(env(safe-area-inset-top, 0px) + 10px) calc(env(safe-area-inset-right, 0px) + 14px) 10px calc(env(safe-area-inset-left, 0px) + 14px)'
          : '10px 14px',
        background: 'linear-gradient(135deg,#1e3a8a,#0f172a)',
        borderRadius: isMobile ? 0 : (minimized ? 12 : '12px 12px 0 0'),
        cursor: isMobile ? 'default' : 'grab', userSelect: 'none',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 16 }}>🔍</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: '#fff' }}>{isMobile ? '원어 다언어 검색' : '원어 성경 다언어 검색'}</span>
        {isSearching && <span style={{ fontSize: 11, color: '#fde68a' }}>{statusText}</span>}
        {!isSearching && done && (
          <span style={{ fontSize: 11, color: '#93c5fd', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 99 }}>
            {Object.entries(tabCounts).filter(([, c]) => c > 0).map(([m, c]) => `${TAB_LABELS[m]} ${c}`).join(' · ')}
          </span>
        )}
        <FontSizeControl fs={fs} setFs={setFs} />
        <button onMouseDown={e => e.stopPropagation()} onClick={() => setMinimized(v => !v)} style={iconBtnStyle}>{minimized ? '▲' : '▼'}</button>
        <button onMouseDown={e => e.stopPropagation()} onClick={onClose} style={{ ...iconBtnStyle, background: 'rgba(239,68,68,0.25)' }}>✕</button>
      </div>

      {!minimized && (
        <div style={{ display: 'flex', flexDirection: 'column',
          flex: isMobile ? 1 : undefined,
          height: isMobile ? undefined : size.h,
          overflow: 'hidden',
          borderRadius: isMobile ? 0 : '0 0 12px 12px' }}>
          {/* Search controls */}
          <div style={{ padding: isMobile ? '10px 14px 10px' : '10px 14px 8px',
            borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
            <div className={isMobile ? 'momentum-scroll' : undefined}
              style={{ display: 'flex', gap: 4, marginBottom: 8,
                overflowX: isMobile ? 'auto' : 'visible' }}>
              {INPUT_OPTS.map(opt => (
                <button key={opt.key} onClick={() => setInputLang(opt.key)} style={{
                  flex: isMobile ? '0 0 auto' : 1,
                  padding: isMobile ? '8px 12px' : '5px 0',
                  minHeight: isMobile ? 44 : undefined,
                  minWidth: isMobile ? 64 : undefined,
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                  fontSize: isMobile ? 12 : 11,
                  fontWeight: inputLang === opt.key ? 700 : 400,
                  background: inputLang === opt.key ? TAB_COLORS[opt.key] : '#e2e8f0',
                  color: inputLang === opt.key ? '#fff' : '#64748b',
                  flexShrink: 0,
                }}>
                  {opt.label}
                  <div style={{ fontSize: isMobile ? 10 : 9, opacity: 0.8, fontWeight: 400 }}>{opt.sub}</div>
                </button>
              ))}
              {inputLang === 'korean' && (
                [['all', '전체'], ['ot', '구약'], ['nt', '신약']].map(([k, l]) => (
                  <button key={k} onClick={() => setKoScope(k)} style={{
                    padding: isMobile ? '8px 12px' : '5px 8px',
                    minHeight: isMobile ? 44 : undefined,
                    border: 'none', borderRadius: 6, cursor: 'pointer',
                    fontSize: isMobile ? 12 : 11,
                    fontWeight: koScope === k ? 700 : 400,
                    background: koScope === k ? '#d97706' : '#e2e8f0',
                    color: koScope === k ? '#fff' : '#64748b',
                    flexShrink: 0,
                  }}>{l}</button>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={query} onChange={handleQueryChange}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={PLACEHOLDERS[inputLang] || ''}
                style={{
                  flex: 1,
                  padding: isMobile ? '12px 12px' : '8px 10px',
                  minHeight: isMobile ? 44 : undefined,
                  borderRadius: 6, border: '1px solid #cbd5e1',
                  fontSize: isMobile ? Math.max(16, fs) : fs, outline: 'none',
                  fontFamily: inputLang === 'original' ? `${HEB_FONT}, ${GRK_FONT}, sans-serif` : 'inherit',
                  direction: inputLang === 'original' ? 'rtl' : 'ltr',
                }}
                autoFocus
              />
              {isSearching
                ? <button onClick={handleStop} style={{ ...actionBtn, background: '#ef4444',
                    minHeight: isMobile ? 44 : undefined,
                    padding: isMobile ? '12px 16px' : undefined }}>■ 중단</button>
                : <button onClick={handleSearch} style={{ ...actionBtn, background: '#1d4ed8',
                    minHeight: isMobile ? 44 : undefined,
                    padding: isMobile ? '12px 16px' : undefined }}>🔍 검색</button>
              }
            </div>
          </div>

          {/* Language tabs */}
          {done && (
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', background: '#f1f5f9', flexShrink: 0 }}>
              {['original', 'english', 'korean'].map(m => {
                const cnt = tabCounts[m];
                const isActive = displayMode === m;
                const color = TAB_COLORS[m];
                return (
                  <button key={m} onClick={() => setDisplayMode(m)} style={{
                    flex: 1, padding: '8px 4px', border: 'none', borderBottom: isActive ? `3px solid ${color}` : '3px solid transparent',
                    background: isActive ? '#fff' : 'transparent',
                    cursor: 'pointer', fontWeight: isActive ? 700 : 400,
                    color: isActive ? color : '#94a3b8',
                    fontSize: 12,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  }}>
                    <span>{TAB_LABELS[m]}</span>
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 99,
                      background: cnt > 0 ? (isActive ? color : '#e2e8f0') : '#f1f5f9',
                      color: cnt > 0 ? (isActive ? '#fff' : '#64748b') : '#cbd5e1',
                      fontWeight: 700,
                    }}>
                      {m === 'korean' ? `${cnt}절` : `${cnt}회`}
                      {isDerived[m] && cnt > 0 && ' (추정)'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Results area */}
          <div className={isMobile ? 'momentum-scroll' : undefined}
            style={{ flex: 1, overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : 0 }}>
            {isSearching && !hasResults && (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: fs }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>⏳</div>
                {statusText}
              </div>
            )}

            {done && !hasResults && !isSearching && (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: fs }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🔎</div>
                검색 결과가 없습니다.
              </div>
            )}

            {isDerived[displayMode] && hasResults && (
              <div style={{ padding: '6px 14px', background: '#fef9c3', borderBottom: '1px solid #fde68a', fontSize: fs - 2, color: '#92400e' }}>
                ⚠️ 한글 구절의 빈도 분석을 통해 추정된 원문 단어들입니다. 정확한 결과는 원문으로 직접 검색하세요.
              </div>
            )}

            {isSearching && hasResults && (
              <div style={{ padding: '5px 14px', background: '#eff6ff', borderBottom: '1px solid #dbeafe', fontSize: fs - 3, color: '#3b82f6', fontWeight: 600 }}>
                {statusText} ({displayMode === 'korean' ? `${verseResults.length}절` : `${wordCount}회`} 확인됨)
              </div>
            )}

            {groups.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: fs - 2, color: '#64748b', flex: 1 }}>
                    레마 {groups.length}개 · {displayMode === 'korean' ? `한글 ${koreanMap.size}절 연결됨` : `용례 ${wordCount}회`}
                    {wordCount >= RESULT_CAP && ` (${RESULT_CAP} 상한)`}
                  </span>
                  <button onClick={openAllDicts}  style={miniBtn}>📖 전체 열기</button>
                  <button onClick={closeAllDicts} style={miniBtn}>전체 닫기</button>
                </div>
                {groups.map(g => (
                  <LemmaGroup key={g.key} group={g}
                    showDict={dictKeys.has(g.key)}
                    onToggleDict={() => toggleDict(g.key)}
                    fs={fs} viewMode={displayMode}
                    verseMap={displayMode === 'korean' ? koreanMap : displayMode === 'english' ? englishMap : origLangMap}
                    searchedQuery={searchedQuery}
                  />
                ))}
              </>
            )}

            {/* Korean fallback: no original groups derived */}
            {displayMode === 'korean' && groups.length === 0 && verseResults.length > 0 && (
              <>
                <div style={{ padding: '6px 14px', background: '#fef9ee', borderBottom: '1px solid #fcd34d', fontSize: fs - 2, color: '#92400e', fontWeight: 600 }}>
                  한글(KRV) {verseResults.length}절{verseResults.length >= RESULT_CAP && ` · ${RESULT_CAP}건 상한`}
                </div>
                {verseResults.map((r, i) => <VerseRow key={i} r={r} fs={fs} />)}
              </>
            )}
          </div>
        </div>
      )}

      {!minimized && (
        <div onMouseDown={onResizeMouseDown} style={{
          position: 'absolute', right: 0, bottom: 0, width: 18, height: 18, cursor: 'se-resize',
          borderRadius: '0 0 12px 0',
          background: 'linear-gradient(135deg,transparent 50%,#cbd5e1 50%)',
        }} />
      )}
    </div>
  );
}

const iconBtnStyle = {
  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6,
  color: '#fff', fontSize: 12, width: 26, height: 26, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};
const actionBtn = {
  padding: '8px 14px', border: 'none', borderRadius: 6,
  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
};
const miniBtn = {
  fontSize: 10, padding: '3px 8px', border: '1px solid #cbd5e1',
  borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#475569', whiteSpace: 'nowrap',
};
