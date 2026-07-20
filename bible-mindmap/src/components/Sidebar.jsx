import { useState, useEffect, useRef } from 'react';
import BibleSearch from './BibleSearch';
import useMobile from '../hooks/useMobile';
import { searchBiblicalPerson, searchBiblicalPlace } from '../api/wikidataApi';
import { BIBLICAL_PERIODS } from '../data/biblicalPeriods';
import { getBibleTags } from '../data/bibleReferences';

export default function Sidebar({ onAddNode, mobileOpen, onMobileClose }) {
  const isMobile = useMobile();
  const [tab, setTab] = useState('verse');
  const [reference, setReference] = useState('');
  const [text, setText] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [verseMode, setVerseMode] = useState('search');
  const [contentOpen, setContentOpen] = useState(true);

  // 배경 노드 (person/place) 공통 상태
  const [bgQuery, setBgQuery] = useState('');
  const [bgResults, setBgResults] = useState([]);
  const [bgSelected, setBgSelected] = useState(null); // 선택된 후보 QID
  const [bgDetail, setBgDetail] = useState(null);    // 상세 데이터
  const [bgLoading, setBgLoading] = useState(false);
  const [bgError, setBgError] = useState('');
  const debounceRef = useRef(null);

  // period 상태
  const [selectedPeriodId, setSelectedPeriodId] = useState(BIBLICAL_PERIODS[0].id);

  // 탭 전환 시 배경 노드 상태 초기화
  useEffect(() => {
    setBgQuery(''); setBgResults([]); setBgSelected(null); setBgDetail(null); setBgError('');
  }, [tab]);

  // 검색어 변경 시 SPARQL 자동 검색 (디바운스 600ms)
  // 결과 자체에 날짜·좌표 포함 → 별도 상세 fetch 불필요
  useEffect(() => {
    if (tab !== 'person' && tab !== 'place') return;
    if (!bgQuery.trim()) { setBgResults([]); setBgSelected(null); setBgDetail(null); return; }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setBgLoading(true); setBgError(''); setBgResults([]); setBgDetail(null);
      try {
        const search = tab === 'person' ? searchBiblicalPerson : searchBiblicalPlace;
        const results = await search(bgQuery);
        setBgResults(results);
        if (results.length > 0) {
          setBgSelected(results[0].id);
          setBgDetail(results[0]);
        } else {
          setBgSelected(null);
        }
      } catch {
        setBgError('검색 오류 — 잠시 후 다시 시도해 주세요');
      } finally {
        setBgLoading(false);
      }
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [bgQuery, tab]);

  // 후보 선택 시 해당 결과 데이터로 즉시 교체 (추가 fetch 없음)
  useEffect(() => {
    if (!bgSelected || bgResults.length === 0) return;
    const found = bgResults.find((r) => r.id === bgSelected);
    if (found) setBgDetail(found);
  }, [bgSelected]);

  const colors = [
    { value: '#3b82f6', label: '파랑 (신약)' },
    { value: '#f59e0b', label: '주황 (구약)' },
    { value: '#10b981', label: '초록 (평행)' },
    { value: '#ef4444', label: '빨강 (강조)' },
    { value: '#8b5cf6', label: '보라 (예언)' },
  ];

  const handleAdd = () => {
    if (tab === 'verse' && reference && text) {
      onAddNode({ type: 'verse', data: { reference, text, color } });
      setReference('');
      setText('');
    } else if (tab === 'note' && text) {
      onAddNode({ type: 'note', data: { title, text } });
      setTitle('');
      setText('');
    } else if (tab === 'topic' && title) {
      onAddNode({
        type: 'topic',
        data: { title, keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean) },
      });
      setTitle('');
      setKeywords('');
    } else if (tab === 'person' && bgDetail) {
      onAddNode({ type: 'person', data: { ...bgDetail, bibleTags: getBibleTags(bgDetail.wikidataId) } });
      setBgQuery(''); setBgResults([]); setBgSelected(null); setBgDetail(null);
    } else if (tab === 'place' && bgDetail) {
      onAddNode({ type: 'place', data: { ...bgDetail, bibleTags: getBibleTags(bgDetail.wikidataId) } });
      setBgQuery(''); setBgResults([]); setBgSelected(null); setBgDetail(null);
    } else if (tab === 'period') {
      const p = BIBLICAL_PERIODS.find((p) => p.id === selectedPeriodId);
      if (p) onAddNode({ type: 'period', data: { name: p.name, range: p.range, events: p.events, certainty: p.certainty, bibleTags: p.bibleTags || [] } });
    }
  };

  const handleBibleSelect = ({ reference: ref, text: txt, color: c, translationId, bookId, chapter, verseStart, verseEnd, translations, activeTab }) => {
    const structuredExtra = bookId
      ? {
          bookId,
          chapter,
          verseStart,
          verseEnd,
          translations: translations || { [translationId || 'krv']: txt },
          activeTab: activeTab || translationId || 'krv',
        }
      : {};
    onAddNode({
      type: 'verse',
      data: { reference: ref, text: txt, color: c, ...structuredExtra },
    });
  };

  // ─── 모바일: 드로어 래퍼 ───
  if (isMobile) {
    if (!mobileOpen) return null;
    return (
      <>
        {/* 배경 오버레이 */}
        <div
          onClick={onMobileClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100,
          }}
        />
        {/* 드로어 */}
        <div style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1101,
          background: '#f8fafc', borderRadius: '16px 16px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
          maxHeight: '80vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* 드로어 핸들 */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 8px' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>✝️ 성경 마인드맵</h2>
            <button onClick={onMobileClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>✕</button>
          </div>

          {/* 탭 */}
          <div style={{ display: 'flex', gap: 4, padding: '0 16px 10px' }}>
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flex: 1, padding: '7px 0', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer',
                background: tab === t.key ? '#3b82f6' : '#e2e8f0',
                color: tab === t.key ? '#fff' : '#64748b', fontWeight: tab === t.key ? 700 : 400,
              }}>{t.icon} {t.label}</button>
            ))}
          </div>

          {/* 노트 탭 */}
          {tab === 'note' && (
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input placeholder="노트 제목" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
              <textarea placeholder="노트 내용" value={text} onChange={(e) => setText(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              <button onClick={() => { handleAdd(); onMobileClose(); }} style={btnStyle}>+ 노트 추가</button>
            </div>
          )}

          {/* 주제 탭 */}
          {tab === 'topic' && (
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input placeholder="주제 이름" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
              <input placeholder="키워드 (쉼표 구분)" value={keywords} onChange={(e) => setKeywords(e.target.value)} style={inputStyle} />
              <button onClick={() => { handleAdd(); onMobileClose(); }} style={btnStyle}>+ 주제 추가</button>
            </div>
          )}

          {/* 구절 탭 */}
          {tab === 'verse' && (
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                <button onClick={() => setVerseMode('search')} style={{ ...modeTabStyle, background: verseMode === 'search' ? '#6366f1' : '#e2e8f0', color: verseMode === 'search' ? '#fff' : '#64748b' }}>🔍 검색</button>
                <button onClick={() => setVerseMode('manual')} style={{ ...modeTabStyle, background: verseMode === 'manual' ? '#6366f1' : '#e2e8f0', color: verseMode === 'manual' ? '#fff' : '#64748b' }}>✏️ 직접입력</button>
              </div>
              {verseMode === 'search' ? (
                <BibleSearch onSelect={(sel) => { handleBibleSelect(sel); onMobileClose(); }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input placeholder="구절 참조 (예: 창세기 1:1)" value={reference} onChange={(e) => setReference(e.target.value)} style={inputStyle} />
                  <textarea placeholder="본문 내용" value={text} onChange={(e) => setText(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                  <button onClick={() => { handleAdd(); onMobileClose(); }} style={btnStyle}>+ 추가</button>
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  // ─── 접힌 상태 ───
  if (!contentOpen) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0' }}>
        {/* 섹션 1: 타이틀 */}
        <div style={titleBarStyle}>
          <h2 style={titleStyle}>✝️ 성경 마인드맵</h2>
        </div>

        {/* 섹션 2: 탭 (세로) */}
        <div style={{ ...tabBarStyle, flexDirection: 'column', padding: '8px 4px', gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                ...tabBtnStyle,
                background: tab === t.key ? '#3b82f6' : '#e2e8f0',
                color: tab === t.key ? '#fff' : '#64748b',
                fontWeight: tab === t.key ? 700 : 400,
                padding: '6px 8px',
                fontSize: 18,
              }}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* 열기 탭 */}
        <div
          onClick={() => setContentOpen(true)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            writingMode: 'vertical-rl',
            fontSize: 12,
            color: '#64748b',
            fontWeight: 600,
            userSelect: 'none',
            background: '#f8fafc',
            padding: '8px 6px',
          }}
        >
          📖 입력 패널 열기 ▶
        </div>
      </div>
    );
  }

  // ─── 열린 상태 ───
  return (
    <div style={containerStyle}>
      {/* ═══ 섹션 1: 타이틀 ═══ */}
      <div style={titleBarStyle}>
        <h2 style={titleStyle}>✝️ 성경 마인드맵</h2>
      </div>

      {/* ═══ 섹션 2: 본문 탭 (구절/노트/주제) ═══ */}
      <div style={tabBarStyle}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 2, letterSpacing: 1 }}>본문</div>
        <div style={{ display: 'flex', gap: 4, width: '100%' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                ...tabBtnStyle,
                flex: 1,
                background: tab === t.key ? '#3b82f6' : '#e2e8f0',
                color: tab === t.key ? '#fff' : '#64748b',
                fontWeight: tab === t.key ? 700 : 400,
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'note' && (
          <div style={tabInputArea}>
            <input placeholder="노트 제목" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
            <textarea placeholder="노트 내용" value={text} onChange={(e) => setText(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            <button onClick={handleAdd} style={btnStyle}>+ 노트 추가</button>
          </div>
        )}

        {tab === 'topic' && (
          <div style={tabInputArea}>
            <input placeholder="주제 이름" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
            <input placeholder="키워드 (쉼표 구분)" value={keywords} onChange={(e) => setKeywords(e.target.value)} style={inputStyle} />
            <button onClick={handleAdd} style={btnStyle}>+ 주제 추가</button>
          </div>
        )}
      </div>

      {/* ═══ 섹션 2b: 배경 탭 (인물/장소/시대) ═══ */}
      <div style={{ ...tabBarStyle, borderTop: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 2, letterSpacing: 1 }}>배경</div>
        <div style={{ display: 'flex', gap: 4, width: '100%' }}>
          {BG_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                ...tabBtnStyle,
                flex: 1,
                background: tab === t.key
                  ? (t.key === 'person' ? '#059669' : t.key === 'place' ? '#d97706' : '#6d28d9')
                  : '#e2e8f0',
                color: tab === t.key ? '#fff' : '#64748b',
                fontWeight: tab === t.key ? 700 : 400,
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* 인물 검색 인라인 입력 */}
        {tab === 'person' && (
          <div style={tabInputArea}>
            <WikidataSearchUI
              query={bgQuery}
              setQuery={setBgQuery}
              results={bgResults}
              selected={bgSelected}
              onSelect={setBgSelected}
              detail={bgDetail}
              loading={bgLoading}
              error={bgError}
              placeholder="인물 이름 (예: 다윗, 모세, 바울)"
              renderDetail={(d) => (
                <>
                  <div style={detailRow}><b>이름</b> {d.name}</div>
                  {d.birthDate && <div style={detailRow}><b>출생</b> {d.birthDate}</div>}
                  {d.deathDate && <div style={detailRow}><b>사망</b> {d.deathDate}</div>}
                  {d.description && <div style={{ ...detailRow, color: '#6b7280' }}>{d.description}</div>}
                </>
              )}
            />
            <button onClick={handleAdd} disabled={!bgDetail} style={{ ...btnStyle, background: '#059669', opacity: bgDetail ? 1 : 0.4 }}>
              + 인물 추가
            </button>
          </div>
        )}

        {/* 장소 검색 인라인 입력 */}
        {tab === 'place' && (
          <div style={tabInputArea}>
            <WikidataSearchUI
              query={bgQuery}
              setQuery={setBgQuery}
              results={bgResults}
              selected={bgSelected}
              onSelect={setBgSelected}
              detail={bgDetail}
              loading={bgLoading}
              error={bgError}
              placeholder="장소 이름 (예: 베들레헴, 예루살렘)"
              renderDetail={(d) => (
                <>
                  <div style={detailRow}><b>이름</b> {d.name}</div>
                  {d.lat != null && <div style={detailRow}><b>좌표</b> {d.lat}°N {d.lon}°E</div>}
                  {d.description && <div style={{ ...detailRow, color: '#6b7280' }}>{d.description}</div>}
                </>
              )}
            />
            <button onClick={handleAdd} disabled={!bgDetail} style={{ ...btnStyle, background: '#d97706', opacity: bgDetail ? 1 : 0.4 }}>
              + 장소 추가
            </button>
          </div>
        )}

        {/* 시대 선택 */}
        {tab === 'period' && (
          <div style={tabInputArea}>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              style={inputStyle}
            >
              {BIBLICAL_PERIODS.map((p) => (
                <option key={p.id} value={p.id}>{p.icon} {p.name} — {p.range}</option>
              ))}
            </select>
            {(() => {
              const p = BIBLICAL_PERIODS.find((p) => p.id === selectedPeriodId);
              return p ? (
                <div style={{ fontSize: 11, color: '#4338ca', lineHeight: 1.6, padding: '4px 0' }}>
                  {p.events.map((ev, i) => <div key={i}>• {ev}</div>)}
                </div>
              ) : null;
            })()}
            <button onClick={handleAdd} style={{ ...btnStyle, background: '#6d28d9' }}>
              + 시대 추가
            </button>
          </div>
        )}
      </div>

      {/* ═══ 섹션 3: 검색/입력 콘텐츠 (접기 가능) ═══ */}
      <div style={contentAreaStyle}>
        {/* 접기 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
            {tab === 'verse' ? '📖 구절 입력' : tab === 'note' ? '📝 노트' : tab === 'topic' ? '🏷️ 주제'
              : tab === 'person' ? '👤 인물' : tab === 'place' ? '📍 장소' : '🕰️ 시대'}
          </span>
          <button
            onClick={() => setContentOpen(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: '#94a3b8', padding: '2px 4px',
            }}
            title="패널 접기"
          >
            ◀ 접기
          </button>
        </div>

        {tab === 'verse' && (
          <>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              <button
                onClick={() => setVerseMode('search')}
                style={{
                  ...modeTabStyle,
                  background: verseMode === 'search' ? '#6366f1' : '#e2e8f0',
                  color: verseMode === 'search' ? '#fff' : '#64748b',
                }}
              >
                🔍 검색
              </button>
              <button
                onClick={() => setVerseMode('manual')}
                style={{
                  ...modeTabStyle,
                  background: verseMode === 'manual' ? '#6366f1' : '#e2e8f0',
                  color: verseMode === 'manual' ? '#fff' : '#64748b',
                }}
              >
                ✏️ 직접입력
              </button>
            </div>

            {verseMode === 'search' ? (
              <BibleSearch onSelect={handleBibleSelect} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input placeholder="구절 참조 (예: 창세기 1:1)" value={reference} onChange={(e) => setReference(e.target.value)} style={inputStyle} />
                <textarea placeholder="본문 내용" value={text} onChange={(e) => setText(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                <select value={color} onChange={(e) => setColor(e.target.value)} style={inputStyle}>
                  {colors.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <button onClick={handleAdd} style={btnStyle}>+ 추가</button>
              </div>
            )}
          </>
        )}

        {/* 범례 */}
        <div style={legendStyle}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>연결선 범례:</div>
          <div><span style={{ color: '#ef4444' }}>- - →</span> 인용</div>
          <div><span style={{ color: '#3b82f6' }}>———</span> 평행</div>
          <div><span style={{ color: '#a78bfa' }}>· · ·</span> 주제</div>
          <div><span style={{ color: '#eab308' }}>- - -</span> 반향</div>
          <div><span style={{ color: '#1e293b' }}>———</span> 관계</div>
        </div>

        {/* Attribution */}
        <div style={attributionStyle}>
          원어 데이터:{' '}
          <a href="https://github.com/STEPBible/STEPBible-Data" target="_blank" rel="noreferrer" style={{ color: '#64748b' }}>
            STEPBible.data
          </a>{' '}
          (CC BY 4.0)
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { key: 'verse',  label: '구절', icon: '📖' },
  { key: 'note',   label: '노트', icon: '📝' },
  { key: 'topic',  label: '주제', icon: '🏷️' },
];

const BG_TABS = [
  { key: 'person', label: '인물', icon: '👤' },
  { key: 'place',  label: '장소', icon: '📍' },
  { key: 'period', label: '시대', icon: '🕰️' },
];

const containerStyle = {
  width: 300,
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid #e2e8f0',
  background: '#f8fafc',
};

// 섹션 1: 타이틀
const titleBarStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid #e2e8f0',
  background: '#fff',
};

const titleStyle = {
  fontSize: 16,
  fontWeight: 700,
  color: '#1e293b',
  margin: 0,
};

// 섹션 2: 탭 영역
const tabBarStyle = {
  padding: '10px 16px',
  borderBottom: '1px solid #e2e8f0',
  background: '#fff',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const tabBtnStyle = {
  padding: '6px 0',
  fontSize: 12,
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const tabInputArea = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  paddingTop: 4,
};

// 섹션 3: 콘텐츠 영역
const contentAreaStyle = {
  flex: 1,
  padding: 16,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 13,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const btnStyle = {
  padding: '8px 0',
  fontSize: 14,
  fontWeight: 600,
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const modeTabStyle = {
  flex: 1,
  padding: '4px 0',
  fontSize: 11,
  fontWeight: 600,
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};

const legendStyle = {
  marginTop: 'auto',
  paddingTop: 12,
  borderTop: '1px solid #e2e8f0',
  fontSize: 12,
  color: '#64748b',
  lineHeight: 1.8,
};

const attributionStyle = {
  marginTop: 8,
  paddingTop: 8,
  borderTop: '1px solid #e2e8f0',
  fontSize: 10,
  color: '#94a3b8',
  lineHeight: 1.5,
};

const detailRow = {
  fontSize: 11, color: '#374151', marginBottom: 2,
};

// Wikidata 검색 + 후보 선택 + 상세 프리뷰 UI
function WikidataSearchUI({ query, setQuery, results, selected, onSelect, detail, loading, error, placeholder, renderDetail }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#94a3b8' }}>
            검색 중…
          </span>
        )}
      </div>

      {error && <div style={{ fontSize: 11, color: '#ef4444' }}>{error}</div>}

      {results.length > 1 && (
        <select
          value={selected || ''}
          onChange={(e) => onSelect(e.target.value)}
          style={{ ...inputStyle, fontSize: 11 }}
        >
          {results.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label} {r.description ? `— ${r.description.slice(0, 40)}` : ''}
            </option>
          ))}
        </select>
      )}

      {detail && (
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: 6, padding: '8px 10px', fontSize: 11,
        }}>
          {renderDetail(detail)}
          <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>
            출처: Wikidata · {detail.wikidataId}
          </div>
        </div>
      )}

      {query && !loading && results.length === 0 && !error && (
        <div style={{ fontSize: 11, color: '#94a3b8' }}>결과 없음 — 다른 이름으로 검색해 보세요</div>
      )}
    </div>
  );
}
