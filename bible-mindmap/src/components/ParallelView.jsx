import { useState, useMemo, useEffect } from 'react';
import useMobile from '../hooks/useMobile';
import { fetchVerse } from '../api/bibleApi';
import { isOT } from '../data/bibleBooks';
import { loadVerseLexicon } from '../utils/lexicon';
import { normalizeOriginal } from '../utils/normalizeOriginal';
import LexiconPopup from './LexiconPopup';
/**
 * 3단 병렬 뷰 모달 — 세 역본의 단어를 chip으로 표시하고
 * 클릭·연결·색칠로 대응 관계를 만든다.
 */

const COLUMNS = [
  { id: 'krv',      label: '개역한글', font: 'inherit' },
  { id: 'esv',      label: 'ESV',      font: 'Georgia, serif' },
  { id: 'original', label: '원어',      font: 'SBL BibLit, Cardo, serif' },
];

const PALETTE = [
  { color: '#ef4444', label: '빨강' },
  { color: '#f59e0b', label: '주황' },
  { color: '#10b981', label: '초록' },
  { color: '#3b82f6', label: '파랑' },
  { color: '#8b5cf6', label: '보라' },
  { color: '#0ea5e9', label: '하늘' },
  { color: '#ec4899', label: '분홍' },
  { color: '#64748b', label: '회색' },
];

const NEXT_ID = { current: 0 };
function newSyncId() {
  NEXT_ID.current += 1;
  return `sync-${Date.now().toString(36)}-${NEXT_ID.current}`;
}

const FONT_KEY = 'parallel-view-font-sizes-v2';
const DEFAULT_FONT = { krv: 16, esv: 16, original: 20 };
const FONT_MIN = 11;
const FONT_MAX = 40;

function loadFontSizes() {
  try {
    const stored = JSON.parse(localStorage.getItem(FONT_KEY));
    if (stored && typeof stored === 'object') {
      return {
        krv:      clampFont(stored.krv ?? DEFAULT_FONT.krv),
        esv:      clampFont(stored.esv ?? DEFAULT_FONT.esv),
        original: clampFont(stored.original ?? DEFAULT_FONT.original),
      };
    }
  } catch {}
  return { ...DEFAULT_FONT };
}
function clampFont(n) {
  return Math.max(FONT_MIN, Math.min(FONT_MAX, +n || DEFAULT_FONT.krv));
}

// 공백을 기준으로 텍스트를 chip 토큰으로 분리하되, span의 syncId/style은 보존
function htmlToTokens(html) {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tokens = [];
  let counter = 0;

  const walk = (node, syncId, styleStr) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = node.textContent.split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          tokens.push({ id: `t-${counter++}`, text: part, space: true });
        } else {
          tokens.push({ id: `t-${counter++}`, text: part, syncId, styleStr });
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      let s = syncId, st = styleStr;
      if (node.tagName === 'SPAN' && node.hasAttribute('data-sync-id')) {
        s = node.getAttribute('data-sync-id');
        st = node.getAttribute('style') || '';
      }
      // <br> 등은 무시 (병렬 뷰에서는 단어 단위 표시)
      Array.from(node.childNodes).forEach((c) => walk(c, s, st));
    }
  };
  Array.from(doc.body.childNodes).forEach((n) => walk(n, null, ''));
  return tokens;
}

// tokens → HTML 재구성 (인접한 syncId가 같으면 하나의 span으로 병합)
function tokensToHtml(tokens) {
  let out = '';
  let buf = '';
  let curSync = null;
  let curStyle = '';

  const flush = () => {
    if (!buf) return;
    if (curSync) {
      const styleAttr = curStyle ? ` style="${escapeAttr(curStyle)}"` : '';
      out += `<span data-sync-id="${escapeAttr(curSync)}"${styleAttr}>${escapeText(buf)}</span>`;
    } else {
      out += escapeText(buf);
    }
    buf = '';
  };

  for (const tok of tokens) {
    if (tok.space) {
      buf += tok.text;
      continue;
    }
    if (tok.syncId === curSync && (tok.styleStr || '') === curStyle) {
      buf += tok.text;
    } else {
      flush();
      curSync = tok.syncId || null;
      curStyle = tok.styleStr || '';
      buf = tok.text;
    }
  }
  flush();
  return `<p>${out}</p>`;
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function escapeText(s) {
  return String(s).replace(/[&<>]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]
  ));
}

function styleFromColor(color) {
  return color ? `color: ${color}; font-weight: bold` : '';
}

function isEmptyHtml(s) {
  if (!s) return true;
  const stripped = String(s).replace(/<[^>]+>/g, '').trim();
  return stripped.length === 0;
}

export default function ParallelView({ node, onSave, onClose }) {
  const isMobile = useMobile();
  // 모바일 오버라이드
  const mOverlay = isMobile ? { padding: 0 } : {};
  const mModal   = isMobile ? { maxWidth: '100%', width: '100%', maxHeight: 'none',
    height: '100vh', height: '100dvh', borderRadius: 0 } : {};
  const mHeader  = isMobile ? { padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 14px 12px' } : {};
  const mCols    = isMobile ? { gridTemplateColumns: '1fr', gap: 8, padding: 10 } : {};
  const mToolbar = isMobile ? { flexWrap: 'wrap', gap: 8, padding: '10px 14px' } : {};
  const mFooter  = isMobile ? { padding: '12px 14px calc(env(safe-area-inset-bottom, 0px) + 12px)' } : {};
  // 각 열의 토큰 상태
  const [tokensByTab, setTokensByTab] = useState(() => {
    const init = {};
    for (const col of COLUMNS) {
      init[col.id] = htmlToTokens(node.data.translations?.[col.id] || '');
    }
    return init;
  });

  // 로딩/에러 상태
  const [loading, setLoading] = useState({ krv: false, esv: false, original: false });
  const [errors, setErrors] = useState({});

  // 열별로 현재 선택된 chip 인덱스 목록
  const [selected, setSelected] = useState({ krv: [], esv: [], original: [] });
  const [message, setMessage] = useState('');

  // ── Lexicon (원어 어형 데이터) ─────────────────────────────────────
  const [lexEntries, setLexEntries] = useState([]);   // STEPBible 단어 배열 (해당 절)
  const [lexError, setLexError] = useState(null);
  const [popup, setPopup] = useState(null);           // { entry, anchor }

  // 역본별 본문 글자 크기 (localStorage에 저장)
  const [fontSizes, setFontSizes] = useState(loadFontSizes);
  const bumpFont = (colId, delta) => {
    setFontSizes((cur) => {
      const next = { ...cur, [colId]: clampFont((cur[colId] || DEFAULT_FONT[colId]) + delta) };
      try { localStorage.setItem(FONT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const { bookId, chapter, verseStart, verseEnd } = node.data;
    if (!bookId) return;
    let cancelled = false;
    loadVerseLexicon(bookId, chapter, verseStart, verseEnd)
      .then((entries) => {
        if (cancelled) return;
        if (!entries) { setLexError('원어 어형 데이터 없음'); return; }
        setLexEntries(entries);
      })
      .catch((e) => !cancelled && setLexError(e.message));
    return () => { cancelled = true; };
  }, [node.data.bookId, node.data.chapter, node.data.verseStart, node.data.verseEnd]);

  // 원어 chip 텍스트 → STEPBible entry 매칭 (동일 normalize 키)
  const lexByChip = useMemo(() => {
    const tokens = tokensByTab.original || [];
    if (!lexEntries.length) return new Map();
    // 각 lex entry의 정규화 키 → entry 배열 (동일 단어가 여러 번 나올 수 있음)
    const idx = new Map();
    for (const e of lexEntries) {
      const key = normalizeOriginal(e.w);
      if (!key) continue;
      if (!idx.has(key)) idx.set(key, []);
      idx.get(key).push(e);
    }
    // chip index → lex entry (같은 키가 여러 번이면 순서대로 소진)
    const result = new Map();
    const consumed = new Map();
    tokens.forEach((t, i) => {
      if (t.space) return;
      // 직접 매칭 시도
      let matchKey = normalizeOriginal(t.text);
      if (!matchKey) return;
      let bucket = idx.get(matchKey);
      // 직접 매칭 실패 → WLC 마카프(U+05BE)로 연결된 단어쌍이면 분리 후 재시도
      // 예: כִּי־טֹוב → ['כִּי', 'טֹוב'] 각각 매칭 시도
      if (!bucket && t.text.includes('־')) {
        for (const part of t.text.split('־')) {
          const partKey = normalizeOriginal(part);
          if (partKey && idx.has(partKey)) {
            matchKey = partKey;
            bucket = idx.get(partKey);
            break;
          }
        }
      }
      if (!bucket) return;
      const nth = consumed.get(matchKey) || 0;
      const entry = bucket[nth] || bucket[bucket.length - 1];
      if (entry) result.set(i, entry);
      consumed.set(matchKey, nth + 1);
    });
    return result;
  }, [lexEntries, tokensByTab]);

  // 부족한 역본 자동 로드
  const loadColumn = async (colId) => {
    const { bookId, chapter, verseStart, verseEnd } = node.data;
    if (!bookId) return;
    setLoading((prev) => ({ ...prev, [colId]: true }));
    setErrors((prev) => ({ ...prev, [colId]: null }));
    try {
      const text = await fetchVerse(bookId, chapter, verseStart, verseEnd, colId);
      setTokensByTab((prev) => ({ ...prev, [colId]: htmlToTokens(text) }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [colId]: err.message || '로드 실패' }));
    } finally {
      setLoading((prev) => ({ ...prev, [colId]: false }));
    }
  };

  useEffect(() => {
    for (const col of COLUMNS) {
      const cur = node.data.translations?.[col.id];
      if (isEmptyHtml(cur)) loadColumn(col.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  // 기존 그룹의 대표 색상 조회 (syncId → color)
  const groupColorMap = useMemo(() => {
    const m = new Map();
    for (const col of COLUMNS) {
      for (const t of tokensByTab[col.id] || []) {
        if (t.syncId && !m.has(t.syncId)) {
          const match = (t.styleStr || '').match(/color:\s*([^;]+)/i);
          m.set(t.syncId, match?.[1]?.trim() || null);
        }
      }
    }
    return m;
  }, [tokensByTab]);

  const toggleToken = (tabId, index) => {
    setMessage('');
    setSelected((prev) => {
      const cur = prev[tabId] || [];
      const next = cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index].sort((a, b) => a - b);
      return { ...prev, [tabId]: next };
    });
  };

  // 특정 그룹 전체 선택/해제 (chip 클릭 시 같은 syncId 전체를 함께 선택하면 편리)
  const selectWholeGroup = (syncId) => {
    if (!syncId) return;
    const next = { krv: [], esv: [], original: [] };
    for (const col of COLUMNS) {
      (tokensByTab[col.id] || []).forEach((t, i) => {
        if (t.syncId === syncId) next[col.id].push(i);
      });
    }
    setSelected(next);
    setMessage('');
  };

  const clearSelection = () => {
    setSelected({ krv: [], esv: [], original: [] });
    setMessage('');
  };

  const applyColor = (color) => {
    // 세 열 모두에 선택이 있어야 페어링 생성
    const cols = COLUMNS.map((c) => c.id);
    const hasAny = cols.some((id) => selected[id].length > 0);
    if (!hasAny) {
      setMessage('먼저 각 열에서 대응 단어를 클릭해 주세요.');
      return;
    }
    // 선택 chip 중 기존 syncId가 있으면 그것을 재사용, 없으면 새로 생성
    let syncId = null;
    for (const id of cols) {
      for (const idx of selected[id]) {
        const t = tokensByTab[id][idx];
        if (t?.syncId) { syncId = t.syncId; break; }
      }
      if (syncId) break;
    }
    if (!syncId) syncId = newSyncId();

    const styleStr = styleFromColor(color);

    setTokensByTab((prev) => {
      const next = { ...prev };
      for (const id of cols) {
        next[id] = prev[id].map((t, i) =>
          selected[id].includes(i) ? { ...t, syncId, styleStr } : t
        );
      }
      return next;
    });
    setMessage(`✓ 그룹에 ${color} 적용됨. 다른 그룹을 만들려면 새 단어를 선택하세요.`);
    setSelected({ krv: [], esv: [], original: [] });
  };

  const clearGroup = () => {
    // 선택된 chip에서 syncId 및 styleStr 제거
    const cols = COLUMNS.map((c) => c.id);
    setTokensByTab((prev) => {
      const next = { ...prev };
      for (const id of cols) {
        next[id] = prev[id].map((t, i) =>
          selected[id].includes(i) ? { ...t, syncId: null, styleStr: '' } : t
        );
      }
      return next;
    });
    setSelected({ krv: [], esv: [], original: [] });
    setMessage('선택한 chip의 그룹 해제됨');
  };

  const handleSave = () => {
    const updated = {};
    for (const col of COLUMNS) {
      const tokens = tokensByTab[col.id] || [];
      if (tokens.length === 0) continue; // 빈 열은 저장 스킵 (기존 데이터 덮어쓰기 방지)
      updated[col.id] = tokensToHtml(tokens);
    }
    onSave(updated);
  };

  // ESC로 닫기
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const selectedCount = COLUMNS.reduce((sum, c) => sum + (selected[c.id]?.length || 0), 0);

  return (
    <div style={{ ...overlayStyle, ...mOverlay }} onClick={onClose}>
      <div style={{ ...modalStyle, ...mModal }} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{ ...headerStyle, ...mHeader }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
              🔤 단어 페어링 — {node.data.reference}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              각 열에서 대응 단어를 클릭해 선택한 뒤, 아래 색상을 눌러 세 역본 동시 적용
            </div>
          </div>

          <button onClick={onClose} style={{ ...closeBtnStyle, ...(isMobile ? { fontSize: 24, minWidth: 44, minHeight: 44 } : {}) }}>✕</button>
        </div>

        {/* 3열 (모바일: 세로 스택) */}
        <div className={isMobile ? 'momentum-scroll' : undefined}
          style={{ ...columnsWrapStyle, ...mCols,
            overflow: isMobile ? 'auto' : 'hidden',
            WebkitOverflowScrolling: 'touch' }}>
          {COLUMNS.map((col) => (
            <div key={col.id} style={columnStyle}>
              <div style={{ ...columnHeaderStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <span style={{ flexShrink: 0 }}>
                  {col.label}
                  {loading[col.id] && <span style={{ marginLeft: 6, color: '#94a3b8', fontWeight: 400 }}>불러오는 중…</span>}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <button
                    onClick={() => bumpFont(col.id, -1)}
                    disabled={fontSizes[col.id] <= FONT_MIN}
                    style={fontBtnStyle}
                    title="글자 작게"
                  >A−</button>
                  <span style={{ fontSize: 10, color: '#64748b', minWidth: 28, textAlign: 'center', fontWeight: 600 }}>
                    {fontSizes[col.id]}px
                  </span>
                  <button
                    onClick={() => bumpFont(col.id, 1)}
                    disabled={fontSizes[col.id] >= FONT_MAX}
                    style={fontBtnStyle}
                    title="글자 크게"
                  >A+</button>
                  <button
                    onClick={() => loadColumn(col.id)}
                    disabled={loading[col.id]}
                    title="이 역본을 서버에서 다시 불러오기"
                    style={{
                      background: 'none', border: '1px solid #e2e8f0', borderRadius: 4,
                      padding: '2px 6px', fontSize: 10, color: '#64748b', cursor: 'pointer',
                      opacity: loading[col.id] ? 0.4 : 1,
                      marginLeft: 4,
                    }}
                  >
                    🔄
                  </button>
                </div>
              </div>
              <div className={isMobile ? 'momentum-scroll' : undefined}
                style={{
                  ...chipsWrapStyle,
                  fontFamily: col.font,
                  fontSize: fontSizes[col.id],
                  direction: col.id === 'original' && isOT(node.data.bookId) ? 'rtl' : 'ltr',
                  maxHeight: isMobile ? 260 : undefined,
                  WebkitOverflowScrolling: 'touch',
                }}>
                {errors[col.id] && (
                  <div style={{ color: '#ef4444', fontSize: 12, padding: 12, background: '#fef2f2', borderRadius: 6 }}>
                    ⚠️ {errors[col.id]}
                  </div>
                )}
                {!loading[col.id] && !errors[col.id] && (tokensByTab[col.id] || []).length === 0 && (
                  <div style={{ color: '#94a3b8', fontSize: 12, padding: 12 }}>
                    본문이 없습니다. 위 재로드 버튼을 눌러 주세요.
                  </div>
                )}
                {col.id === 'original' && lexError && (
                  <div style={{ fontSize: 10, color: '#f59e0b', padding: '2px 4px' }}>ℹ️ {lexError}</div>
                )}
                {(tokensByTab[col.id] || []).map((t, i) => {
                  if (t.space) return <span key={t.id} style={{ whiteSpace: 'pre' }}>{t.text}</span>;
                  const isSel = (selected[col.id] || []).includes(i);
                  const groupColor = t.syncId ? groupColorMap.get(t.syncId) : null;
                  const lexEntry = col.id === 'original' ? lexByChip.get(i) : null;
                  const hasLex = !!lexEntry;
                  return (
                    <span
                      key={t.id}
                      onClick={(e) => {
                        // Cmd/Ctrl+클릭: 원어 어형 팝업
                        if (col.id === 'original' && hasLex && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setPopup({ entry: lexEntry, anchor: { x: rect.left + rect.width / 2, y: rect.bottom } });
                          return;
                        }
                        if (e.shiftKey && t.syncId) selectWholeGroup(t.syncId);
                        else toggleToken(col.id, i);
                      }}
                      style={{
                        display: 'inline-block',
                        padding: '2px 4px',
                        margin: '1px 0',
                        borderRadius: 3,
                        cursor: 'pointer',
                        background: isSel ? '#dbeafe' : 'transparent',
                        outline: isSel ? '2px solid #3b82f6' : 'none',
                        color: groupColor || 'inherit',
                        fontWeight: groupColor ? 'bold' : 'normal',
                        borderBottom: hasLex ? '1px dotted #8b5cf6' : 'none',
                        transition: 'background 0.1s',
                      }}
                      title={
                        hasLex
                          ? `${lexEntry.tr || ''} · ${lexEntry.s || ''} · ${lexEntry.g || ''}\nCmd/Ctrl+클릭: 어형 분석 카드`
                          : t.syncId
                            ? `그룹: ${t.syncId} (Shift+클릭: 그룹 전체 선택)`
                            : '클릭해서 선택'
                      }
                    >
                      {t.text}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 하단 도구 바 */}
        <div style={{ ...toolbarStyle, ...mToolbar }}>
          <div style={{ fontSize: 12, color: '#475569', flex: 1 }}>
            {message || (
              selectedCount > 0
                ? `선택됨: 개역한글 ${selected.krv.length} · ESV ${selected.esv.length} · 원어 ${selected.original.length}`
                : '💡 팁: 대응 단어 클릭 → 색상 선택으로 페어링 · Shift+클릭: 그룹 전체 선택 · Cmd/Ctrl+원어 단어 클릭: 어형 분석 카드'
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {PALETTE.map((p) => (
              <button
                key={p.color}
                onClick={() => applyColor(p.color)}
                title={`${p.label} — 선택 단어를 이 색상으로 페어링`}
                style={{
                  width: isMobile ? 36 : 22,
                  height: isMobile ? 36 : 22,
                  borderRadius: '50%', border: '2px solid #fff',
                  background: p.color, cursor: 'pointer', padding: 0,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            ))}
            <div style={{ width: 1, height: 22, background: '#e2e8f0', margin: '0 4px' }} />
            <button onClick={clearGroup} disabled={selectedCount === 0}
              style={{ ...secondaryBtnStyle, ...(isMobile ? { minHeight: 40, padding: '8px 12px', fontSize: 13 } : {}),
                opacity: selectedCount === 0 ? 0.4 : 1 }}
              title="선택한 chip의 그룹 해제">🚫 해제</button>
            <button onClick={clearSelection} disabled={selectedCount === 0}
              style={{ ...secondaryBtnStyle, ...(isMobile ? { minHeight: 40, padding: '8px 12px', fontSize: 13 } : {}),
                opacity: selectedCount === 0 ? 0.4 : 1 }}
              title="선택 초기화">↺ 선택 취소</button>
          </div>
        </div>

        {/* 저장/닫기 */}
        <div style={{ ...footerStyle, ...mFooter }}>
          <button onClick={onClose} style={{ ...cancelBtnStyle, ...(isMobile ? { minHeight: 44, padding: '12px 20px', fontSize: 14 } : {}) }}>닫기</button>
          <button onClick={handleSave} style={{ ...saveBtnStyle, ...(isMobile ? { minHeight: 44, padding: '12px 20px', fontSize: 14 } : {}) }}>💾 저장 후 닫기</button>
        </div>
      </div>

      {popup && (
        <LexiconPopup
          entry={popup.entry}
          anchor={popup.anchor}
          bookId={node.data.bookId}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────
const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 2000,
  background: 'rgba(15,23,42,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 20,
};
const modalStyle = {
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  width: '100%', maxWidth: 1100, maxHeight: '90vh',
  display: 'flex', flexDirection: 'column',
  fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
};
const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
};
const closeBtnStyle = {
  background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b',
};
const columnsWrapStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 12,
  padding: 16,
  flex: 1,
  overflow: 'hidden',
};
const columnStyle = {
  display: 'flex', flexDirection: 'column',
  border: '1px solid #e2e8f0', borderRadius: 8,
  background: '#f8fafc',
  overflow: 'hidden',
};
const columnHeaderStyle = {
  padding: '8px 12px',
  background: '#fff',
  borderBottom: '1px solid #e2e8f0',
  fontWeight: 700, fontSize: 12, color: '#475569',
};
const chipsWrapStyle = {
  padding: 12,
  lineHeight: 2,
  overflowY: 'auto',
  flex: 1,
};

const fontBtnStyle = {
  padding: '2px 8px',
  fontSize: 11,
  fontWeight: 700,
  background: '#f1f5f9',
  color: '#475569',
  border: '1px solid #e2e8f0',
  borderRadius: 4,
  cursor: 'pointer',
};
const toolbarStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '10px 16px', borderTop: '1px solid #e2e8f0',
  background: '#f8fafc',
};
const secondaryBtnStyle = {
  padding: '4px 10px', fontSize: 11, fontWeight: 600,
  border: '1px solid #e2e8f0', borderRadius: 4,
  background: '#fff', color: '#475569', cursor: 'pointer',
};
const footerStyle = {
  display: 'flex', justifyContent: 'flex-end', gap: 8,
  padding: '12px 16px', borderTop: '1px solid #e2e8f0',
};
const cancelBtnStyle = {
  padding: '8px 16px', fontSize: 13,
  border: '1px solid #e2e8f0', borderRadius: 6,
  background: '#fff', color: '#475569', cursor: 'pointer',
};
const saveBtnStyle = {
  padding: '8px 18px', fontSize: 13, fontWeight: 700,
  border: 'none', borderRadius: 6,
  background: '#3b82f6', color: '#fff', cursor: 'pointer',
};
