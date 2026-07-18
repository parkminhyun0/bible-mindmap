import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';

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

const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20, 24, 28];

export default function NodeEditor({ selectedNode, onUpdateNode, onUndo, onRedo, canUndo, canRedo }) {
  const [editData, setEditData] = useState(null);
  const [, setTick] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
    onUpdate: ({ editor: ed }) => {
      setTick((t) => t + 1);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (selectedNode) {
      const newData = { ...selectedNode.data };
      setEditData(newData);
      const html = newData.text || '';
      if (editor.getHTML() !== html) {
        editor.commands.setContent(html);
      }
    } else {
      setEditData(null);
      editor.commands.setContent('');
    }
  }, [selectedNode?.id, editor]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if (!selectedNode) return;
      const html = editor.getHTML();
      onUpdateNode(selectedNode.id, { ...editData, text: html });
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

  const disabledOpacity = disabled ? 0.4 : 1;

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

        {/* Node type icon + reference/title */}
        <div style={{ ...sectionStyle, opacity: disabledOpacity }}>
          <span style={labelStyle}>
            {hasNode
              ? nodeType === 'verse' ? '📖' : nodeType === 'note' ? '📝' : '🏷️'
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
          <button onClick={() => update({ fontSize: Math.min(28, fontSize + 1) })} style={iconBtnStyle} title="확대" disabled={disabled}>A+</button>
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
                if (c.value === '#1e293b') {
                  editor?.chain().focus().unsetColor().run();
                } else {
                  editor?.chain().focus().setColor(c.value).run();
                }
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

      {/* Row 2: TipTap editor — always visible */}
      <div
        style={{
          ...editorWrapStyle,
          opacity: disabledOpacity,
          cursor: disabled ? 'default' : 'text',
        }}
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
  zIndex: 10,
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
