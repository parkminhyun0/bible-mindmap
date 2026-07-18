import { useState } from 'react';
import BibleSearch from './BibleSearch';

export default function Sidebar({ onAddNode }) {
  const [tab, setTab] = useState('verse');
  const [reference, setReference] = useState('');
  const [text, setText] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [verseMode, setVerseMode] = useState('search');
  const [contentOpen, setContentOpen] = useState(true);

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
    }
  };

  const handleBibleSelect = ({ reference: ref, text: txt, color: c, translationId, bookId, chapter, verseStart, verseEnd }) => {
    const structuredExtra = bookId
      ? {
          bookId,
          chapter,
          verseStart,
          verseEnd,
          translations: { [translationId || 'krv']: txt },
        }
      : {};
    onAddNode({
      type: 'verse',
      data: { reference: ref, text: txt, color: c, ...structuredExtra },
    });
  };

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

      {/* ═══ 섹션 2: 구절/노트/주제 탭 + 추가 버튼 ═══ */}
      <div style={tabBarStyle}>
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

        {/* 노트/주제 탭의 입력 필드 */}
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

      {/* ═══ 섹션 3: 검색/입력 콘텐츠 (접기 가능) ═══ */}
      <div style={contentAreaStyle}>
        {/* 접기 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
            {tab === 'verse' ? '📖 구절 입력' : tab === 'note' ? '📝 노트' : '🏷️ 주제'}
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
      </div>
    </div>
  );
}

const TABS = [
  { key: 'verse', label: '구절', icon: '📖' },
  { key: 'note', label: '노트', icon: '📝' },
  { key: 'topic', label: '주제', icon: '🏷️' },
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
