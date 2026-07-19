import { useState, useEffect, useRef } from 'react';
import useMobile from '../hooks/useMobile';
import { searchContemporaries, searchPersonsAtPlace } from '../api/wikidataApi';
import { fetchCrossRefs } from '../api/crossrefApi';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import { SyncMark } from '../utils/SyncMark';
import ParallelView from './ParallelView';

const COLORS = [
  { value: '#3b82f6', label: '파랑' },
  { value: '#f59e0b', label: '주황' },
  { value: '#10b981', label: '초록' },
  { value: '#ef4444', label: '빨강' },
  { value: '#8b5cf6', label: '보라' },
  { value: '#0ea5e9', label: '하늘' },
  { value: '#f97316', label: '오렌지' },
  { value: '#64748b', label: '회색' },
];

const TEXT_COLORS = [
  { value: '#1e293b', label: '기본' },
  { value: '#ef4444', label: '빨강' },
  { value: '#3b82f6', label: '파랑' },
  { value: '#10b981', label: '초록' },
  { value: '#f59e0b', label: '주황' },
  { value: '#8b5cf6', label: '보라' },
  { value: '#64748b', label: '회색' },
];

const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 50];

export default function NodeEditor({ selectedNode, onUpdateNode, onUndo, onRedo, canUndo, canRedo, onAddContemporary, onAddCrossRef }) {
  const [editData, setEditData] = useState(null);
  const [, setTick] = useState(0);
  const [tagInput, setTagInput] = useState('');
  const [contemporaries, setContemporaries] = useState(null); // null | 'loading' | []
  const [contError, setContError] = useState('');
  const [placePersons, setPlacePersons] = useState(null); // null | 'loading' | []
  const [placePersonError, setPlacePersonError] = useState('');
  const [crossRefs, setCrossRefs] = useState(null); // null | 'loading' | []
  const [crossRefError, setCrossRefError] = useState('');

  // 방금 로컬 편집으로 저장한 (nodeId, tab, html) — 이 값이 data로 되돌아오면 setContent 스킵
  const lastLocalEditRef = useRef({ nodeId: null, tab: null, html: null });

  // 병렬 뷰 모달 (단어 페어링 UI)
  const [parallelOpen, setParallelOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      SyncMark,
    ],
    content: '',
    onUpdate: () => setTick((t) => t + 1),
    onSelectionUpdate: () => setTick((t) => t + 1),
  });

  // Track current translation content so editor refreshes when async fetch completes
  const activeTabKey = selectedNode?.data?.activeTab || 'krv';
  const currentTranslation = selectedNode?.data?.translations?.[activeTabKey];

  useEffect(() => {
    if (!editor) return;
    if (!selectedNode) {
      setEditData(null);
      lastLocalEditRef.current = { nodeId: null, tab: null, html: null };
      editor.commands.setContent('');
      setContemporaries(null);
      setContError('');
      setPlacePersons(null);
      setPlacePersonError('');
      setCrossRefs(null);
      setCrossRefError('');
      return;
    }
    // 다른 노드로 전환 시 관련 인물 패널 닫기
    if (selectedNode.id !== lastLocalEditRef.current.nodeId) {
      setContemporaries(null);
      setContError('');
      setPlacePersons(null);
      setPlacePersonError('');
      setCrossRefs(null);
      setCrossRefError('');
    }
    const newData = { ...selectedNode.data };
    setEditData(newData);
    const activeTab = newData.activeTab || 'krv';

    const html = newData.translations?.[activeTab] ?? newData.text ?? '';

    // 방금 로컬 편집으로 저장했던 값이면 setContent 재호출 안 함
    // (그렇지 않으면 매 keystroke마다 커서/선택이 리셋되어 볼드·색상이 안 먹힘)
    const last = lastLocalEditRef.current;
    if (last.nodeId === selectedNode.id && last.tab === activeTab && last.html === html) {
      return;
    }
    if (editor.getHTML() !== html) {
      editor.commands.setContent(html);
    }
  }, [selectedNode?.id, selectedNode?.data?.activeTab, currentTranslation, editor]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if (!selectedNode) return;
      const html = editor.getHTML();
      const activeTab = editData?.activeTab || 'krv';
      const hasTranslations = !!editData?.bookId;

      // 로컬 편집 마킹 — useEffect의 setContent 재호출을 스킵시킴
      lastLocalEditRef.current = { nodeId: selectedNode.id, tab: activeTab, html };

      if (hasTranslations) {
        const updatedTranslations = { ...(editData?.translations || {}), [activeTab]: html };
        onUpdateNode(selectedNode.id, {
          ...editData,
          translations: updatedTranslations,
          ...(activeTab === 'krv' ? { text: html } : {}),
        });
      } else {
        onUpdateNode(selectedNode.id, { ...editData, text: html });
      }
    };
    editor.on('update', handler);
    return () => editor.off('update', handler);
  }, [editor, selectedNode?.id, editData, onUpdateNode]);

  const hasNode = !!selectedNode && !!editData;
  const nodeType = selectedNode?.type || 'verse';
  const fontSize = editData?.fontSize || 13;
  const disabled = !hasNode;

  const update = (patch) => {
    if (!hasNode) return;
    const next = { ...editData, ...patch };
    setEditData(next);
    onUpdateNode(selectedNode.id, next);
  };

  const isActive = (name, attrs) => editor?.isActive(name, attrs) || false;
  const activeTabId = editData?.activeTab || 'krv';
  const canPair = hasNode && !!editData?.bookId && nodeType === 'verse';

  // 태그 추가/삭제
  const addTag = (raw) => {
    const tag = raw.trim();
    if (!tag || !hasNode) return;
    const existing = editData?.bibleTags || [];
    if (existing.includes(tag)) return;
    update({ bibleTags: [...existing, tag] });
  };

  const removeTag = (idx) => {
    if (!hasNode) return;
    update({ bibleTags: (editData?.bibleTags || []).filter((_, i) => i !== idx) });
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    }
  };

  // 장소 연관 인물 검색
  const handleSearchPlacePersons = async () => {
    if (!hasNode || nodeType !== 'place') return;
    const { wikidataId } = editData || {};
    if (!wikidataId) {
      setPlacePersonError('Wikidata 연결 정보가 없습니다.');
      setPlacePersons([]);
      return;
    }
    setPlacePersons('loading');
    setPlacePersonError('');
    try {
      const results = await searchPersonsAtPlace(wikidataId);
      setPlacePersons(results);
      if (results.length === 0) setPlacePersonError('이 장소와 연관된 인물을 찾지 못했습니다.');
    } catch (err) {
      setPlacePersons([]);
      setPlacePersonError('검색 오류: ' + err.message);
    }
  };

  // 동시대 인물 검색
  const handleSearchContemporaries = async () => {
    if (!hasNode || nodeType !== 'person') return;
    const { wikidataId, birthYear, deathYear } = editData || {};
    if (!wikidataId || (birthYear == null && deathYear == null)) {
      setContError('연대 정보가 없어 검색할 수 없습니다.');
      setContemporaries([]);
      return;
    }
    setContemporaries('loading');
    setContError('');
    try {
      const results = await searchContemporaries(wikidataId, birthYear ?? null, deathYear ?? null);
      setContemporaries(results);
      if (results.length === 0) setContError('해당 시대 인물을 찾지 못했습니다.');
    } catch (err) {
      setContemporaries([]);
      setContError('검색 오류: ' + err.message);
    }
  };

  // 교차 참조 검색 (verse 노드 전용)
  const handleFetchCrossRefs = async () => {
    if (!hasNode || nodeType !== 'verse') return;
    const { bookId, chapter, verseStart } = editData || {};
    if (!bookId || chapter == null || verseStart == null) {
      setCrossRefError('구절 정보가 없습니다.');
      setCrossRefs([]);
      return;
    }
    setCrossRefs('loading');
    setCrossRefError('');
    try {
      const results = await fetchCrossRefs(bookId, chapter, verseStart);
      setCrossRefs(results);
      if (results.length === 0) setCrossRefError('교차 참조 구절을 찾지 못했습니다.');
    } catch (err) {
      setCrossRefs([]);
      setCrossRefError('검색 오류: ' + err.message);
    }
  };

  // 병렬 뷰에서 저장 — 세 역본 HTML을 한꺼번에 노드에 반영
  const handleParallelSave = (updatedTranslations) => {
    const merged = { ...(editData?.translations || {}), ...updatedTranslations };
    const nextKrv = merged.krv || editData?.text || '';
    onUpdateNode(selectedNode.id, {
      ...editData,
      translations: merged,
      text: nextKrv,
    });
    // 다음 setContent 재호출 스킵을 위해 마킹
    lastLocalEditRef.current = {
      nodeId: selectedNode.id,
      tab: activeTabId,
      html: merged[activeTabId] || '',
    };
    setParallelOpen(false);
  };
  const isMobile = useMobile();
  const disabledOpacity = disabled ? 0.4 : 1;

  // 모바일: 노드 미선택 시 상단 미니바, 선택 시 하단 편집 시트
  if (isMobile) {
    return (
      <>
        {/* 상단 미니바: undo/redo */}
        <div style={{ ...barStyle, padding: '4px 10px', minHeight: 'unset', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={onUndo} disabled={!canUndo} style={{ ...fmtBtnStyle, opacity: canUndo ? 1 : 0.3, fontSize: 16 }} title="되돌리기">↩</button>
            <button onClick={onRedo} disabled={!canRedo} style={{ ...fmtBtnStyle, opacity: canRedo ? 1 : 0.3, fontSize: 16 }} title="다시 실행">↪</button>
            {hasNode && (
              <>
                <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 2px' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nodeType === 'verse' ? '📖' : nodeType === 'note' ? '📝' : nodeType === 'topic' ? '🏷️' : nodeType === 'person' ? '👤' : nodeType === 'place' ? '📍' : nodeType === 'period' ? '🕰️' : '📖'} {editData?.reference || editData?.title || editData?.name || ''}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>아래 시트에서 편집</span>
              </>
            )}
          </div>
        </div>

        {/* 하단 편집 시트: 노드 선택 시만 표시 */}
        {hasNode && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0,
              zIndex: 1050,
              background: '#fff',
              borderRadius: '16px 16px 0 0',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.18)',
              padding: '12px 16px 20px',
              display: 'flex', flexDirection: 'column', gap: 10,
              maxHeight: '55vh', overflowY: 'auto',
            }}
          >
            {/* 핸들 */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
            </div>

            {/* 참조/제목 입력 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{nodeType === 'verse' ? '📖' : nodeType === 'note' ? '📝' : '🏷️'}</span>
              {(nodeType === 'verse') && (
                <input
                  value={editData?.reference || ''}
                  onChange={(e) => update({ reference: e.target.value })}
                  style={{ ...fieldStyle, flex: 1, fontSize: 13 }}
                  placeholder="구절 참조 (예: 마가복음 1:4)"
                />
              )}
              {(nodeType === 'note' || nodeType === 'topic') && (
                <input
                  value={editData?.title || ''}
                  onChange={(e) => update({ title: e.target.value })}
                  style={{ ...fieldStyle, flex: 1, fontSize: 13 }}
                  placeholder="제목"
                />
              )}
            </div>

            {/* 역본 탭 선택 (verse + bookId 노드만) */}
            {nodeType === 'verse' && editData?.bookId && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>역본:</span>
                {[{ id: 'krv', label: '개역한글' }, { id: 'esv', label: 'ESV' }, { id: 'original', label: '원어' }].map((t) => {
                  const isSel = (editData?.activeTab || 'krv') === t.id;
                  return (
                    <button key={t.id}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => update({ activeTab: t.id })}
                      style={{ padding: '2px 8px', fontSize: 11, border: 'none', borderRadius: 4, cursor: 'pointer', background: isSel ? '#3b82f6' : '#f1f5f9', color: isSel ? '#fff' : '#64748b' }}>
                      {t.label}
                    </button>
                  );
                })}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setParallelOpen(true)}
                  style={{ padding: '2px 10px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', background: '#8b5cf6', color: '#fff' }}>
                  🔤 페어링
                </button>
              </div>
            )}

            {/* 본문 편집기 — 원어 포함 모든 역본 편집 가능 */}
            <div
              style={{ ...editorWrapStyle, maxHeight: 140, fontSize: 13, touchAction: 'auto', userSelect: 'text', WebkitUserSelect: 'text' }}
              className="node-editor-tiptap node-editor-tiptap--mobile"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onClick={() => editor?.chain().focus().run()}
            >
              <EditorContent editor={editor} />
            </div>

            {/* 테두리 색상 (verse) */}
            {nodeType === 'verse' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>테두리색</span>
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    title={c.label}
                    onClick={() => update({ color: c.value })}
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      border: editData?.color === c.value ? '3px solid #1e293b' : '1.5px solid #d1d5db',
                      background: c.value, cursor: 'pointer', padding: 0,
                    }}
                  />
                ))}
              </div>
            )}

            {/* 인물/장소/시대 — 모바일 메모 창 */}
            {(nodeType === 'person' || nodeType === 'place' || nodeType === 'period') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>✏️ 메모 / 추가 데이터</span>
                <textarea
                  value={editData?.notes || ''}
                  onChange={(e) => update({ notes: e.target.value })}
                  placeholder={
                    nodeType === 'person' ? '인물 메모, 연구 노트…'
                    : nodeType === 'place' ? '장소 메모, 고고학적 발견…'
                    : '시대 배경, 주요 사건…'
                  }
                  style={{
                    ...fieldStyle,
                    width: '100%',
                    minHeight: 60,
                    resize: 'vertical',
                    lineHeight: 1.6,
                    fontSize: 12,
                    boxSizing: 'border-box',
                    touchAction: 'auto',
                    WebkitUserSelect: 'text',
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* 글자 크기 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>크기</span>
              <button onClick={() => update({ fontSize: Math.max(9, fontSize - 1) })} style={iconBtnStyle}>A-</button>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', minWidth: 32, textAlign: 'center' }}>{fontSize}px</span>
              <button onClick={() => update({ fontSize: Math.min(50, fontSize + 1) })} style={iconBtnStyle}>A+</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={barStyle}>
      {/* Row 1: tools */}
      <div style={rowStyle}>
        {/* Undo / Redo — always active */}
        <div style={sectionStyle}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            style={{ ...fmtBtnStyle, opacity: canUndo ? 1 : 0.3, fontSize: 15 }}
            title="되돌리기 (Ctrl+Z)"
          >↩</button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            style={{ ...fmtBtnStyle, opacity: canRedo ? 1 : 0.3, fontSize: 15 }}
            title="다시 실행 (Ctrl+Shift+Z)"
          >↪</button>
        </div>

        <div style={dividerStyle} />

        {/* Node type icon + reference/title/name */}
        <div style={{ ...sectionStyle, opacity: disabledOpacity }}>
          <span style={labelStyle}>
            {!hasNode ? '📖'
              : nodeType === 'verse' ? '📖'
              : nodeType === 'note' ? '📝'
              : nodeType === 'topic' ? '🏷️'
              : nodeType === 'person' ? '👤'
              : nodeType === 'place' ? '📍'
              : nodeType === 'period' ? '🕰️'
              : '📖'}
          </span>
          {(!hasNode || nodeType === 'verse') && (
            <input
              value={editData?.reference || ''}
              onChange={(e) => update({ reference: e.target.value })}
              style={{ ...fieldStyle, width: 140, fontWeight: 600 }}
              placeholder="구절 참조"
              disabled={disabled}
            />
          )}
          {hasNode && (nodeType === 'note' || nodeType === 'topic') && (
            <input
              value={editData?.title || ''}
              onChange={(e) => update({ title: e.target.value })}
              style={{ ...fieldStyle, width: 140, fontWeight: 600 }}
              placeholder="제목"
            />
          )}
          {hasNode && (nodeType === 'person' || nodeType === 'place' || nodeType === 'period') && (
            <input
              value={editData?.name || ''}
              onChange={(e) => update({ name: e.target.value })}
              style={{ ...fieldStyle, width: 140, fontWeight: 600 }}
              placeholder="이름"
            />
          )}
        </div>

        <div style={{ ...dividerStyle, opacity: disabledOpacity }} />

        {/* Font size */}
        <div style={{ ...sectionStyle, opacity: disabledOpacity }}>
          <select
            value={fontSize}
            onChange={(e) => update({ fontSize: +e.target.value })}
            style={{ ...selectStyle, width: 58 }}
            disabled={disabled}
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
          <button onClick={() => update({ fontSize: Math.max(9, fontSize - 1) })} style={iconBtnStyle} title="축소" disabled={disabled}>A-</button>
          <button onClick={() => update({ fontSize: Math.min(50, fontSize + 1) })} style={iconBtnStyle} title="확대" disabled={disabled}>A+</button>
        </div>

        <div style={{ ...dividerStyle, opacity: disabledOpacity }} />

        {/* Inline formatting */}
        <div style={sectionStyle}>
          <button
            onMouseDown={(e) => { e.preventDefault(); if (!disabled) editor?.chain().focus().toggleBold().run(); }}
            style={{ ...fmtBtnStyle, fontWeight: 900, ...(isActive('bold') ? activeStyle : {}) }}
            title="굵게 (Ctrl+B)"
          >B</button>
          <button
            onMouseDown={(e) => { e.preventDefault(); if (!disabled) editor?.chain().focus().toggleItalic().run(); }}
            style={{ ...fmtBtnStyle, fontStyle: 'italic', fontFamily: 'Georgia, serif', ...(isActive('italic') ? activeStyle : {}) }}
            title="기울임 (Ctrl+I)"
          >I</button>
          <button
            onMouseDown={(e) => { e.preventDefault(); if (!disabled) editor?.chain().focus().toggleUnderline().run(); }}
            style={{ ...fmtBtnStyle, textDecoration: 'underline', ...(isActive('underline') ? activeStyle : {}) }}
            title="밑줄 (Ctrl+U)"
          >U</button>
          <button
            onMouseDown={(e) => { e.preventDefault(); if (!disabled) editor?.chain().focus().toggleStrike().run(); }}
            style={{ ...fmtBtnStyle, textDecoration: 'line-through', ...(isActive('strike') ? activeStyle : {}) }}
            title="취소선"
          >S</button>
        </div>

        <div style={dividerStyle} />

        {/* Text alignment */}
        <div style={sectionStyle}>
          {[
            { value: 'left', title: '왼쪽' },
            { value: 'center', title: '가운데' },
            { value: 'right', title: '오른쪽' },
          ].map((a) => (
            <button
              key={a.value}
              onMouseDown={(e) => { e.preventDefault(); if (!disabled) editor?.chain().focus().setTextAlign(a.value).run(); }}
              style={{
                ...fmtBtnStyle, width: 26,
                ...(isActive({ textAlign: a.value }) ? activeStyle : {}),
              }}
              title={a.title}
            >
              {a.value === 'left' && <AlignLeftIcon />}
              {a.value === 'center' && <AlignCenterIcon />}
              {a.value === 'right' && <AlignRightIcon />}
            </button>
          ))}
        </div>

        <div style={dividerStyle} />

        {/* Text color */}
        <div style={sectionStyle}>
          <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>글자색</span>
          {TEXT_COLORS.map((c) => (
            <button
              key={c.value}
              title={c.label}
              onMouseDown={(e) => {
                e.preventDefault();
                if (disabled) return;
                if (c.value === '#1e293b') editor?.chain().focus().unsetColor().run();
                else editor?.chain().focus().setColor(c.value).run();
              }}
              style={{
                width: 16, height: 16, borderRadius: '50%',
                border: isActive('textStyle', { color: c.value }) ? '2px solid #1e293b' : '1.5px solid #d1d5db',
                background: c.value, cursor: disabled ? 'default' : 'pointer', padding: 0, flexShrink: 0,
              }}
            />
          ))}
        </div>

        <div style={dividerStyle} />

        {/* Node border color (verse) */}
        {(!hasNode || nodeType === 'verse') && (
          <div style={sectionStyle}>
            <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>테두리</span>
            {COLORS.map((c) => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => update({ color: c.value })}
                disabled={disabled}
                style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: editData?.color === c.value ? '3px solid #1e293b' : '1.5px solid #d1d5db',
                  background: c.value, cursor: disabled ? 'default' : 'pointer', padding: 0, flexShrink: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Row 2: 역본 탭 + 병렬 뷰 트리거 */}
      {hasNode && editData?.bookId && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>편집 역본:</span>
          {[{ id: 'krv', label: '개역한글' }, { id: 'esv', label: 'ESV' }, { id: 'original', label: '원어' }].map((t) => {
            const isActiveTab = (editData?.activeTab || 'krv') === t.id;
            return (
              <button key={t.id}
                style={{
                  padding: '3px 7px', fontSize: 11, border: 'none', borderRadius: 4, cursor: 'pointer',
                  background: isActiveTab ? '#3b82f6' : '#f1f5f9',
                  color: isActiveTab ? '#fff' : '#64748b',
                }}
                onClick={() => update({ activeTab: t.id })}>
                {t.label}
              </button>
            );
          })}

          <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />

          <button
            onClick={() => setParallelOpen(true)}
            disabled={!canPair}
            title="3열 병렬 뷰에서 세 역본 단어를 동시에 색칠·연결"
            style={{
              padding: '3px 10px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4,
              background: canPair ? '#8b5cf6' : '#e2e8f0',
              color: canPair ? '#fff' : '#94a3b8',
              cursor: canPair ? 'pointer' : 'default',
            }}
          >
            🔤 단어 페어링 (병렬 뷰)
          </button>

          <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />

          <button
            onClick={() => {
              if (crossRefs !== null) { setCrossRefs(null); setCrossRefError(''); }
              else handleFetchCrossRefs();
            }}
            disabled={!canPair}
            title="이 구절과 연결된 교차 참조 구절 목록"
            style={{
              padding: '3px 10px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4,
              background: crossRefs !== null ? '#f1f5f9' : (canPair ? '#ecfdf5' : '#e2e8f0'),
              color: crossRefs !== null ? '#64748b' : (canPair ? '#065f46' : '#94a3b8'),
              cursor: canPair ? 'pointer' : 'default',
              borderLeft: canPair && crossRefs === null ? '2px solid #10b981' : 'none',
            }}
          >
            🔗 교차 참조
          </button>
        </div>
      )}

      {/* 교차 참조 결과 패널 */}
      {hasNode && nodeType === 'verse' && editData?.bookId && (
        <>
          {crossRefs === 'loading' && (
            <div style={{ fontSize: 11, color: '#64748b', padding: '4px 8px' }}>🔍 교차 참조 검색 중…</div>
          )}
          {crossRefError && (
            <div style={{ fontSize: 11, color: '#ef4444', padding: '2px 4px' }}>{crossRefError}</div>
          )}
          {Array.isArray(crossRefs) && crossRefs.length > 0 && (
            <div style={{
              border: '1px solid #6ee7b7', borderRadius: 6, background: '#f0fdf4',
              maxHeight: 180, overflowY: 'auto',
            }}>
              {crossRefs.map((ref, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 8px', borderBottom: '1px solid #d1fae5',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#065f46' }}>📖 {ref.reference}</span>
                    <span style={{ fontSize: 9, color: '#6b7280', marginLeft: 6 }}>투표 {ref.votes}</span>
                  </div>
                  <button
                    onClick={() => onAddCrossRef && onAddCrossRef(ref, selectedNode?.id)}
                    style={{
                      padding: '3px 8px', fontSize: 11, fontWeight: 700,
                      background: '#059669', color: '#fff',
                      border: 'none', borderRadius: 4, cursor: 'pointer', flexShrink: 0,
                    }}
                  >+ 추가</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 병렬 뷰 모달 */}
      {parallelOpen && selectedNode && editData?.bookId && (
        <ParallelView
          node={selectedNode}
          onSave={handleParallelSave}
          onClose={() => setParallelOpen(false)}
        />
      )}
      {/* Editor area — verse/note/topic: TipTap 리치 에디터 / person/place/period: 메모 textarea */}
      {(!hasNode || nodeType === 'verse' || nodeType === 'note' || nodeType === 'topic') && (
        <div
          style={{ ...editorWrapStyle, opacity: disabledOpacity, cursor: disabled ? 'default' : 'text' }}
          className="node-editor-tiptap"
        >
          {disabled && (
            <div style={{ color: '#94a3b8', fontSize: 12, padding: '2px 0', userSelect: 'none' }}>
              노드를 클릭하면 여기서 본문을 편집할 수 있습니다
            </div>
          )}
          <div style={{ display: disabled ? 'none' : 'block' }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      )}

      {/* 인물/장소/시대 — 메모 + 태그 + 동시대 인물 */}
      {hasNode && (nodeType === 'person' || nodeType === 'place' || nodeType === 'period') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* 메모 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>✏️ 메모</span>
            <textarea
              value={editData?.notes || ''}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder={
                nodeType === 'person' ? '연구 노트, 신학적 의미, 설교 아이디어…'
                : nodeType === 'place' ? '고고학적 발견, 성경 사건, 현재 지명…'
                : '시대적 배경, 주요 사건, 신학적 의미…'
              }
              style={{
                ...fieldStyle, width: '100%',
                minHeight: 60, maxHeight: 120,
                resize: 'vertical', lineHeight: 1.6, fontSize: 12,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 성경 본문 태그 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>📖 관련 성경 본문 태그</span>
            {/* 기존 태그 */}
            {(editData?.bibleTags || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(editData.bibleTags || []).map((tag, i) => (
                  <span key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    fontSize: 10, fontWeight: 600,
                    background: nodeType === 'person' ? '#dcfce7' : nodeType === 'place' ? '#fef3c7' : '#ede9fe',
                    color: nodeType === 'person' ? '#065f46' : nodeType === 'place' ? '#78350f' : '#3730a3',
                    border: `1px solid ${nodeType === 'person' ? '#6ee7b7' : nodeType === 'place' ? '#fcd34d' : '#c4b5fd'}`,
                    borderRadius: 10, padding: '2px 8px',
                  }}>
                    📖 {tag}
                    <button
                      onClick={() => removeTag(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 10, color: '#9ca3af', lineHeight: 1 }}
                    >×</button>
                  </span>
                ))}
              </div>
            )}
            {/* 태그 입력 */}
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="예: 창세기 12, 출애굽기  (Enter로 추가)"
                style={{ ...fieldStyle, flex: 1, fontSize: 11 }}
              />
              <button
                onClick={() => { addTag(tagInput); setTagInput(''); }}
                style={{
                  ...iconBtnStyle, padding: '3px 8px', fontSize: 11,
                  background: '#f0fdf4', color: '#065f46', border: '1px solid #6ee7b7',
                }}
              >+</button>
            </div>
          </div>

          {/* 관련 인물 (place 전용) */}
          {nodeType === 'place' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => {
                    if (placePersons !== null) { setPlacePersons(null); setPlacePersonError(''); }
                    else handleSearchPlacePersons();
                  }}
                  style={{
                    padding: '4px 10px', fontSize: 11, fontWeight: 700,
                    background: placePersons !== null ? '#f1f5f9' : '#fffbeb',
                    color: placePersons !== null ? '#64748b' : '#b45309',
                    border: `1.5px solid ${placePersons !== null ? '#cbd5e1' : '#fcd34d'}`,
                    borderRadius: 6, cursor: 'pointer',
                  }}
                >
                  👤 관련 인물
                </button>
                {!editData?.wikidataId && (
                  <span style={{ fontSize: 10, color: '#f59e0b' }}>Wikidata 연결 필요</span>
                )}
              </div>

              {placePersons === 'loading' && (
                <div style={{ fontSize: 11, color: '#64748b', padding: '4px 8px' }}>🔍 검색 중…</div>
              )}
              {placePersonError && (
                <div style={{ fontSize: 11, color: '#ef4444', padding: '2px 4px' }}>{placePersonError}</div>
              )}
              {Array.isArray(placePersons) && placePersons.length > 0 && (
                <div style={{
                  border: '1px solid #fcd34d', borderRadius: 6, background: '#fffbeb',
                  maxHeight: 200, overflowY: 'auto',
                }}>
                  {placePersons.map((p) => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 8px', borderBottom: '1px solid #fef3c7',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#78350f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          👤 {p.name}
                        </div>
                        {(p.birthDate || p.deathDate) && (
                          <div style={{ fontSize: 9, color: '#6b7280' }}>
                            {p.birthDate && p.deathDate ? `${p.birthDate} – ${p.deathDate}` : p.birthDate || p.deathDate}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => onAddContemporary && onAddContemporary(p, selectedNode?.id)}
                        style={{
                          padding: '3px 8px', fontSize: 11, fontWeight: 700,
                          background: '#d97706', color: '#fff',
                          border: 'none', borderRadius: 4, cursor: 'pointer', flexShrink: 0,
                        }}
                      >+ 추가</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 동시대 인물 (person 전용) */}
          {nodeType === 'person' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => {
                    if (contemporaries !== null) { setContemporaries(null); setContError(''); }
                    else handleSearchContemporaries();
                  }}
                  style={{
                    padding: '4px 10px', fontSize: 11, fontWeight: 700,
                    background: contemporaries !== null ? '#f1f5f9' : '#eff6ff',
                    color: contemporaries !== null ? '#64748b' : '#1d4ed8',
                    border: `1.5px solid ${contemporaries !== null ? '#cbd5e1' : '#bfdbfe'}`,
                    borderRadius: 6, cursor: 'pointer',
                  }}
                >
                  👥 동시대 인물
                </button>
                {editData?.birthYear != null && (
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>
                    기준: {editData.birthYear < 0 ? `BC ${Math.abs(editData.birthYear)}` : `AD ${editData.birthYear}`} ±150년
                  </span>
                )}
                {!editData?.wikidataId && (
                  <span style={{ fontSize: 10, color: '#f59e0b' }}>Wikidata 연결 필요</span>
                )}
              </div>

              {/* 결과 패널 */}
              {contemporaries === 'loading' && (
                <div style={{ fontSize: 11, color: '#64748b', padding: '4px 8px' }}>🔍 검색 중…</div>
              )}
              {contError && (
                <div style={{ fontSize: 11, color: '#ef4444', padding: '2px 4px' }}>{contError}</div>
              )}
              {Array.isArray(contemporaries) && contemporaries.length > 0 && (
                <div style={{
                  border: '1px solid #bfdbfe', borderRadius: 6, background: '#f8fafc',
                  maxHeight: 200, overflowY: 'auto',
                }}>
                  {contemporaries.map((p) => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 8px', borderBottom: '1px solid #e2e8f0',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          👤 {p.name}
                        </div>
                        {(p.birthDate || p.deathDate) && (
                          <div style={{ fontSize: 9, color: '#6b7280' }}>
                            {p.birthDate && p.deathDate ? `${p.birthDate} – ${p.deathDate}` : p.birthDate || p.deathDate}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => onAddContemporary && onAddContemporary(p, selectedNode?.id)}
                        style={{
                          padding: '3px 8px', fontSize: 11, fontWeight: 700,
                          background: '#059669', color: '#fff',
                          border: 'none', borderRadius: 4, cursor: 'pointer', flexShrink: 0,
                        }}
                      >+ 추가</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Topic keywords (when topic selected) */}
      {hasNode && nodeType === 'topic' && (
        <div style={rowStyle}>
          <input
            value={(editData.keywords || []).join(', ')}
            onChange={(e) =>
              update({ keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean) })
            }
            style={{ ...fieldStyle, flex: 1 }}
            placeholder="키워드 (쉼표 구분)"
          />
        </div>
      )}
    </div>
  );
}

function AlignLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="1" y="2" width="12" height="1.5" rx="0.5" />
      <rect x="1" y="5.5" width="8" height="1.5" rx="0.5" />
      <rect x="1" y="9" width="12" height="1.5" rx="0.5" />
    </svg>
  );
}
function AlignCenterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="1" y="2" width="12" height="1.5" rx="0.5" />
      <rect x="3" y="5.5" width="8" height="1.5" rx="0.5" />
      <rect x="1" y="9" width="12" height="1.5" rx="0.5" />
    </svg>
  );
}
function AlignRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="1" y="2" width="12" height="1.5" rx="0.5" />
      <rect x="5" y="5.5" width="8" height="1.5" rx="0.5" />
      <rect x="1" y="9" width="12" height="1.5" rx="0.5" />
    </svg>
  );
}

const activeStyle = { background: '#3b82f6', color: '#fff' };

const barStyle = {
  position: 'absolute',
  top: 0, left: 0, right: 0,
  zIndex: 25,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  background: '#ffffff',
  borderBottom: '1px solid #e2e8f0',
  padding: '6px 12px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

const rowStyle = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' };
const sectionStyle = { display: 'flex', alignItems: 'center', gap: 3 };
const labelStyle = { fontSize: 14, color: '#475569', flexShrink: 0 };

const fieldStyle = {
  padding: '4px 8px', fontSize: 12, border: '1px solid #cbd5e1',
  borderRadius: 4, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
const selectStyle = {
  padding: '4px 4px', fontSize: 12, border: '1px solid #cbd5e1',
  borderRadius: 4, outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
};
const iconBtnStyle = {
  padding: '3px 6px', fontSize: 11, fontWeight: 700,
  background: '#f1f5f9', color: '#475569',
  border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer',
};
const fmtBtnStyle = {
  width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer',
  padding: 0, background: '#f1f5f9', color: '#475569',
};
const dividerStyle = { width: 1, height: 24, background: '#e2e8f0', flexShrink: 0 };

const editorWrapStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 13,
  lineHeight: 1.6,
  minHeight: 32,
  maxHeight: 100,
  overflowY: 'auto',
  background: '#fff',
};
