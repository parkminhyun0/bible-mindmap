import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useResearchAnnotations from '../research/useResearchAnnotations';
import useMobile from '../hooks/useMobile';

const TYPE_OPTIONS = [
  { id: 'note', icon: '📌', label: '개인 메모', color: '#2563eb' },
  { id: 'highlight', icon: '💡', label: '묵상·강조', color: '#eab308' },
  { id: 'question', icon: '❓', label: '연구 질문', color: '#f97316' },
  { id: 'original-language', icon: '🔤', label: '원어 연구', color: '#7c3aed' },
  { id: 'syntax', icon: '🧩', label: '구문 연구', color: '#0891b2' },
  { id: 'cross-reference', icon: '🔗', label: '교차 참조', color: '#059669' },
  { id: 'sermon', icon: '📝', label: '설교 메모', color: '#be123c' },
];

const TYPE_MAP = Object.fromEntries(TYPE_OPTIONS.map((item) => [item.id, item]));

function getSelectedText(button, selectionRootRef) {
  const selection = window.getSelection?.();
  if (!selection || selection.isCollapsed) return '';
  const text = selection.toString().trim();
  if (!text) return '';
  const range = selection.rangeCount ? selection.getRangeAt(0) : null;
  const root = selectionRootRef?.current || button?.closest?.('[data-annotation-root]');
  if (!range || !root || (!root.contains(range.commonAncestorContainer) && range.commonAncestorContainer !== root)) {
    return '';
  }
  return text.slice(0, 1000);
}

function clampPopover(rect) {
  const width = Math.min(380, window.innerWidth - 24);
  const height = Math.min(520, window.innerHeight - 24);
  return {
    width,
    left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
    top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - height - 12)),
  };
}

export default function PassageAnnotationPin({
  passage,
  referenceLabel,
  translationId = null,
  selectionRootRef = null,
  compact = false,
  showLabel = false,
  label = '개인 주석',
  prominent = false,
}) {
  const isMobile = useMobile();
  const {
    annotationsForPassage,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
  } = useResearchAnnotations();
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const selectionSnapshotRef = useRef('');
  const annotations = annotationsForPassage(passage);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState('note');
  const [content, setContent] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [saving, setSaving] = useState(false);

  const sortedAnnotations = useMemo(
    () => [...annotations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [annotations],
  );
  const icons = [...new Set(annotations.map((item) => TYPE_MAP[item.type]?.icon || '📌'))].slice(0, 3);

  const resetEditor = () => {
    setEditingId(null);
    setType('note');
    setContent('');
    setSelectedText('');
  };

  const openPanel = (event) => {
    event.stopPropagation();
    const rect = buttonRef.current.getBoundingClientRect();
    setSelectedText(selectionSnapshotRef.current || getSelectedText(buttonRef.current, selectionRootRef));
    selectionSnapshotRef.current = '';
    setPosition(clampPopover(rect));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const closeIfOutside = (event) => {
      if (panelRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      setOpen(false);
      resetEditor();
    };
    window.addEventListener('pointerdown', closeIfOutside);
    return () => window.removeEventListener('pointerdown', closeIfOutside);
  }, [open]);

  const edit = (annotation) => {
    setEditingId(annotation.id);
    setType(annotation.type);
    setContent(annotation.content || '');
    setSelectedText(annotation.anchor?.selectedText || '');
  };

  const save = async () => {
    if (!content.trim() && !selectedText.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const current = annotations.find((item) => item.id === editingId);
        if (!current) {
          // 편집 도중 다른 핀/기기에서 삭제된 주석 — 저장 대신 편집 상태만 정리
          setEditingId(null);
          setSaving(false);
          return;
        }
        await updateAnnotation({
          ...current,
          type,
          content: content.trim(),
          color: TYPE_MAP[type]?.color || null,
          anchor: {
            ...current.anchor,
            selectedText: selectedText.trim(),
            translationId: current.anchor?.translationId || translationId,
          },
        });
      } else {
        await createAnnotation({
          type,
          passage,
          content: content.trim(),
          selectedText: selectedText.trim(),
          translationId,
          color: TYPE_MAP[type]?.color || null,
        });
      }
      resetEditor();
    } finally {
      setSaving(false);
    }
  };

  const panel = open && position && createPortal(
    <>
    {isMobile && (
      <div
        className="mobile-annotation-backdrop"
        aria-hidden="true"
        onClick={() => { setOpen(false); resetEditor(); }}
      />
    )}
    <div
      ref={panelRef}
      role="dialog"
      aria-modal={isMobile ? 'true' : 'false'}
      className={isMobile ? 'mobile-annotation-dialog' : undefined}
      aria-label={`${referenceLabel} 개인 주석`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      style={{
        position: 'fixed',
        left: isMobile ? 0 : position.left,
        right: isMobile ? 0 : undefined,
        top: isMobile ? 'auto' : position.top,
        bottom: isMobile ? 0 : undefined,
        zIndex: 5000,
        width: isMobile ? '100%' : position.width,
        maxHeight: isMobile ? '88dvh' : 'min(520px, calc(100vh - 24px))',
        overflow: 'auto',
        padding: isMobile
          ? '14px 16px calc(env(safe-area-inset-bottom, 0px) + 18px)'
          : 12,
        border: '1px solid #bfdbfe',
        borderRadius: isMobile ? '20px 20px 0 0' : 14,
        background: '#fff',
        boxShadow: '0 18px 52px rgba(15,23,42,.28)',
        color: '#1e293b',
        fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <strong style={{ flex: 1, fontSize: isMobile ? 16 : 13 }}>📌 {referenceLabel} 개인 주석</strong>
        <button
          type="button"
          onClick={() => { setOpen(false); resetEditor(); }}
          aria-label="주석 닫기"
          style={{ border: 'none', background: '#f1f5f9', borderRadius: 9, width: isMobile ? 44 : 26, height: isMobile ? 44 : 26, cursor: 'pointer' }}
        >×</button>
      </div>

      {selectedText && (
        <div style={{
          marginBottom: 9, padding: '7px 9px', borderRadius: 8,
          background: '#fef9c3', borderLeft: '3px solid #eab308',
          fontSize: 11, lineHeight: 1.5,
        }}>
          <b>선택 문구</b><br />“{selectedText}”
        </div>
      )}

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        {TYPE_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.id}
            onClick={() => setType(option.id)}
            title={option.label}
            style={{
              padding: isMobile ? '8px 10px' : '4px 7px', borderRadius: 7, cursor: 'pointer', fontSize: isMobile ? 13 : 11,
              minHeight: isMobile ? 42 : undefined,
              border: `1px solid ${type === option.id ? option.color : '#e2e8f0'}`,
              background: type === option.id ? `${option.color}14` : '#fff',
              color: type === option.id ? option.color : '#64748b',
              fontWeight: type === option.id ? 800 : 500,
            }}
          >
            {option.icon} {option.label}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="묵상, 해석, 질문, 설교 아이디어를 기록하세요."
        rows={4}
        autoFocus={!isMobile}
        style={{
          width: '100%', boxSizing: 'border-box', resize: 'vertical',
          padding: 9, border: '1px solid #cbd5e1', borderRadius: 8,
          font: 'inherit', fontSize: isMobile ? 16 : 12, lineHeight: 1.55,
          minHeight: isMobile ? 120 : undefined,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 7 }}>
        {editingId && (
          <button type="button" onClick={resetEditor} style={{ padding: '5px 9px', minHeight: isMobile ? 44 : undefined }}>취소</button>
        )}
        <button
          type="button"
          disabled={saving || (!content.trim() && !selectedText.trim())}
          onClick={save}
          style={{
            padding: '6px 12px', border: 'none', borderRadius: 7,
            minHeight: isMobile ? 48 : undefined,
            background: '#2563eb', color: '#fff', fontWeight: 800,
            cursor: saving ? 'wait' : 'pointer', opacity: saving ? .6 : 1,
          }}
        >
          {saving ? '저장 중…' : editingId ? '수정 저장' : '주석 저장'}
        </button>
      </div>

      {sortedAnnotations.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 6 }}>
            저장된 주석 {sortedAnnotations.length}개
          </div>
          {sortedAnnotations.map((annotation) => {
            const meta = TYPE_MAP[annotation.type] || TYPE_MAP.note;
            return (
              <div
                key={annotation.id}
                style={{
                  padding: 8, marginBottom: 6, borderRadius: 9,
                  background: `${annotation.color || meta.color}0d`,
                  borderLeft: `3px solid ${annotation.color || meta.color}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <b style={{ flex: 1, fontSize: 11 }}>{meta.icon} {meta.label}</b>
                  <button type="button" onClick={() => edit(annotation)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>수정</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('이 개인 주석을 삭제할까요?')) {
                        deleteAnnotation(annotation.id);
                      }
                    }}
                    style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}
                  >삭제</button>
                </div>
                {annotation.anchor?.selectedText && (
                  <div style={{ marginTop: 4, color: '#92400e', fontSize: 10 }}>
                    “{annotation.anchor.selectedText}”
                  </div>
                )}
                <div style={{ marginTop: 3, color: '#94a3b8', fontSize: 9 }}>
                  {annotation.anchor?.chapter}:{annotation.anchor?.verseStart}
                  {annotation.anchor?.verseEnd !== annotation.anchor?.verseStart
                    ? `-${annotation.anchor?.verseEnd}`
                    : ''}
                  {annotation.anchor?.translationId ? ` · ${annotation.anchor.translationId}` : ''}
                </div>
                {annotation.content && (
                  <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.5 }}>
                    {annotation.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    </>,
    document.body,
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="nodrag nopan"
        onPointerDown={(event) => {
          selectionSnapshotRef.current = getSelectedText(buttonRef.current, selectionRootRef);
          event.stopPropagation();
        }}
        onClick={openPanel}
        title={annotations.length ? `개인 주석 ${annotations.length}개` : '개인 주석 추가'}
        aria-label={`${referenceLabel} 개인 주석 ${annotations.length ? `${annotations.length}개` : '추가'}`}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2,
          minWidth: isMobile ? 44 : (compact ? 24 : 30),
          height: isMobile ? 44 : (prominent ? 28 : (compact ? 24 : 26)),
          padding: compact ? '0 5px' : '0 9px',
          border: prominent
            ? '1px solid #f59e0b'
            : (annotations.length ? '1px solid #93c5fd' : '1px dashed #94a3b8'),
          borderRadius: 14,
          background: prominent ? '#fff7d6' : (annotations.length ? '#eff6ff' : '#fff'),
          color: prominent ? '#92400e' : (annotations.length ? '#1d4ed8' : '#475569'),
          cursor: 'pointer', fontSize: compact ? 10 : 11, fontWeight: 800,
          boxShadow: prominent
            ? '0 2px 7px rgba(146,64,14,.18)'
            : (annotations.length ? '0 1px 4px rgba(37,99,235,.15)' : 'none'),
          whiteSpace: 'nowrap',
        }}
      >
        <span>{icons.length ? icons.join('') : '📌'}</span>
        {showLabel && <span>{label}</span>}
        {annotations.length > 0 && <span>{annotations.length}</span>}
      </button>
      {panel}
    </>
  );
}
