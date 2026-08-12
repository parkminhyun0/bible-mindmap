import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import useMobile from '../hooks/useMobile';
import useModalDialog from '../hooks/useModalDialog';
import { fetchStrongDefinition } from '../utils/lexicon';
import {
  LEXICAL_BRIDGE_PILOT,
  getLexicalBridgeByStrong,
  searchLexicalBridges,
} from '../data/lexicalBridgePilot';

const DIALOG_SELECTOR = '[role="dialog"][aria-label="원어 브릿지"]';

const GRADE_COLORS = {
  A: '#2563eb',
  B: '#7c3aed',
  C: '#059669',
  D: '#d97706',
  E: '#dc2626',
};

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function LexicalBridgeModal({ initialStrong = 'H5162', onClose }) {
  const isMobile = useMobile();
  const initialBridge = getLexicalBridgeByStrong(initialStrong) || LEXICAL_BRIDGE_PILOT[0];
  const [query, setQuery] = useState(initialBridge?.strong || '');
  const [selectedId, setSelectedId] = useState(initialBridge?.id || null);
  const [definition, setDefinition] = useState(null);
  const [definitionLoading, setDefinitionLoading] = useState(false);

  const matches = useMemo(() => searchLexicalBridges(query), [query]);
  const selected = LEXICAL_BRIDGE_PILOT.find((bridge) => bridge.id === selectedId)
    || matches[0]
    || initialBridge;

  useEffect(() => {
    if (!selected?.strong) return undefined;
    let cancelled = false;
    setDefinitionLoading(true);
    setDefinition(null);
    fetchStrongDefinition(selected.strong)
      .then((value) => { if (!cancelled) setDefinition(value); })
      .catch(() => { if (!cancelled) setDefinition(null); })
      .finally(() => { if (!cancelled) setDefinitionLoading(false); });
    return () => { cancelled = true; };
  }, [selected?.strong]);

  useModalDialog({
    dialogSelector: DIALOG_SELECTOR,
    onClose,
    lockScroll: isMobile,
    active: true,
  });

  const chooseBridge = (bridge) => {
    setSelectedId(bridge.id);
    setQuery(bridge.strong);
  };

  const width = isMobile ? '100%' : 'min(980px, calc(100vw - 48px))';
  const height = isMobile ? '100%' : 'min(760px, calc(100vh - 48px))';

  return createPortal(
    <div
      className="at-modal-backdrop"
      style={{
        position: 'fixed', inset: 0, zIndex: 1320,
        display: 'grid', placeItems: isMobile ? 'stretch' : 'center',
        background: 'rgba(15,23,42,.48)',
        padding: isMobile ? 0 : 24,
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="원어 브릿지"
        style={{
          width, height,
          maxWidth: '100%', maxHeight: '100%',
          background: 'var(--at-surface, #fff)',
          color: 'var(--at-label, #0f172a)',
          borderRadius: isMobile ? 0 : 18,
          boxShadow: isMobile ? 'none' : '0 24px 70px rgba(15,23,42,.28)',
          border: isMobile ? 'none' : '1px solid var(--at-separator, #e2e8f0)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
        }}
      >
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: isMobile ? '14px 14px 12px' : '16px 20px',
          borderBottom: '1px solid var(--at-separator, #e2e8f0)',
          background: 'linear-gradient(135deg, rgba(14,116,144,.10), rgba(124,58,237,.08))',
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 17 : 19, fontWeight: 850, letterSpacing: '-.02em' }}>
              🧬 원어 브릿지 <span style={{ fontSize: 11, color: '#7c3aed', verticalAlign: 'middle' }}>PILOT-01</span>
            </div>
            <div style={{ marginTop: 3, fontSize: 11, color: 'var(--at-label-2, #64748b)' }}>
              MT 히브리어 · LXX 번역어 · NT 헬라어 관계를 Evidence 등급으로 탐색합니다.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="원어 브릿지 닫기"
            style={{
              width: 44, height: 44, flexShrink: 0,
              border: '1px solid var(--at-separator, #cbd5e1)', borderRadius: 12,
              background: 'var(--at-surface, #fff)', color: 'var(--at-label-2, #475569)',
              fontSize: 20, cursor: 'pointer', touchAction: 'manipulation',
            }}
          >✕</button>
        </header>

        <div
          data-modal-scroll-region="true"
          style={{
            minHeight: 0, flex: 1, overflowY: 'auto', overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch', touchAction: 'pan-y',
            padding: isMobile ? 14 : 20,
          }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(230px, 280px) minmax(0, 1fr)',
            gap: 16,
          }}>
            <aside style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--at-label-2, #64748b)', marginBottom: 6 }}>
                원어·Strong·구절 검색
              </div>
              <input
                aria-label="원어 브릿지 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="H5162 · נחם · 위로 · 룻기 2:13"
                style={{
                  width: '100%', minHeight: 44, boxSizing: 'border-box',
                  border: '1px solid var(--at-separator-hard, #cbd5e1)', borderRadius: 10,
                  padding: '10px 12px', background: 'var(--at-surface, #fff)',
                  color: 'var(--at-label, #0f172a)', fontSize: 13, outline: 'none',
                }}
              />

              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {matches.map((bridge) => (
                  <button
                    key={bridge.id}
                    type="button"
                    onClick={() => chooseBridge(bridge)}
                    aria-pressed={selected?.id === bridge.id}
                    style={{
                      minHeight: 58, padding: '10px 11px', textAlign: 'left', cursor: 'pointer',
                      borderRadius: 10, border: selected?.id === bridge.id ? '1.5px solid #0e7490' : '1px solid var(--at-separator, #e2e8f0)',
                      background: selected?.id === bridge.id ? 'rgba(14,116,144,.08)' : 'var(--at-surface, #fff)',
                      color: 'var(--at-label, #0f172a)', touchAction: 'manipulation',
                    }}
                  >
                    <div style={{ fontWeight: 850, fontSize: 13 }}>
                      {bridge.hebrew.lemma} · {bridge.hebrew.transliterationKo}
                    </div>
                    <div style={{ marginTop: 3, fontSize: 10.5, color: 'var(--at-label-2, #64748b)' }}>
                      {bridge.strong} · {bridge.sourceRefKo} · {bridge.labelKo}
                    </div>
                  </button>
                ))}
                {matches.length === 0 && (
                  <div style={{ padding: 12, borderRadius: 10, background: 'var(--at-surface-2, #f8fafc)', fontSize: 12, color: '#64748b' }}>
                    현재 Pilot에 등록된 브릿지를 찾지 못했습니다.
                  </div>
                )}
              </div>

              <div style={{
                marginTop: 14, padding: 12, borderRadius: 10,
                background: 'var(--at-surface-2, #f8fafc)', border: '1px solid var(--at-separator, #e2e8f0)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 850, color: '#64748b' }}>기존 원어 사전 재사용</div>
                <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.55, color: 'var(--at-label-2, #475569)' }}>
                  {definitionLoading && 'Strong 사전 데이터를 불러오는 중…'}
                  {!definitionLoading && definition && (
                    <>
                      <b>{selected?.strong}</b> · {definition.source === 'bdbt' ? 'BDB' : definition.source === 'local' ? "Strong's" : (definition.source || 'Lexicon')}
                      <div style={{ marginTop: 4 }}>
                        {stripHtml(definition.definition).slice(0, 220) || '정의 데이터가 있습니다.'}
                      </div>
                    </>
                  )}
                  {!definitionLoading && !definition && '기존 Strong 사전 데이터와 동일 ID를 사용합니다.'}
                </div>
              </div>
            </aside>

            {selected && (
              <main style={{ minWidth: 0 }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
                  gap: 10,
                }}>
                  <BridgeCard
                    accent="#2563eb"
                    kicker="MT 히브리어"
                    word={selected.hebrew.surface}
                    lemma={selected.hebrew.lemma}
                    meta={`${selected.hebrew.transliterationKo} · ${selected.hebrew.glossKo}`}
                    rtl
                  />
                  <BridgeCard
                    accent="#7c3aed"
                    kicker="LXX 번역"
                    word={selected.lxx.phrase}
                    lemma={selected.lxx.lemma}
                    meta={`${selected.lxx.transliterationKo} · ${selected.lxx.glossKo}`}
                  />
                  <BridgeCard
                    accent="#059669"
                    kicker="NT 어휘 family"
                    word={selected.nt.lexicalFamily.join(' · ')}
                    lemma={selected.nt.sameLemma.join(' · ')}
                    meta="동일 lemma와 동계어를 구분해 표시"
                  />
                </div>

                <section style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 850, marginBottom: 8 }}>
                    Evidence 등급
                  </div>
                  <div style={{ display: 'grid', gap: 7 }}>
                    {selected.evidence.map((item) => (
                      <div key={item.grade} style={{
                        display: 'grid', gridTemplateColumns: '36px minmax(0,1fr)', gap: 9, alignItems: 'start',
                        padding: '9px 10px', borderRadius: 10,
                        border: '1px solid var(--at-separator, #e2e8f0)',
                        background: item.state === 'verified' ? 'rgba(16,185,129,.045)' : 'var(--at-surface-2, #f8fafc)',
                      }}>
                        <span style={{
                          width: 32, height: 32, display: 'grid', placeItems: 'center',
                          borderRadius: 999, background: GRADE_COLORS[item.grade], color: '#fff',
                          fontSize: 13, fontWeight: 900,
                        }}>{item.grade}</span>
                        <div>
                          <div style={{ fontSize: 11.5, fontWeight: 850 }}>
                            {item.label}
                            <span style={{ marginLeft: 6, fontSize: 9.5, color: item.state === 'verified' ? '#047857' : item.state === 'candidate' ? '#b91c1c' : '#92400e' }}>
                              {item.state === 'verified' ? 'VERIFIED' : item.state === 'candidate' ? 'CANDIDATE' : 'UNRESOLVED'}
                            </span>
                          </div>
                          <div style={{ marginTop: 3, fontSize: 11, lineHeight: 1.5, color: 'var(--at-label-2, #64748b)' }}>
                            {item.note}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 850, marginBottom: 8 }}>대표 신약 본문</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                    {selected.nt.representativeRefs.map((item) => (
                      <div key={item.ref} style={{
                        padding: 11, borderRadius: 10, border: '1px solid var(--at-separator, #e2e8f0)',
                        background: 'var(--at-surface, #fff)',
                      }}>
                        <div style={{ fontSize: 11.5, fontWeight: 850 }}>{item.refKo} · {item.lemma}</div>
                        <div style={{ marginTop: 4, fontSize: 10.5, lineHeight: 1.55, color: 'var(--at-label-2, #64748b)' }}>{item.noteKo}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <div style={{
                  marginTop: 14, padding: 12, borderRadius: 10,
                  border: '1px solid #fecaca', background: '#fff1f2', color: '#9f1239',
                  fontSize: 11, lineHeight: 1.6, fontWeight: 650,
                }}>
                  <b>해석 주의</b><br />{selected.cautionKo}
                </div>
              </main>
            )}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function BridgeCard({ accent, kicker, word, lemma, meta, rtl = false }) {
  return (
    <section style={{
      minWidth: 0, borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${accent}33`, background: 'var(--at-surface, #fff)',
    }}>
      <div style={{ padding: '7px 10px', background: accent, color: '#fff', fontSize: 10.5, fontWeight: 850 }}>
        {kicker}
      </div>
      <div style={{ padding: 11 }}>
        <div dir={rtl ? 'rtl' : 'ltr'} style={{
          fontSize: 18, lineHeight: 1.45, fontWeight: 750, color: 'var(--at-label, #0f172a)',
          fontFamily: rtl ? '"SBL BibLit","Ezra SIL",serif' : '"Gentium Plus",Cardo,serif',
          overflowWrap: 'anywhere',
        }}>{word}</div>
        <div dir={rtl ? 'rtl' : 'ltr'} style={{ marginTop: 6, fontSize: 12.5, fontWeight: 750 }}>{lemma}</div>
        <div style={{ marginTop: 5, fontSize: 10.5, lineHeight: 1.45, color: 'var(--at-label-2, #64748b)' }}>{meta}</div>
      </div>
    </section>
  );
}
