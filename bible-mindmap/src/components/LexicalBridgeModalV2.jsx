import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useMobile from '../hooks/useMobile';
import useModalDialog from '../hooks/useModalDialog';
import { fetchStrongDefinition } from '../utils/lexicon';
import {
  LEXICAL_BRIDGE_PILOT,
  getLexicalBridgeByStrong,
  searchLexicalBridges,
} from '../data/lexicalBridgePilot';

const GRADE_COLORS = {
  A: '#2563eb', B: '#7c3aed', C: '#059669', D: '#d97706', E: '#dc2626',
};

const STATUS_META = {
  verified: { label: '확인', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  unresolved: { label: '미확정', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  candidate: { label: '해석 후보', color: '#b91c1c', bg: '#fff1f2', border: '#fecdd3' },
};

const MAXIMIZED_STYLE = {
  position: 'fixed', left: 10, top: 10, right: 10, bottom: 10,
  width: 'auto', height: 'auto', maxWidth: 'none', maxHeight: 'none', borderRadius: 16,
};

const popupIconBtn = {
  background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 6,
  color: '#fff', fontSize: 11, fontWeight: 700, minWidth: 28, height: 26,
  padding: '0 6px', cursor: 'pointer', display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

const panelStyle = {
  padding: 13, borderRadius: 11, border: '1px solid #e2e8f0',
  background: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,.025)',
};

const eyebrowStyle = {
  fontSize: 10.5, fontWeight: 900, letterSpacing: '.06em', color: '#92400e',
};

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function FlowStep({ number, title, accent, word, lemma, meta, note, rtl = false }) {
  return (
    <article style={{ minWidth: 0, borderRadius: 11, border: `1px solid ${accent}33`, background: '#fff', overflow: 'hidden' }}>
      <div style={{ minHeight: 34, display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: `${accent}12`, borderBottom: `1px solid ${accent}22` }}>
        <span style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 999, background: accent, color: '#fff', fontSize: 11, fontWeight: 900 }}>{number}</span>
        <span style={{ fontSize: 11.5, fontWeight: 900, color: '#334155' }}>{title}</span>
      </div>
      <div style={{ padding: '12px 11px' }}>
        <div dir={rtl ? 'rtl' : 'ltr'} style={{ fontSize: 21, lineHeight: 1.35, fontWeight: 800, color: '#0f172a', overflowWrap: 'anywhere' }}>{word}</div>
        <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 850, color: accent, overflowWrap: 'anywhere' }}>{lemma}</div>
        <div style={{ marginTop: 4, fontSize: 11, color: '#475569', lineHeight: 1.55 }}>{meta}</div>
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e2e8f0', fontSize: 10.5, color: '#64748b', lineHeight: 1.55 }}>{note}</div>
      </div>
    </article>
  );
}

function FlowConnection({ compact, grade, title, note }) {
  return (
    <div style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: compact ? 9 : 5, padding: compact ? '2px 6px' : '5px 2px', minWidth: 0 }}>
      <span aria-hidden="true" style={{ fontSize: 18, color: '#94a3b8', transform: compact ? 'rotate(90deg)' : 'none', lineHeight: 1 }}>↓</span>
      <div style={{ textAlign: compact ? 'left' : 'center', minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 900, color: '#334155' }}>{grade}</div>
        <div style={{ marginTop: 2, fontSize: 10.5, fontWeight: 850, color: '#92400e' }}>{title}</div>
        <div style={{ marginTop: 2, fontSize: 9.5, lineHeight: 1.35, color: '#94a3b8' }}>{note}</div>
      </div>
    </div>
  );
}

function EvidenceBucket({ title, icon, color, bg, items }) {
  return (
    <div style={{ border: `1px solid ${color}22`, background: bg, borderRadius: 10, padding: 11, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color, fontSize: 11.5, fontWeight: 900 }}><span>{icon}</span><span>{title}</span></div>
      <div style={{ marginTop: 7, display: 'grid', gap: 5 }}>
        {items.length ? items.map((item) => (
          <div key={item.grade} style={{ fontSize: 10.5, lineHeight: 1.5, color: '#475569' }}>
            <b style={{ color }}>{item.grade}</b> · {item.label}
          </div>
        )) : <div style={{ fontSize: 10.5, color: '#94a3b8' }}>해당 없음</div>}
      </div>
    </div>
  );
}

function EvidenceRow({ item }) {
  const meta = STATUS_META[item.state] || STATUS_META.unresolved;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,1fr) auto', gap: 8, alignItems: 'start', padding: 9, borderRadius: 8, border: `1px solid ${meta.border}`, background: meta.bg }}>
      <span style={{ width: 26, height: 26, display: 'grid', placeItems: 'center', borderRadius: 999, background: GRADE_COLORS[item.grade], color: '#fff', fontSize: 11, fontWeight: 900 }}>{item.grade}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 850, color: '#334155' }}>{item.label}</div>
        <div style={{ marginTop: 3, fontSize: 10.5, lineHeight: 1.55, color: '#64748b' }}>{item.note}</div>
      </div>
      <span style={{ fontSize: 9.5, fontWeight: 850, color: meta.color, whiteSpace: 'nowrap' }}>{meta.label}</span>
    </div>
  );
}

export default function LexicalBridgeModalV2({ initialStrong = 'H5162', onClose }) {
  const isMobile = useMobile();
  const dialogRef = useRef(null);
  const initialBridge = getLexicalBridgeByStrong(initialStrong) || LEXICAL_BRIDGE_PILOT[0];
  const [query, setQuery] = useState(initialBridge?.strong || '');
  const [selectedId, setSelectedId] = useState(initialBridge?.id || null);
  const [definition, setDefinition] = useState(null);
  const [definitionLoading, setDefinitionLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);

  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return { x: 40, y: 40 };
    const w = Math.min(1040, window.innerWidth - 40);
    return { x: Math.max(20, (window.innerWidth - w) / 2), y: 48 };
  });
  const [size, setSize] = useState(() => {
    if (typeof window === 'undefined') return { w: 1040, h: 640 };
    return { w: Math.min(1040, window.innerWidth - 40), h: Math.min(720, window.innerHeight - 96) };
  });

  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0 });

  const matches = useMemo(() => searchLexicalBridges(query), [query]);
  const selected = useMemo(() => {
    const exact = matches.find((bridge) => bridge.id === selectedId);
    if (exact) return exact;
    if (matches[0]) return matches[0];
    return query.trim() ? null : initialBridge;
  }, [initialBridge, matches, query, selectedId]);

  useEffect(() => {
    if (!selected?.strong) {
      setDefinition(null);
      setDefinitionLoading(false);
      return undefined;
    }
    let cancelled = false;
    setDefinitionLoading(true);
    setDefinition(null);
    fetchStrongDefinition(selected.strong)
      .then((value) => { if (!cancelled) setDefinition(value); })
      .catch(() => { if (!cancelled) setDefinition(null); })
      .finally(() => { if (!cancelled) setDefinitionLoading(false); });
    return () => { cancelled = true; };
  }, [selected?.strong]);

  useModalDialog({ dialogRef, onClose, lockScroll: isMobile });

  const chooseBridge = useCallback((bridge) => {
    setSelectedId(bridge.id);
    setQuery(bridge.strong);
  }, []);

  const onHeaderMouseDown = useCallback((event) => {
    if (isMobile || event.button !== 0) return;
    if (event.target.closest('button, input')) return;
    dragging.current = true;
    dragStart.current = { mx: event.clientX, my: event.clientY, px: pos.x, py: pos.y };
    event.preventDefault();
  }, [isMobile, pos]);

  const onResizeMouseDown = useCallback((event) => {
    if (isMobile || event.button !== 0) return;
    resizing.current = true;
    resizeStart.current = { mx: event.clientX, my: event.clientY, w: size.w, h: size.h };
    event.preventDefault();
    event.stopPropagation();
  }, [isMobile, size]);

  useEffect(() => {
    if (isMobile) return undefined;
    const onMove = (event) => {
      if (dragging.current) {
        const dx = event.clientX - dragStart.current.mx;
        const dy = event.clientY - dragStart.current.my;
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - 200, dragStart.current.px + dx)),
          y: Math.max(0, Math.min(window.innerHeight - 60, dragStart.current.py + dy)),
        });
      }
      if (resizing.current) {
        const dw = event.clientX - resizeStart.current.mx;
        const dh = event.clientY - resizeStart.current.my;
        setSize({
          w: Math.max(560, Math.min(window.innerWidth - 40, resizeStart.current.w + dw)),
          h: Math.max(320, Math.min(window.innerHeight - 40, resizeStart.current.h + dh)),
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

  const narrowDesktop = !isMobile && !maximized && size.w < 760;
  const flowVertical = isMobile || narrowDesktop;

  const modalInner = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="원어 브릿지"
      tabIndex={-1}
      className={`at-modal at-modal--context at-modal--lexical-bridge${isMobile ? ' at-modal--mobile h-screen-safe' : ''}`}
      style={{
        background: '#fff', borderRadius: isMobile ? 0 : 12,
        border: isMobile ? 'none' : '1px solid rgba(15,23,42,.1)',
        width: isMobile ? '100%' : size.w, maxWidth: isMobile ? '100%' : 'none',
        height: isMobile ? '100%' : (minimized ? 'auto' : size.h),
        maxHeight: isMobile ? '100%' : undefined, minHeight: isMobile ? 0 : undefined,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: isMobile ? 'none' : '0 20px 60px rgba(15,23,42,.28), 0 4px 16px rgba(15,23,42,.14)',
        position: 'relative', color: '#0f172a',
        fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
        userSelect: dragging.current ? 'none' : 'auto',
        ...(!isMobile && maximized ? MAXIMIZED_STYLE : {}),
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="at-modal__titlebar"
        onMouseDown={onHeaderMouseDown}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile
            ? 'calc(env(safe-area-inset-top, 0px) + 10px) calc(env(safe-area-inset-right, 0px) + 14px) 10px calc(env(safe-area-inset-left, 0px) + 14px)'
            : '9px 12px 9px 16px',
          borderBottom: isMobile ? '1px solid rgba(15,23,42,.08)' : '1px solid rgba(255,255,255,.15)',
          flexShrink: 0, gap: 8,
          background: isMobile ? '#fff' : 'linear-gradient(135deg, #b45309, #d97706)',
          borderRadius: isMobile ? 0 : (minimized ? 12 : '12px 12px 0 0'),
          cursor: isMobile ? 'default' : 'grab', userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, minWidth: 0, flex: 1 }}>
          <span aria-hidden="true" style={{ fontSize: isMobile ? 18 : 20, flexShrink: 0 }}>🧬</span>
          <span style={{ fontSize: isMobile ? 16 : 17, fontWeight: 800, color: isMobile ? '#0f172a' : '#fff', flexShrink: 0 }}>원어 브릿지</span>
          <span style={{
            fontSize: isMobile ? 8 : 11, fontWeight: 800,
            color: isMobile ? '#b45309' : '#fbbf24',
            background: isMobile ? 'rgba(251,191,36,.18)' : 'rgba(0,0,0,.32)',
            border: `1px solid ${isMobile ? 'rgba(217,119,6,.35)' : 'rgba(251,191,36,.45)'}`,
            borderRadius: 5, padding: isMobile ? '2px 5px' : '3px 8px',
            letterSpacing: '.06em', flexShrink: 0, fontFamily: "'Menlo','Monaco',monospace",
          }}>PILOT 0.3</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {!isMobile && (
            <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => setMinimized((v) => !v)} title={minimized ? '펼치기' : '최소화'} style={popupIconBtn}>{minimized ? '▲' : '▼'}</button>
          )}
          {!isMobile && (
            <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => { setMaximized((v) => !v); setMinimized(false); }} title={maximized ? '창 모드' : '전체화면'} aria-label={maximized ? '창 모드' : '전체화면'} style={popupIconBtn}>{maximized ? '❐' : '⛶'}</button>
          )}
          <button
            type="button" onMouseDown={(e) => e.stopPropagation()} onClick={onClose}
            title="닫기" aria-label="원어 브릿지 닫기"
            style={isMobile ? {
              background: 'none', border: 'none', color: '#94a3b8', fontSize: 22,
              cursor: 'pointer', padding: '4px 8px', borderRadius: 8,
              minWidth: 44, minHeight: 44, touchAction: 'manipulation',
            } : { ...popupIconBtn, background: 'rgba(239,68,68,.35)' }}
          >✕</button>
        </div>
      </div>

      {!minimized && (
        <div
          className="at-modal__content"
          data-modal-scroll-region="true"
          data-lexical-bridge-scroll="true"
          style={{
            minWidth: 0, minHeight: 0, flex: 1, overflowY: 'auto', overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', touchAction: 'pan-y',
            padding: isMobile
              ? '14px calc(env(safe-area-inset-right, 0px) + 14px) calc(env(safe-area-inset-bottom, 0px) + 22px) calc(env(safe-area-inset-left, 0px) + 14px)'
              : 18,
            background: '#f8fafc', boxSizing: 'border-box',
          }}
        >
          <div style={{
            display: 'grid', gridTemplateColumns: flowVertical ? '1fr' : '220px minmax(0,1fr)',
            gap: 14, alignItems: 'start', maxWidth: 1240, margin: '0 auto', minWidth: 0,
          }}>
            <aside style={{ minWidth: 0, display: 'grid', gap: 12 }}>
              <section style={panelStyle}>
                <div style={eyebrowStyle}>연구할 원어</div>
                <input
                  aria-label="원어 브릿지 검색" value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="H5162 · נחם · 위로 · 룻기 2:13"
                  style={{ width: '100%', minHeight: 44, boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 9, padding: '10px 11px', background: '#fff', color: '#0f172a', fontSize: isMobile ? 16 : 13, outline: 'none' }}
                />
                <div style={{ marginTop: 9, display: 'grid', gap: 7 }}>
                  {matches.map((bridge) => (
                    <button
                      key={bridge.id} type="button" onClick={() => chooseBridge(bridge)}
                      aria-pressed={selected?.id === bridge.id}
                      style={{ minHeight: 58, padding: '9px 10px', textAlign: 'left', cursor: 'pointer', borderRadius: 9, border: selected?.id === bridge.id ? '1.5px solid #b45309' : '1px solid #e2e8f0', background: selected?.id === bridge.id ? '#fffbeb' : '#fff', color: '#0f172a', touchAction: 'manipulation' }}
                    >
                      <div style={{ fontWeight: 850, fontSize: 13 }}>{bridge.hebrew.lemma} · {bridge.hebrew.transliterationKo}</div>
                      <div style={{ marginTop: 3, fontSize: 10.5, color: '#64748b' }}>{bridge.strong} · {bridge.sourceRefKo} · {bridge.labelKo}</div>
                    </button>
                  ))}
                  {matches.length === 0 && <div style={{ padding: 12, borderRadius: 9, background: '#f1f5f9', fontSize: 12, color: '#64748b' }}>현재 Pilot에 등록된 브릿지를 찾지 못했습니다.</div>}
                </div>
              </section>

              <section style={panelStyle}>
                <div style={eyebrowStyle}>기존 원어 사전 연결</div>
                <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.6, color: '#475569' }}>
                  {definitionLoading && 'Strong 사전 데이터를 불러오는 중…'}
                  {!definitionLoading && definition && (
                    <><b>{selected?.strong}</b> · {definition.source === 'bdbt' ? 'BDB' : definition.source === 'local' ? "Strong's" : (definition.source || 'Lexicon')}<div style={{ marginTop: 5 }}>{stripHtml(definition.definition).slice(0, 240) || '정의 데이터가 있습니다.'}</div></>
                  )}
                  {!definitionLoading && !definition && '기존 Strong/lemma ID를 그대로 재사용합니다.'}
                </div>
              </section>
            </aside>

            <main style={{ minWidth: 0, display: 'grid', gap: 13 }}>
              {!selected && <section style={{ ...panelStyle, padding: 22, textAlign: 'center', color: '#64748b' }}>검색 결과에서 연구할 원어를 선택하세요.</section>}
              {selected && <>
                <section style={{ ...panelStyle, borderColor: '#fde68a', background: 'linear-gradient(135deg,#fffbeb,#fff)' }}>
                  <div style={eyebrowStyle}>이 화면은 무엇을 보는가?</div>
                  <div style={{ marginTop: 5, fontSize: isMobile ? 17 : 19, lineHeight: 1.45, fontWeight: 900, letterSpacing: '-.025em' }}>
                    {selected.sourceRefKo}의 “{selected.labelKo}”가 히브리어 본문 → LXX 번역 → NT 어휘 관계로 어떻게 이어지는지 확인합니다.
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.6, color: '#64748b' }}>화살표는 “같은 뜻” 표시가 아니라 <b>관계의 종류</b>를 뜻합니다. 직접 번역, 동일 lemma, 동계어, 신학적 해석 후보를 구분해서 읽습니다.</div>
                </section>

                <section style={panelStyle}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <div><div style={eyebrowStyle}>연구 흐름 · 1 → 2 → 3</div><div style={{ marginTop: 3, fontSize: 13, fontWeight: 850 }}>원문 → 고대 번역 → 신약 어휘 관계</div></div>
                    <span style={{ fontSize: 10.5, color: '#64748b' }}>{selected.strong} · {selected.sourceRefKo}</span>
                  </div>
                  <div style={{
                    marginTop: 13, display: 'grid',
                    gridTemplateColumns: flowVertical ? '1fr' : 'minmax(0,1fr) 100px minmax(0,1fr) 100px minmax(0,1fr)',
                    gap: flowVertical ? 7 : 9, alignItems: 'stretch', minWidth: 0,
                  }}>
                    <FlowStep number="1" title="MT 원문에서 시작" accent="#2563eb" word={selected.hebrew.surface} lemma={selected.hebrew.lemma} meta={`${selected.hebrew.transliterationKo} · ${selected.hebrew.glossKo}`} note="히브리어 본문과 문맥이 연구의 출발점" rtl />
                    <FlowConnection compact={flowVertical} grade="A" title="LXX 실제 번역" note="같은 절의 번역 대응" />
                    <FlowStep number="2" title="LXX가 이렇게 옮김" accent="#7c3aed" word={selected.lxx.phrase} lemma={selected.lxx.lemma} meta={`${selected.lxx.transliterationKo} · ${selected.lxx.glossKo}`} note="LXX 번역어 자체를 먼저 확인" />
                    <FlowConnection compact={flowVertical} grade="B · C" title="NT 어휘 연결" note="동일 lemma와 동계어를 분리" />
                    <FlowStep number="3" title="NT에서 관계를 추적" accent="#059669" word={selected.nt.sameLemma.join(' · ')} lemma={selected.nt.lexicalFamily.join(' · ')} meta="위: 동일 lemma · 아래: 관련 어휘 family" note="같은 단어와 관련 단어를 동일시하지 않음" />
                  </div>
                </section>

                <section style={panelStyle}>
                  <div style={eyebrowStyle}>그래서 지금 무엇을 말할 수 있나?</div>
                  <div style={{ marginTop: 9, display: 'grid', gridTemplateColumns: flowVertical ? '1fr' : 'repeat(3,minmax(0,1fr))', gap: 8 }}>
                    <EvidenceBucket title="확인된 어휘 사실" icon="✓" color="#047857" bg="#ecfdf5" items={selected.evidence.filter((item) => item.state === 'verified')} />
                    <EvidenceBucket title="아직 확정하지 않음" icon="?" color="#92400e" bg="#fffbeb" items={selected.evidence.filter((item) => item.state === 'unresolved')} />
                    <EvidenceBucket title="정경·신학 해석 후보" icon="△" color="#b91c1c" bg="#fff1f2" items={selected.evidence.filter((item) => item.state === 'candidate')} />
                  </div>
                </section>

                <section style={panelStyle}>
                  <div style={eyebrowStyle}>NT 대표 본문</div>
                  <div style={{ marginTop: 9, display: 'grid', gridTemplateColumns: flowVertical ? '1fr' : 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                    {selected.nt.representativeRefs.map((item) => (
                      <article key={item.ref} style={{ padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}><span style={{ fontSize: 12, fontWeight: 900 }}>{item.refKo}</span><span style={{ fontSize: 11, fontWeight: 800, color: '#0f766e' }}>{item.lemma}</span></div>
                        <div style={{ marginTop: 5, fontSize: 11.5, lineHeight: 1.6, color: '#64748b' }}>{item.noteKo}</div>
                      </article>
                    ))}
                  </div>
                </section>

                <section style={{ padding: 13, borderRadius: 10, border: '1px solid #fecaca', background: '#fff1f2', color: '#9f1239', fontSize: 11.5, lineHeight: 1.65, fontWeight: 650 }}><b>해석 경계</b><br />{selected.cautionKo}</section>

                <details style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
                  <summary style={{ padding: '11px 13px', cursor: 'pointer', fontSize: 12, fontWeight: 850, color: '#475569' }}>Evidence A–E 세부 근거 보기</summary>
                  <div style={{ padding: '0 13px 13px', display: 'grid', gap: 7 }}>{selected.evidence.map((item) => <EvidenceRow key={item.grade} item={item} />)}</div>
                </details>
              </>}
            </main>
          </div>
        </div>
      )}

      {!isMobile && !minimized && !maximized && (
        <div
          data-lexical-bridge-resize="true" aria-hidden="true" onMouseDown={onResizeMouseDown} title="크기 조절"
          style={{ position: 'absolute', right: 0, bottom: 0, width: 18, height: 18, cursor: 'se-resize', borderRadius: '0 0 12px 0', background: 'linear-gradient(135deg, transparent 45%, #cbd5e1 45%, #94a3b8 100%)', zIndex: 20 }}
        />
      )}
    </div>
  );

  if (isMobile) {
    return createPortal(
      <div
        className="at-modal-backdrop"
        data-lexical-bridge-backdrop="true"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1320, background: '#fff', display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}
        onClick={onClose}
      >
        {modalInner}
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      data-lexical-bridge-window="true"
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 1320, fontFamily: "'Pretendard','Noto Sans KR',sans-serif" }}
    >
      {modalInner}
    </div>,
    document.body,
  );
}
