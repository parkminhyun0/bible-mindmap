import { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { isOT } from '../data/bibleBooks';
import { fetchVerse } from '../api/bibleApi';

const TABS = [
  { id: 'krv',      label: '개역한글' },
  { id: 'esv',      label: 'ESV' },
  { id: 'original', label: '원어' },
  { id: 'lxx',      label: 'LXX', otOnly: true },
];

export default function VerseNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const borderColor = data.color || '#3b82f6';
  const fontSize = data.fontSize || 13;

  const hasMulti = !!data.bookId;
  const ot = hasMulti ? isOT(data.bookId) : false;
  const visibleTabs = TABS.filter((t) => !t.otOnly || ot);

  // Initialize to the first tab that already has text
  const [activeTab, setActiveTab] = useState(() => {
    if (!hasMulti || !data.translations) return 'krv';
    for (const t of visibleTabs) {
      if (data.translations[t.id]) return t.id;
    }
    return 'krv';
  });
  const [tabLoading, setTabLoading] = useState({});
  const [tabErrors, setTabErrors]   = useState({});

  const handleTabClick = async (tabId) => {
    setActiveTab(tabId);
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

  const isRTL = hasMulti && activeTab === 'original' && ot;

  return (
    <div
      style={{
        background: '#fff',
        border: `2px solid ${borderColor}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 260,
        maxWidth: 340,
        boxShadow: selected
          ? `0 0 0 2px ${borderColor}60, 0 2px 8px rgba(0,0,0,0.12)`
          : '0 2px 8px rgba(0,0,0,0.08)',
        fontSize,
        lineHeight: 1.6,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontWeight: 700,
          fontSize: fontSize + 1,
          color: borderColor,
          marginBottom: 6,
          borderBottom: `1px solid ${borderColor}30`,
          paddingBottom: 4,
        }}
      >
        📖 {data.reference}
      </div>

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

      {/* LXX 절번호 경고 배너 */}
      {hasMulti && activeTab === 'lxx' && (
        <div style={{
          fontSize: 10,
          color: '#92400e',
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: 4,
          padding: '3px 7px',
          marginBottom: 6,
          lineHeight: 1.4,
        }}>
          ⚠️ LXX 절번호는 MT와 다를 수 있습니다 (시편 1장 차이, 렘·단 편차 등)
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{ color: '#94a3b8', fontSize: 12 }}>불러오는 중…</div>
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
    </div>
  );
}
