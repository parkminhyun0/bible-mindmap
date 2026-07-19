import { useState, useMemo, useEffect } from 'react';
import { Handle, Position, useReactFlow, useEdges, NodeResizer } from '@xyflow/react';
import { fetchVerse } from '../api/bibleApi';
import { isOT } from '../data/bibleBooks';
import { loadVerseLexicon } from '../utils/lexicon';
import LexiconPopup from './LexiconPopup';

// 원어 문자 정규화 — 문장부호·발음기호·형태소 구분자 제거
function normalizeOriginal(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFD').replace(/[̀-֑ͯ-ׇ]/g, '')
    .replace(/[\/\\]/g, '')
    .replace(/[·.,;:!?"'()\[\]«»‹›—–]/g, '')
    .trim()
    .toLowerCase();
}

const EDGE_BADGE_CONFIG = [
  { type: 'citation',  label: '인용',  color: '#ef4444', bg: '#fef2f2' },
  { type: 'echo',      label: '반향',  color: '#ca8a04', bg: '#fefce8' },
  { type: 'parallel',  label: '평행',  color: '#3b82f6', bg: '#eff6ff' },
  { type: 'topic',     label: '주제',  color: '#8b5cf6', bg: '#f5f3ff' },
  { type: 'crossref',  label: '교차',  color: '#0ea5e9', bg: '#f0f9ff' },
  { type: 'relation',  label: '관계',  color: '#475569', bg: '#f1f5f9' },
];

const TABS = [
  { id: 'krv',      label: '개역한글' },
  { id: 'esv',      label: 'ESV' },
  { id: 'original', label: '원어' },
];

export default function VerseNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const allEdges = useEdges();
  const borderColor = data.color || '#3b82f6';
  const fontSize = data.fontSize || 13;

  const hasMulti = !!data.bookId;
  const visibleTabs = TABS;

  // Count edges by type for this node
  const edgeCounts = useMemo(() => {
    const counts = {};
    allEdges.forEach((e) => {
      if (e.source === id || e.target === id) {
        counts[e.type] = (counts[e.type] || 0) + 1;
      }
    });
    return counts;
  }, [allEdges, id]);

  const activeBadges = EDGE_BADGE_CONFIG.filter((cfg) => edgeCounts[cfg.type] > 0);

  // data.activeTab을 단일 진실 출처로 사용 — NodeEditor와 양방향 동기화
  const activeTab = data.activeTab || 'krv';
  const [tabLoading, setTabLoading] = useState({});
  const [tabErrors, setTabErrors]   = useState({});

  const handleTabClick = async (tabId) => {
    // data.activeTab을 업데이트 → VerseNode(props)와 NodeEditor 모두 동기화
    setNodes((nds) =>
      nds.map((n) => n.id === id ? { ...n, data: { ...n.data, activeTab: tabId } } : n)
    );
    if (!hasMulti) return;
    if (tabErrors[tabId]) return;
    if (typeof data.translations?.[tabId] === 'string') return; // already loaded

    setTabLoading((prev) => ({ ...prev, [tabId]: true }));
    try {
      const text = await fetchVerse(data.bookId, data.chapter, data.verseStart, data.verseEnd, tabId);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, translations: { ...n.data.translations, [tabId]: text } } }
            : n,
        ),
      );
    } catch (e) {
      setTabErrors((prev) => ({ ...prev, [tabId]: e.message || '불러오기 실패' }));
    } finally {
      setTabLoading((prev) => ({ ...prev, [tabId]: false }));
    }
  };

  let displayText = '';
  let displayHtml = false;
  let isLoading   = false;

  if (!hasMulti) {
    displayText = data.text || '';
    displayHtml = displayText.includes('<');
  } else if (tabLoading[activeTab]) {
    isLoading = true;
  } else if (tabErrors[activeTab]) {
    displayText = `(${tabErrors[activeTab]})`;
  } else {
    const t = data.translations?.[activeTab];
    if (typeof t === 'string') {
      displayText = t;
      displayHtml = t.includes('<');
    } else {
      // Fall back to data.text for KRV if translations.krv not loaded yet
      displayText = activeTab === 'krv' && data.text ? data.text : '';
    }
  }

  // 구약 원어는 히브리어(RTL), 신약은 헬라어(LTR)
  const isRTL = activeTab === 'original' && !!data.bookId && isOT(data.bookId);

  // ── Lexicon (원어 탭 전용) ─────────────────────────────────────────
  const [lexEntries, setLexEntries] = useState([]);
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    if (activeTab !== 'original' || !data.bookId) return;
    let cancelled = false;
    loadVerseLexicon(data.bookId, data.chapter, data.verseStart)
      .then((entries) => { if (!cancelled) setLexEntries(entries || []); })
      .catch(() => { if (!cancelled) setLexEntries([]); });
    return () => { cancelled = true; };
  }, [activeTab, data.bookId, data.chapter, data.verseStart]);

  // 원어 탭 텍스트를 단어별 chip으로 렌더링 (선택된 노드에서만 활성화)
  const renderOriginalWithLexicon = () => {
    if (!displayText || !selected) return null;
    // HTML → 텍스트
    const doc = new DOMParser().parseFromString(displayText, 'text/html');
    const text = doc.body.textContent || '';
    const parts = text.split(/(\s+)/);

    // lemma 인덱스
    const lexIdx = new Map();
    const consumed = new Map();
    for (const e of lexEntries) {
      const key = normalizeOriginal(e.w);
      if (!key) continue;
      if (!lexIdx.has(key)) lexIdx.set(key, []);
      lexIdx.get(key).push(e);
    }

    return parts.map((p, i) => {
      if (/^\s+$/.test(p)) return <span key={i} style={{ whiteSpace: 'pre' }}>{p}</span>;
      if (!p) return null;
      const key = normalizeOriginal(p);
      const bucket = lexIdx.get(key);
      const nth = consumed.get(key) || 0;
      const entry = bucket?.[nth] || bucket?.[bucket ? bucket.length - 1 : 0];
      if (bucket) consumed.set(key, nth + 1);
      const hasLex = !!entry;
      return (
        <span
          key={i}
          onClick={hasLex ? (e) => {
            e.stopPropagation();
            setPopup({ entry, anchor: { x: e.clientX, y: e.clientY } });
          } : undefined}
          className={hasLex ? 'nodrag' : undefined}
          style={{
            cursor: hasLex ? 'pointer' : 'default',
            borderBottom: hasLex ? '1px dotted #8b5cf6' : 'none',
          }}
          title={hasLex ? `${entry.tr || ''} · ${entry.s || ''} · ${entry.g || ''} — 클릭: 어형 카드` : undefined}
        >
          {p}
        </span>
      );
    });
  };

  return (
    <div
      style={{
        background: '#fff',
        border: `2px solid ${borderColor}`,
        borderRadius: 8,
        padding: '10px 14px',
        width: '100%',
        minWidth: 240,
        boxSizing: 'border-box',
        boxShadow: selected
          ? `0 0 0 2px ${borderColor}60, 0 2px 8px rgba(0,0,0,0.12)`
          : '0 2px 8px rgba(0,0,0,0.08)',
        fontSize,
        lineHeight: 1.6,
      }}
    >
      <NodeResizer
        color={borderColor}
        isVisible={selected}
        minWidth={200}
        minHeight={60}
        handleStyle={resizerHandle}
        lineStyle={resizerLine}
      />
      {/* Header */}
      <div
        style={{
          fontWeight: 700,
          fontSize: fontSize + 1,
          color: borderColor,
          marginBottom: activeBadges.length > 0 ? 4 : 6,
          borderBottom: activeBadges.length > 0 ? 'none' : `1px solid ${borderColor}30`,
          paddingBottom: activeBadges.length > 0 ? 0 : 4,
        }}
      >
        📖 {data.reference}
      </div>

      {/* Edge count badges */}
      {activeBadges.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6,
          paddingBottom: 4, borderBottom: `1px solid ${borderColor}30`,
        }}>
          {activeBadges.map((cfg) => (
            <span
              key={cfg.type}
              title={`${cfg.label} ${edgeCounts[cfg.type]}개`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 2,
                padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                color: cfg.color, background: cfg.bg,
                border: `1px solid ${cfg.color}40`,
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: cfg.color, display: 'inline-block', flexShrink: 0,
              }} />
              {cfg.label} {edgeCounts[cfg.type]}
            </span>
          ))}
        </div>
      )}

      {/* Translation tabs */}
      {hasMulti && (
        <div style={{ display: 'flex', gap: 2, marginBottom: 8, flexWrap: 'wrap' }}>
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabClick(t.id)}
              style={{
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: activeTab === t.id ? 700 : 400,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: activeTab === t.id ? borderColor : '#f1f5f9',
                color: activeTab === t.id ? '#fff' : '#64748b',
                opacity: tabErrors[t.id] ? 0.5 : 1,
              }}
            >
              {t.label}
              {tabLoading[t.id] && ' …'}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{ color: '#94a3b8', fontSize: 12 }}>불러오는 중…</div>
      ) : activeTab === 'original' && selected && lexEntries.length > 0 ? (
        <div style={{ color: '#1e293b', direction: isRTL ? 'rtl' : 'ltr', fontFamily: 'SBL BibLit, Cardo, serif' }}>
          {renderOriginalWithLexicon()}
          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>
            💡 밑줄 단어 클릭 → 어형 분석
          </div>
        </div>
      ) : displayHtml ? (
        <div
          className="rich-text-display"
          style={{ color: '#1e293b', direction: isRTL ? 'rtl' : 'ltr' }}
          dangerouslySetInnerHTML={{ __html: displayText }}
        />
      ) : (
        <div style={{ color: displayText.startsWith('(') ? '#94a3b8' : '#1e293b', direction: isRTL ? 'rtl' : 'ltr' }}>
          {displayText || <span style={{ color: '#cbd5e1', fontSize: 11 }}>탭을 클릭하면 본문을 불러옵니다</span>}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: borderColor }} />
      <Handle type="target" position={Position.Left}  style={{ background: borderColor }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: borderColor }} />
      <Handle type="target" position={Position.Top}    id="top"    style={{ background: borderColor }} />

      {popup && (
        <LexiconPopup
          entry={popup.entry}
          anchor={popup.anchor}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}

const resizerHandle = {
  width: 9, height: 9, borderRadius: 3,
  border: '1.5px solid #94a3b8', background: '#fff',
};
const resizerLine = { borderColor: '#94a3b8', borderWidth: 1 };
