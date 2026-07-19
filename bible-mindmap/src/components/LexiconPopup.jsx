import { useEffect, useState } from 'react';
import { fetchStrongDefinition, humanizeMorph } from '../utils/lexicon';

/**
 * 원어 단어 어형 분석 카드.
 * Props:
 *   entry  = { w, tr, s, m, l, g }  (word / transliteration / strong / morph / lemma / gloss)
 *   anchor = { x, y }               팝업이 등장할 화면 좌표
 *   onClose
 */
export default function LexiconPopup({ entry, anchor, onClose }) {
  const [definition, setDefinition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!entry?.s) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDefinition(null);
    fetchStrongDefinition(entry.s)
      .then((d) => { if (!cancelled) setDefinition(d); })
      .catch((e) => { if (!cancelled) setError(e.message || '조회 실패'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [entry?.s]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!entry) return null;

  const isHebrew = entry.s?.startsWith('H');
  const morphHuman = humanizeMorph(entry.m);

  // 위치 계산: viewport 경계 벗어나지 않도록 클램프
  const width = 360;
  const maxHeight = 420;
  const margin = 12;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const left = Math.max(margin, Math.min((anchor?.x ?? vw / 2) - width / 2, vw - width - margin));
  const top = Math.max(margin, Math.min((anchor?.y ?? vh / 2) + 20, vh - maxHeight - margin));

  return (
    <>
      {/* backdrop for click-outside close */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 2500,
          background: 'transparent',
        }}
      />
      <div
        style={{
          position: 'fixed',
          left, top, width, maxHeight,
          zIndex: 2501,
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
          display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더: 원어 단어 크게 */}
        <div style={{
          padding: '12px 14px', background: isHebrew ? '#fef3c7' : '#dbeafe',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
        }}>
          <div>
            <div style={{
              fontSize: 22, fontWeight: 700,
              fontFamily: isHebrew ? 'SBL BibLit, "Ezra SIL", serif' : 'SBL Greek, Cardo, serif',
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
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b', padding: 0, lineHeight: 1 }}
            title="닫기 (Esc)"
          >✕</button>
        </div>

        {/* 메타 정보 (Strong's, 형태소, lemma) */}
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
                fontFamily: isHebrew ? 'SBL BibLit, serif' : 'SBL Greek, Cardo, serif',
              }}>{entry.l}</span>
            </MetaRow>
          )}
          {morphHuman && (
            <MetaRow label="형태소">
              <span style={{ color: '#475569' }}>{morphHuman}</span>
              <span style={{ color: '#94a3b8', marginLeft: 6, fontFamily: 'monospace', fontSize: 10 }}>({entry.m})</span>
            </MetaRow>
          )}
          {entry.g && (
            <MetaRow label="기본뜻">
              <span style={{ color: '#1e293b', fontWeight: 500 }}>{entry.g}</span>
            </MetaRow>
          )}
        </div>

        {/* 사전 정의 (Bolls.life에서 로드) */}
        <div style={{ padding: '10px 14px', overflowY: 'auto', flex: 1 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>
            {isHebrew ? 'BDB 정의' : 'GREEK LEXICON'}
          </div>
          {loading && <div style={{ color: '#94a3b8', fontSize: 12 }}>불러오는 중…</div>}
          {error && <div style={{ color: '#ef4444', fontSize: 12 }}>⚠️ {error}</div>}
          {!loading && !error && !definition && (
            <div style={{ color: '#94a3b8', fontSize: 12 }}>사전 정의를 찾을 수 없습니다.</div>
          )}
          {definition && (
            <div
              style={{ fontSize: 12, lineHeight: 1.6, color: '#334155' }}
              dangerouslySetInnerHTML={{ __html: definition.definition || '' }}
            />
          )}
        </div>

        {/* footer */}
        <div style={{
          padding: '6px 14px', borderTop: '1px solid #e2e8f0',
          fontSize: 9, color: '#94a3b8', background: '#f8fafc',
        }}>
          데이터: STEPBible.data (CC BY 4.0) · 사전: Bolls.life
        </div>
      </div>
    </>
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
