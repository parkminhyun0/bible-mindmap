import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchStrongDefinition, fetchStrongConcordance, humanizeMorph, linkifyDefinition } from '../utils/lexicon';
import { getBook } from '../data/bibleBooks';
import { useCanvas } from '../context/CanvasContext';
import useMobile from '../hooks/useMobile';
import OriginalLanguageResearchActions from './OriginalLanguageResearchActions';
import { KOREAN_GLOSS } from '../data/koreanGloss';

/**
 * 원어 단어 어형 분석 카드.
 * Props:
 *   entry     = { w, tr, s, m, l, g }  (word / transliteration / strong / morph / lemma / gloss)
 *   anchor    = { x, y }               팝업이 등장할 화면 좌표
 *   bookId    = string                  현재 구절의 책 ID (용례 검색 범위)
 *   passage   = { bookId, chapter, verseStart, verseEnd } 원래 연구 위치
 *   onClose
 *   onAddVerse(ref)                     용례에서 "+ 추가" 클릭 시 호출
 */
export default function LexiconPopup({ entry, anchor, bookId, passage, onClose, zIndex }) {
  const { onAddVerse } = useCanvas() || {};
  const isMobile = useMobile();
  const [tab, setTab] = useState('def'); // 'def' | 'usage'
  const [definition, setDefinition] = useState(null);
  const [defLoading, setDefLoading] = useState(false);
  const [defError, setDefError] = useState(null);
  const [researchActive, setResearchActive] = useState(false);

  const [usages, setUsages] = useState(null);   // null = 미로드, [] = 없음, [...] = 목록
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState('');

  useEffect(() => {
    if (!entry?.s) return;
    let cancelled = false;
    setDefLoading(true);
    setDefError(null);
    setDefinition(null);
    fetchStrongDefinition(entry.s)
      .then((d) => { if (!cancelled) setDefinition(d); })
      .catch((e) => { if (!cancelled) setDefError(e.message || '조회 실패'); })
      .finally(() => { if (!cancelled) setDefLoading(false); });
    return () => { cancelled = true; };
  }, [entry?.s]);

  useEffect(() => {
    if (tab !== 'usage' || usages !== null) return;
    if (!entry?.s || !bookId) { setUsages([]); return; }
    let cancelled = false;
    setUsageLoading(true);
    setUsageError('');
    fetchStrongConcordance(entry.s, bookId)
      .then((list) => {
        if (!cancelled) setUsages(list);
      })
      .catch((e) => {
        if (!cancelled) { setUsages([]); setUsageError(e.message || '용례 로드 실패'); }
      })
      .finally(() => { if (!cancelled) setUsageLoading(false); });
    return () => { cancelled = true; };
  }, [tab, entry?.s, bookId, usages]);

  useEffect(() => {
    setTab('def');
    setUsages(null);
    setUsageError('');
    setResearchActive(false);
  }, [entry?.s]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !researchActive) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, researchActive]);

  const dragState = useRef(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => { setDragOffset({ x: 0, y: 0 }); }, [entry?.s]);

  const onDragStart = (e) => {
    if (isMobile || researchActive) return;
    if (e.button !== 0) return;
    e.preventDefault();
    dragState.current = { startMouseX: e.clientX, startMouseY: e.clientY, startX: dragOffset.x, startY: dragOffset.y };
    const onMove = (ev) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startMouseX;
      const dy = ev.clientY - dragState.current.startMouseY;
      setDragOffset({ x: dragState.current.startX + dx, y: dragState.current.startY + dy });
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (!entry) return null;

  const isHebrew = entry.s?.startsWith('H');
  const morphHuman = humanizeMorph(entry.m);
  // lex 데이터의 Strong 은 0 패딩(예: "H0776")인데 KOREAN_GLOSS 키는 비패딩("H776").
  // 선행 0 을 제거해 정규화한 뒤 조회한다(패딩·비패딩 모두 매칭).
  const glossKey = entry.s ? entry.s.replace(/^([HG])0+(?=\d)/, '$1') : null;
  const koreanGloss = (glossKey && KOREAN_GLOSS[glossKey]) || (entry.s && KOREAN_GLOSS[entry.s]) || null;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const width = isMobile ? vw : 380;
  const maxHeight = isMobile ? Math.round(vh * 0.85) : Math.min(600, vh - 40);
  const margin = 12;
  const baseLeft = isMobile ? 0 : Math.max(margin, Math.min((anchor?.x ?? vw / 2) - width / 2, vw - width - margin));
  const baseTop  = isMobile ? (vh - maxHeight) : Math.max(margin, Math.min((anchor?.y ?? vh / 2) + 8, vh - maxHeight - margin));
  const left = isMobile ? 0 : baseLeft + dragOffset.x;
  const top  = isMobile ? baseTop : baseTop + dragOffset.y;
  const resolvedZIndex = researchActive ? Math.min(zIndex ?? 2501, 1200) : (zIndex ?? 2501);

  return createPortal(
    <>
      {isMobile && (
        <div onClick={researchActive ? undefined : onClose} style={{ position:'fixed',inset:0,
          background:'rgba(15,23,42,.4)',zIndex:resolvedZIndex - 1,
          pointerEvents: researchActive ? 'none' : 'auto' }} />
      )}
      <div
        role="dialog"
        aria-modal={isMobile ? 'true' : 'false'}
        aria-label={`원어 사전 · ${entry.w || entry.tr || entry.s || ''}`}
        aria-hidden={researchActive ? 'true' : undefined}
        className={isMobile ? 'momentum-scroll' : undefined}
        style={{
          position: 'fixed',
          left, top, width, maxHeight,
          zIndex: resolvedZIndex,
          background: '#fff',
          borderRadius: isMobile ? '16px 16px 0 0' : 10,
          boxShadow: isMobile ? '0 -8px 32px rgba(15,23,42,.24)' : '0 12px 40px rgba(0,0,0,0.25)',
          border: isMobile ? 'none' : '1px solid #e2e8f0',
          overflow: 'hidden',
          fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
          display: 'flex', flexDirection: 'column',
          paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : 0,
          pointerEvents: researchActive ? 'none' : 'auto',
          opacity: researchActive ? 0.72 : 1,
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
          transition: 'opacity .16s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          onMouseDown={onDragStart}
          style={{
            padding: '12px 14px', background: isHebrew ? '#fef3c7' : '#dbeafe',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
            cursor: isMobile ? 'default' : 'grab',
            userSelect: 'none',
          }}
        >
          <div>
            <div style={{
              fontSize: 22, fontWeight: 700,
              fontFamily: isHebrew ? '"SBL BibLit", "Ezra SIL", serif' : '"Gentium Plus", Cardo, serif',
              color: '#1e293b',
              direction: isHebrew ? 'rtl' : 'ltr',
              lineHeight: 1.4,
            }}>
              {entry.w}
            </div>
            {entry.tr && (
              <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>
                {entry.tr}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: 'none', border: 'none', fontSize: isMobile ? 22 : 18,
              cursor: 'pointer', color: '#64748b', padding: 0, lineHeight: 1,
              flexShrink: 0, minWidth: isMobile ? 44 : undefined, minHeight: isMobile ? 44 : undefined,
            }}
            title="닫기 (Esc)"
          >✕</button>
        </div>

        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
          {entry.s && (
            <MetaRow label="Strong's">
              <a
                href={`https://biblehub.com/${isHebrew ? 'hebrew' : 'greek'}/${entry.s.replace(/^[GH]/, '')}.htm`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#3b82f6', fontFamily: 'monospace', fontWeight: 600, textDecoration: 'none' }}
              >
                {entry.s} ↗
              </a>
            </MetaRow>
          )}
          {entry.l && (
            <MetaRow label="사전형">
              <span style={{
                fontSize: 14, color: '#1e293b',
                fontFamily: isHebrew ? '"SBL BibLit", serif' : '"Gentium Plus", Cardo, serif',
              }}>{entry.l}</span>
            </MetaRow>
          )}
          {morphHuman && (
            <MetaRow label="형태소">
              <span style={{ color: '#475569' }}>{morphHuman}</span>
              <span style={{ color: '#94a3b8', marginLeft: 6, fontFamily: 'monospace', fontSize: 10 }}>({entry.m})</span>
            </MetaRow>
          )}
          {koreanGloss && (
            <MetaRow label="한글 뜻">
              <span style={{ color: '#1e293b', fontWeight: 600 }}>{koreanGloss.glossKo}</span>
            </MetaRow>
          )}
          {entry.g && (
            <MetaRow label="기본뜻">
              <span style={{ color: '#1e293b', fontWeight: 500 }}>{entry.g}</span>
            </MetaRow>
          )}
        </div>

        <div style={{
          display: 'flex', borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
        }}>
          {[
            { key: 'def', label: '📖 사전 정의' },
            { key: 'usage', label: `🔍 용례${bookId ? '' : ' (책 미선택)'}` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: '7px 0', border: 'none', fontSize: 11, fontWeight: 600,
                cursor: 'pointer',
                background: tab === key ? '#fff' : 'transparent',
                color: tab === key ? (isHebrew ? '#92400e' : '#1d4ed8') : '#64748b',
                borderBottom: tab === key ? `2px solid ${isHebrew ? '#f59e0b' : '#3b82f6'}` : '2px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {tab === 'def' && (
            <div style={{ padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5 }}>
                  {isHebrew ? 'HEBREW LEXICON' : 'GREEK LEXICON'}
                </span>
                {definition?.source && (
                  <span style={{
                    fontSize: 9, borderRadius: 3, padding: '1px 5px', fontWeight: 600,
                    color: definition.source === 'bdbt' ? '#92400e' : definition.source === 'local' ? '#065f46' : '#1e40af',
                    background: definition.source === 'bdbt' ? '#fef3c7' : definition.source === 'local' ? '#d1fae5' : '#dbeafe',
                  }}>
                    {definition.source === 'bdbt' ? 'BDB' : definition.source === 'local' ? "Strong's" : 'BibleHub'}
                  </span>
                )}
              </div>

              {defLoading && <div style={{ color: '#94a3b8', fontSize: 12 }}>불러오는 중…</div>}
              {defError && <div style={{ color: '#ef4444', fontSize: 12 }}>⚠️ {defError}</div>}
              {!defLoading && !defError && !definition && (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  정의를 찾을 수 없습니다.{' '}
                  {entry.s && (
                    <a
                      href={`https://biblehub.com/${isHebrew ? 'hebrew' : 'greek'}/${entry.s.replace(/^[GH]/, '')}.htm`}
                      target="_blank" rel="noreferrer"
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                    >BibleHub에서 보기 ↗</a>
                  )}
                </div>
              )}
              {definition && (
                <>
                  <div
                    className="lex-def"
                    dangerouslySetInnerHTML={{ __html: linkifyDefinition(definition.definition || '', isHebrew) }}
                  />
                  {entry.s && (
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                      <a
                        href={`https://biblehub.com/${isHebrew ? 'hebrew' : 'greek'}/${entry.s.replace(/^[GH]/, '')}.htm`}
                        target="_blank" rel="noreferrer"
                        style={{ color: '#94a3b8', fontSize: 10, textDecoration: 'none' }}
                      >
                        📖 BibleHub 전체 사전 ({entry.s}) ↗
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'usage' && (
            <div style={{ padding: 0 }}>
              {!bookId && (
                <div style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 12 }}>
                  구절 노드를 선택하면 해당 책에서의 용례를 볼 수 있습니다.
                </div>
              )}
              {usageLoading && <div style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 12 }}>🔍 용례 검색 중…</div>}
              {usageError && <div style={{ padding: '8px 14px', color: '#ef4444', fontSize: 12 }}>⚠️ {usageError}</div>}
              {!usageLoading && Array.isArray(usages) && usages.length === 0 && !usageError && (
                <div style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 12 }}>
                  이 책에서 용례를 찾지 못했습니다.
                </div>
              )}
              {Array.isArray(usages) && usages.length > 0 && (
                <>
                  <div style={{
                    padding: '6px 14px', background: '#f8fafc',
                    fontSize: 10, color: '#64748b', fontWeight: 700,
                    borderBottom: '1px solid #f1f5f9',
                  }}>
                    {getBook(bookId)?.ko} · 총 {usages.length}회 사용
                  </div>
                  {usages.map((u, i) => (
                    <UsageRow
                      key={i}
                      entry={u}
                      bookId={bookId}
                      isHebrew={isHebrew}
                      onAdd={onAddVerse ? () => onAddVerse({ bookId, chapter: u.ch, verseStart: u.v, verseEnd: u.v }, null) : null}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <OriginalLanguageResearchActions
          entry={entry}
          anchor={anchor}
          passage={passage}
          isHebrew={isHebrew}
          onActiveChange={setResearchActive}
        />

        <div style={{
          padding: '6px 14px', borderTop: '1px solid #e2e8f0',
          fontSize: 9, color: '#94a3b8', background: '#f8fafc',
        }}>
          데이터: STEPBible.data (CC BY 4.0) · 사전: Bolls.life / BibleHub
        </div>
      </div>
    </>,
    document.body
  );
}

function MetaRow({ label, children }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 3, alignItems: 'baseline' }}>
      <span style={{ color: '#94a3b8', fontSize: 10, minWidth: 46, fontWeight: 600 }}>{label}</span>
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}

function UsageRow({ entry, bookId, isHebrew, onAdd }) {
  const koName = getBook(bookId)?.ko || bookId;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px',
      borderBottom: '1px solid #f1f5f9',
      fontSize: 11,
    }}>
      <span
        onClick={onAdd || undefined}
        title={onAdd ? `${koName} ${entry.ch}:${entry.v} 캔버스에 추가` : undefined}
        style={{
          minWidth: 80, fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
          color: onAdd ? '#3b82f6' : '#64748b',
          background: onAdd ? '#eff6ff' : '#f1f5f9',
          borderRadius: 3, padding: '2px 5px', textAlign: 'center', flexShrink: 0,
          cursor: onAdd ? 'pointer' : 'default',
          border: onAdd ? '1px solid #bfdbfe' : '1px solid transparent',
          whiteSpace: 'nowrap',
        }}
      >
        {koName} {entry.ch}:{entry.v}
      </span>
      <span style={{
        flex: 1, minWidth: 0,
        fontFamily: isHebrew ? '"SBL BibLit", "Ezra SIL", serif' : '"Gentium Plus", Cardo, serif',
        fontSize: 13, color: '#1e293b', direction: isHebrew ? 'rtl' : 'ltr',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {entry.w}
      </span>
      {entry.m && (
        <span style={{
          fontSize: 9, color: '#94a3b8', fontFamily: 'monospace',
          background: '#f8fafc', borderRadius: 3, padding: '1px 3px',
          flexShrink: 0,
        }}>
          {entry.m}
        </span>
      )}
      {onAdd && (
        <button
          onClick={onAdd}
          title="이 구절을 캔버스에 추가"
          style={{
            padding: '2px 6px', fontSize: 10, fontWeight: 700,
            background: '#059669', color: '#fff', border: 'none',
            borderRadius: 3, cursor: 'pointer', flexShrink: 0,
          }}
        >+</button>
      )}
    </div>
  );
}

// linkifyDefinition is now exported from ../utils/lexicon