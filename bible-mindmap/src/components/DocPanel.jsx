import { useState, useRef, useCallback, useEffect } from 'react';
import {
  DOC_ROOT_ID, DOC_ROOT_NAME,
  loadTree, saveTree, findNode, generateDocId,
} from '../utils/storageTree';
import { extractScriptureTags, parseTagInput } from '../utils/sermonTags';

// ── 마크다운 툴바 헬퍼 ──────────────────────────────────────────────────
function insertMarkdown(ref, setter, before, after = '') {
  const el = ref.current;
  if (!el) return;
  const { selectionStart: s, selectionEnd: e, value } = el;
  const selected = value.slice(s, e);
  const inserted = before + selected + after;
  const next = value.slice(0, s) + inserted + value.slice(e);
  setter(next);
  setTimeout(() => {
    el.focus();
    el.setSelectionRange(s + before.length, s + before.length + selected.length);
  }, 0);
}

function insertLine(ref, setter, prefix) {
  const el = ref.current;
  if (!el) return;
  const { selectionStart: s, value } = el;
  const lineStart = value.lastIndexOf('\n', s - 1) + 1;
  const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  setter(next);
  setTimeout(() => { el.focus(); el.setSelectionRange(s + prefix.length, s + prefix.length); }, 0);
}

// ── 마크다운 내보내기 ────────────────────────────────────────────────────
function downloadMd(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// XML 1.0 유효 문자만 남김 — Google Docs · Apple Pages · 일부 뷰어에서
// 문서 렌더링이 잘리는 것을 방지 (제어 문자·미할당 코드포인트 제거).
// XML 1.0 유효: #x9(TAB), #xA(LF), #xD(CR), #x20-#xD7FF, #xE000-#xFFFD, #x10000-#x10FFFF
// eslint-disable-next-line no-control-regex
const XML_INVALID_RX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
function sanitizeXmlText(s) {
  if (typeof s !== 'string') return s;
  return s.replace(XML_INVALID_RX, '');
}

// 인라인 마크업(**bold**, <span style="color:#hex">colored</span>)을 TextRun 배열로 파싱.
// docx는 hex 색상에서 '#' 없이 6자리만 허용.
function parseInlineRuns(TextRun, rawLine, baseStyle = {}) {
  const line = sanitizeXmlText(rawLine);
  const parts = [];
  // 정규식이 (span 태그) 또는 (**bold**) 를 순차적으로 잡음
  const rx = /<span\s+style=["']color:\s*#?([0-9a-fA-F]{6})["']>([\s\S]*?)<\/span>|\*\*(.+?)\*\*/g;
  let last = 0; let m;
  while ((m = rx.exec(line)) !== null) {
    if (m.index > last) parts.push(new TextRun({ text: line.slice(last, m.index), ...baseStyle }));
    if (m[1] !== undefined) {
      // color span: 내부에 **bold**가 있으면 재귀 파싱
      const inner = parseInlineRuns(TextRun, m[2], { ...baseStyle, color: m[1].toUpperCase() });
      parts.push(...inner);
    } else if (m[3] !== undefined) {
      parts.push(new TextRun({ text: m[3], bold: true, ...baseStyle }));
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push(new TextRun({ text: line.slice(last), ...baseStyle }));
  return parts;
}

// ── DOCX 내보내기 (동적 import) ─────────────────────────────────────────
async function downloadDocx(filename, mdText) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

  const lines = mdText.split('\n');
  const children = [];

  for (const line of lines) {
    if (line.startsWith('# '))       children.push(new Paragraph({ children: parseInlineRuns(TextRun, line.slice(2)), heading: HeadingLevel.HEADING_1 }));
    else if (line.startsWith('## ')) children.push(new Paragraph({ children: parseInlineRuns(TextRun, line.slice(3)), heading: HeadingLevel.HEADING_2 }));
    else if (line.startsWith('### '))children.push(new Paragraph({ children: parseInlineRuns(TextRun, line.slice(4)), heading: HeadingLevel.HEADING_3 }));
    else if (line.startsWith('> '))  children.push(new Paragraph({ children: parseInlineRuns(TextRun, line.slice(2)), indent: { left: 720 } }));
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      children.push(new Paragraph({ children: [new TextRun('• '), ...parseInlineRuns(TextRun, line.slice(2))] }));
    } else if (/^\d+\. /.test(line)) {
      children.push(new Paragraph({ children: parseInlineRuns(TextRun, line) }));
    } else if (line.trim() === '') {
      children.push(new Paragraph({ text: '' }));
    } else {
      children.push(new Paragraph({ children: parseInlineRuns(TextRun, line) }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// 태그 배열을 옵시디언 스타일 라인으로 변환 (공백 태그는 하이픈으로)
function formatTagsLine(tags) {
  if (!tags?.length) return '';
  return tags.map((t) => `#${String(t).replace(/\s+/g, '-')}`).join(' ');
}

// ── 설교 구성 → 마크다운 변환 ───────────────────────────────────────────
function sermonToMd(title, scripture, structure, sections, tags) {
  const lines = [];
  if (title) lines.push(`# ${title}`, '');
  if (scripture) lines.push(`**성경 본문:** ${scripture}`, '');
  // 자동 + 수동 태그 병합 후 옵시디언 스타일 태그 라인 추가
  const autoTags = extractScriptureTags(scripture);
  const allTags  = Array.from(new Set([...autoTags, ...(Array.isArray(tags) ? tags : [])]));
  if (allTags.length) lines.push(formatTagsLine(allTags), '');
  if (scripture || allTags.length) lines.push('---', '');

  const labels = structure === '3part'
    ? ['서론', '본론', '결론']
    : ['발달', '전개', '절정', '결말'];

  labels.forEach((label, i) => {
    const s = sections[i] || {};
    lines.push(`## ${label}${s.subtitle ? ` — ${s.subtitle}` : ''}`, '');
    // content 가 문자열이 아니거나 비어 있어도 자리표시자를 남겨 다음 헤더와 붙지 않게 함
    const content = typeof s.content === 'string' ? s.content : '';
    lines.push(content, '');
  });
  return lines.join('\n');
}

// ── 툴바 버튼 ────────────────────────────────────────────────────────────
function ToolbarBtn({ label, title, onClick }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        padding: '3px 7px', fontSize: 11, fontWeight: 700,
        background: '#f1f5f9', border: '1px solid #e2e8f0',
        borderRadius: 5, cursor: 'pointer', color: '#374151',
        lineHeight: 1.2, flexShrink: 0,
      }}
    >{label}</button>
  );
}

// ── 컬러 팔레트 (8색) ────────────────────────────────────────────────────
const TEXT_COLORS = [
  { name: '빨강',  hex: '#dc2626' },
  { name: '주황',  hex: '#ea580c' },
  { name: '노랑',  hex: '#ca8a04' },
  { name: '초록',  hex: '#16a34a' },
  { name: '파랑',  hex: '#2563eb' },
  { name: '남색',  hex: '#1e3a8a' },
  { name: '보라',  hex: '#7c3aed' },
  { name: '회색',  hex: '#6b7280' },
];

function ColorBtn({ hex, name, onClick }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={`글자색: ${name}`}
      style={{
        width: 18, height: 18, padding: 0,
        background: hex, border: '1px solid #cbd5e1',
        borderRadius: 4, cursor: 'pointer', flexShrink: 0,
      }}
    />
  );
}

// 선택 영역을 <span style="color:HEX">...</span> 로 감싸기
function wrapColor(ref, setter, hex) {
  insertMarkdown(ref, setter, `<span style="color:${hex}">`, `</span>`);
}

// 선택 영역에 걸린 color span 을 제거 (커서 지점 기준 가장 가까운 span 제거)
function clearColor(ref, setter) {
  const el = ref.current;
  if (!el) return;
  const { selectionStart: s, selectionEnd: e, value } = el;
  if (s === e) return;
  const before = value.slice(0, s);
  const sel    = value.slice(s, e);
  const after  = value.slice(e);
  // 선택 영역 내부에 span이 있으면 전부 제거
  const stripped = sel.replace(/<span\s+style=["']color:[^"']+["']>|<\/span>/g, '');
  const next = before + stripped + after;
  setter(next);
  setTimeout(() => { el.focus(); el.setSelectionRange(s, s + stripped.length); }, 0);
}

// ── 마크다운 툴바 ────────────────────────────────────────────────────────
function MdToolbar({ areaRef, setter }) {
  const ins = (b, a) => insertMarkdown(areaRef, setter, b, a);
  const inl = (p)    => insertLine(areaRef, setter, p);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '5px 8px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', alignItems: 'center' }}>
      <ToolbarBtn label="H1" title="제목 1" onClick={() => inl('# ')} />
      <ToolbarBtn label="H2" title="제목 2" onClick={() => inl('## ')} />
      <ToolbarBtn label="H3" title="제목 3" onClick={() => inl('### ')} />
      <span style={{ width: 1, background: '#e2e8f0', margin: '0 2px', alignSelf: 'stretch' }} />
      <ToolbarBtn label="B"  title="굵게 (**bold**)"    onClick={() => ins('**', '**')} />
      <ToolbarBtn label="I"  title="이탤릭 (*italic*)"  onClick={() => ins('*', '*')} />
      <ToolbarBtn label="~~" title="취소선"             onClick={() => ins('~~', '~~')} />
      <span style={{ width: 1, background: '#e2e8f0', margin: '0 2px', alignSelf: 'stretch' }} />
      {TEXT_COLORS.map((c) => (
        <ColorBtn key={c.hex} hex={c.hex} name={c.name} onClick={() => wrapColor(areaRef, setter, c.hex)} />
      ))}
      <ToolbarBtn label="↺" title="글자색 제거" onClick={() => clearColor(areaRef, setter)} />
      <span style={{ width: 1, background: '#e2e8f0', margin: '0 2px', alignSelf: 'stretch' }} />
      <ToolbarBtn label="—"  title="구분선"     onClick={() => insertLine(areaRef, setter, '---\n')} />
      <ToolbarBtn label="• " title="글머리 기호" onClick={() => inl('- ')} />
      <ToolbarBtn label="1." title="번호 목록"   onClick={() => inl('1. ')} />
      <ToolbarBtn label="❝"  title="인용구"      onClick={() => inl('> ')} />
    </div>
  );
}

// ── 섹션 에디터 (설교 구성) ──────────────────────────────────────────────
// onFieldChange(field, value): 필드 단위 업데이트 — 부모의 setSections 는
// 항상 최신 sections[i]를 읽어 병합하므로 stale closure 로 인한 데이터 손실 없음.
function SermonSection({ label, data, onFieldChange, color }) {
  const areaRef = useRef(null);
  return (
    <div style={{
      border: `1px solid ${color}40`, borderRadius: 8,
      overflow: 'hidden', marginBottom: 8,
    }}>
      <div style={{ background: color, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>{label}</span>
        <input
          placeholder="소제목 (선택)"
          value={data.subtitle || ''}
          onChange={(e) => onFieldChange('subtitle', e.target.value)}
          style={{
            flex: 1, border: 'none', background: 'rgba(255,255,255,0.2)',
            borderRadius: 4, padding: '2px 8px', fontSize: 11,
            color: '#fff', outline: 'none',
          }}
        />
      </div>
      <MdToolbar areaRef={areaRef} setter={(v) => onFieldChange('content', v)} />
      <textarea
        ref={areaRef}
        value={data.content || ''}
        onChange={(e) => onFieldChange('content', e.target.value)}
        placeholder={`${label} 내용을 입력하세요…`}
        style={{
          width: '100%', minHeight: 90, padding: '8px 10px',
          border: 'none', resize: 'vertical', fontSize: 12,
          lineHeight: 1.7, fontFamily: 'inherit', outline: 'none',
          boxSizing: 'border-box', color: '#1e293b',
        }}
      />
    </div>
  );
}

// ── 설교 구성 상수 ───────────────────────────────────────────────────────
const SERMON_3 = [
  { label: '서론', color: '#3b82f6' },
  { label: '본론', color: '#10b981' },
  { label: '결론', color: '#f59e0b' },
];
const SERMON_4 = [
  { label: '발달', color: '#6366f1' },
  { label: '전개', color: '#3b82f6' },
  { label: '절정', color: '#ef4444' },
  { label: '결말', color: '#10b981' },
];

// ── 설교 구성 탭 (controlled) ─────────────────────────────────────────────
function SermonTab({ structure, setStructure, docTitle, setDocTitle, scripture, setScripture, sections, setSections, tags, setTags, onExportMd, onExportDocx }) {
  const [exporting, setExporting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const sectionDefs = structure === '3part' ? SERMON_3 : SERMON_4;

  // 필드 단위 업데이트 — prev[i] 를 기준으로 병합하므로 다른 필드가 유실되지 않음
  const updateSectionField = useCallback((i, field, value) => {
    setSections((prev) => {
      const n = [...prev];
      n[i] = { ...(n[i] || {}), [field]: value };
      return n;
    });
  }, [setSections]);

  const handleStructure = (v) => {
    if (v === structure) return;
    const newDefs = v === '3part' ? SERMON_3 : SERMON_4;
    setStructure(v);
    setSections(newDefs.map(() => ({})));
  };

  const handleDocx = async () => {
    setExporting(true);
    try { await onExportDocx(); }
    catch (e) { alert('Word 내보내기 실패: ' + e.message); }
    finally { setExporting(false); }
  };

  // 성경 본문에서 자동 추출된 태그
  const autoTags = extractScriptureTags(scripture);
  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));
  const commitTagInput = () => {
    const parsed = parseTagInput(tagInput);
    if (!parsed.length) { setTagInput(''); return; }
    setTags((prev) => Array.from(new Set([...prev, ...parsed])));
    setTagInput('');
  };
  const handleTagKey = (e) => {
    if (e.key === 'Enter' || (e.key === ',' && !e.nativeEvent.isComposing)) {
      e.preventDefault();
      commitTagInput();
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      // 빈 상태에서 백스페이스 → 마지막 태그 제거
      setTags((prev) => prev.slice(0, -1));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* 헤더 메타 */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input
          placeholder="설교 제목"
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          style={metaInputStyle}
        />
        <input
          placeholder="성경 본문 (예: 요한복음 3:16 · 창 1:1-5)"
          value={scripture}
          onChange={(e) => setScripture(e.target.value)}
          style={metaInputStyle}
        />

        {/* 자동 추출 태그 (성경 본문 기반) */}
        {autoTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginRight: 2 }}>자동:</span>
            {autoTags.map((t) => (
              <span key={t} style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 10,
                background: '#dbeafe', color: '#1e40af', fontWeight: 600,
              }}>#{t}</span>
            ))}
          </div>
        )}

        {/* 수동 주제 태그 */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
          padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 7,
          background: '#fff', minHeight: 26,
        }}>
          {tags.map((t) => (
            <span key={t} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 10, padding: '2px 4px 2px 7px', borderRadius: 10,
              background: '#f5f3ff', color: '#6d28d9', fontWeight: 600,
            }}>
              #{t}
              <button
                onClick={() => removeTag(t)}
                title="태그 제거"
                style={{
                  padding: 0, width: 14, height: 14, lineHeight: 1,
                  fontSize: 12, color: '#7c3aed',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                }}
              >×</button>
            </span>
          ))}
          <input
            placeholder={tags.length ? '' : '주제 태그 (Enter 또는 , 로 추가)'}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKey}
            onBlur={commitTagInput}
            style={{
              flex: 1, minWidth: 100, border: 'none', outline: 'none',
              fontSize: 11, padding: '2px 4px', background: 'transparent',
            }}
          />
        </div>

        {/* 구조 선택 */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[['3part', '서론 / 본론 / 결론'], ['4part', '발달 / 전개 / 절정 / 결말']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => handleStructure(v)}
              style={{
                flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600,
                border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer',
                background: structure === v ? '#1e3a8a' : '#f8fafc',
                color: structure === v ? '#fff' : '#64748b',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* 섹션들 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', minHeight: 0 }}>
        {sectionDefs.map((def, i) => (
          <SermonSection
            key={def.label + structure}
            label={def.label}
            color={def.color}
            data={sections[i] || {}}
            onFieldChange={(field, value) => updateSectionField(i, field, value)}
          />
        ))}
      </div>

      {/* 내보내기 */}
      <ExportBar
        onMd={onExportMd}
        onDocx={handleDocx}
        exporting={exporting}
      />
    </div>
  );
}

// ── 아이디어 스케치 탭 (controlled) ─────────────────────────────────────
function SketchTab({ text, setText, docTitle, setSketchTitle, onExportMd, onExportDocx }) {
  const [exporting, setExporting] = useState(false);
  const areaRef = useRef(null);

  const handleDocx = async () => {
    setExporting(true);
    try { await onExportDocx(); }
    catch (e) { alert('Word 내보내기 실패: ' + e.message); }
    finally { setExporting(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
        <input
          placeholder="문서 제목 (선택)"
          value={docTitle}
          onChange={(e) => setSketchTitle(e.target.value)}
          style={metaInputStyle}
        />
      </div>

      <MdToolbar areaRef={areaRef} setter={setText} />

      <textarea
        ref={areaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'마크다운으로 자유롭게 작성하세요.\n\n예)\n# 제목\n## 소제목\n**굵은 글씨**, *이탤릭*\n- 항목 1\n- 항목 2\n> 인용구'}
        style={{
          flex: 1, minHeight: 0, padding: '12px 14px', border: 'none', resize: 'none',
          fontSize: 13, lineHeight: 1.8, fontFamily: "'D2Coding', 'Fira Code', monospace",
          outline: 'none', color: '#1e293b', background: '#fafafa',
        }}
      />

      <ExportBar
        onMd={onExportMd}
        onDocx={handleDocx}
        exporting={exporting}
      />
    </div>
  );
}

// ── 내보내기 바 ──────────────────────────────────────────────────────────
function ExportBar({ onMd, onDocx, exporting }) {
  return (
    <div style={{
      padding: '8px 12px', borderTop: '1px solid #e2e8f0',
      background: '#f8fafc', display: 'flex', gap: 6,
    }}>
      <button onClick={onMd} style={exportBtnStyle('#10b981')}>
        ⬇ Markdown (.md)
      </button>
      <button onClick={onDocx} disabled={exporting} style={exportBtnStyle('#3b82f6')}>
        {exporting ? '생성 중…' : '⬇ Word (.docx)'}
      </button>
    </div>
  );
}

const exportBtnStyle = (color) => ({
  flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 700,
  background: color, color: '#fff', border: 'none', borderRadius: 7,
  cursor: 'pointer',
});

const metaInputStyle = {
  width: '100%', padding: '6px 10px', fontSize: 12,
  border: '1px solid #e2e8f0', borderRadius: 7, outline: 'none',
  background: '#fff', boxSizing: 'border-box',
};

// ── DocPanel 메인 ────────────────────────────────────────────────────────
const TABS = [
  { id: 'sermon', icon: '✝️', label: '설교 구성' },
  { id: 'sketch', icon: '✏️', label: '아이디어 스케치' },
];

export default function DocPanel({ open, onToggle, loadedDoc, onDocSaved }) {
  const [activeTab, setActiveTab] = useState('sermon');
  const [currentDocId, setCurrentDocId] = useState(null);

  // 설교 탭 상태
  const [structure, setStructure]   = useState('3part');
  const [sermonTitle, setSermonTitle] = useState('');
  const [scripture, setScripture]   = useState('');
  const [sections, setSections]     = useState(SERMON_3.map(() => ({})));
  const [tags, setTags]             = useState([]);  // 수동 주제 태그

  // 스케치 탭 상태
  const [sketchTitle, setSketchTitle] = useState('');
  const [sketchText, setSketchText]   = useState('');

  // 편집 중인 최신 상태를 항상 참조할 수 있도록 ref 로 미러링
  // (버튼 클릭 시 IME 조합 중이거나 setState 커밋 전이라도 안전하게 최신값 사용)
  const stateRef = useRef({});
  stateRef.current = {
    sermonTitle, scripture, structure, sections, tags,
    sketchTitle, sketchText,
  };

  // 저장된 문서 불러오기
  useEffect(() => {
    if (!loadedDoc) return;
    const { data } = loadedDoc;
    setCurrentDocId(loadedDoc.id);
    if (data.docType === 'sermon') {
      setActiveTab('sermon');
      setStructure(data.sermon?.structure || '3part');
      setSermonTitle(data.sermon?.title || '');
      setScripture(data.sermon?.scripture || '');
      setSections(data.sermon?.sections || SERMON_3.map(() => ({})));
      setTags(Array.isArray(data.sermon?.tags) ? data.sermon.tags : []);
    } else {
      setActiveTab('sketch');
      setSketchTitle(data.sketch?.title || '');
      setSketchText(data.sketch?.text || '');
    }
  }, [loadedDoc]);

  // 새 문서 초기화
  const handleNewDoc = () => {
    if (currentDocId) {
      if (!confirm('현재 문서를 닫고 새 문서를 작성하시겠습니까?\n저장하지 않은 내용은 사라집니다.')) return;
    }
    setCurrentDocId(null);
    setSermonTitle(''); setScripture('');
    setStructure('3part'); setSections(SERMON_3.map(() => ({})));
    setTags([]);
    setSketchTitle(''); setSketchText('');
  };

  // 저장소에 저장
  const handleStorageSave = () => {
    // 커밋되지 않은 편집 내용이 유실되지 않도록 stateRef 로 최신 상태를 읽음
    const s = stateRef.current;
    const isSermon = activeTab === 'sermon';
    const name = isSermon
      ? (s.sermonTitle || '무제 설교')
      : (s.sketchTitle || '무제 스케치');

    const docData = isSermon
      ? { docType: 'sermon', sermon: { title: s.sermonTitle, scripture: s.scripture, structure: s.structure, sections: s.sections, tags: s.tags } }
      : { docType: 'sketch', sketch: { title: s.sketchTitle, text: s.sketchText } };

    const tree = loadTree();

    if (currentDocId) {
      // 기존 문서 업데이트
      const existing = findNode(tree, currentDocId);
      if (existing) {
        existing.name = name;
        existing.data = docData;
        existing.savedAt = new Date().toISOString();
        saveTree(tree);
        if (onDocSaved) onDocSaved();
        alert(`"${name}" 문서가 저장소에 업데이트되었습니다.`);
        return;
      }
    }

    // 새 문서 추가 — doc-root 폴더에 우선 저장
    const newDoc = {
      id: generateDocId(),
      type: 'doc',
      name,
      data: docData,
      savedAt: new Date().toISOString(),
    };
    const docRoot = findNode(tree, DOC_ROOT_ID);
    if (docRoot) {
      if (!docRoot.children) docRoot.children = [];
      docRoot.children.push(newDoc);
      docRoot.open = true;
    } else {
      if (!tree.children) tree.children = [];
      tree.children.push(newDoc);
    }
    saveTree(tree);
    setCurrentDocId(newDoc.id);
    if (onDocSaved) onDocSaved();
    alert(`"${name}" 문서가 '${DOC_ROOT_NAME}' 폴더에 저장되었습니다.`);
  };

  // ── 내보내기 (stateRef 로 최신 상태 참조) ──────────────────────────────
  const sanitizeName = (n) => (n || '').replace(/\s+/g, '_') || '무제';
  const exportSermonMd = () => {
    const s = stateRef.current;
    const md = sermonToMd(s.sermonTitle, s.scripture, s.structure, s.sections, s.tags);
    downloadMd(`${sanitizeName(s.sermonTitle || '설교')}.md`, md);
  };
  const exportSermonDocx = async () => {
    const s = stateRef.current;
    const md = sermonToMd(s.sermonTitle, s.scripture, s.structure, s.sections, s.tags);
    await downloadDocx(`${sanitizeName(s.sermonTitle || '설교')}.docx`, md);
  };
  const exportSketchMd = () => {
    const s = stateRef.current;
    const md = s.sketchTitle ? `# ${s.sketchTitle}\n\n${s.sketchText}` : s.sketchText;
    downloadMd(`${sanitizeName(s.sketchTitle || '스케치')}.md`, md);
  };
  const exportSketchDocx = async () => {
    const s = stateRef.current;
    const md = s.sketchTitle ? `# ${s.sketchTitle}\n\n${s.sketchText}` : s.sketchText;
    await downloadDocx(`${sanitizeName(s.sketchTitle || '스케치')}.docx`, md);
  };

  return (
    <>
      {/* 세로 탭 트리거 버튼 — 남/보라 톤 */}
      <div
        onClick={onToggle}
        title={open ? '문서 작성 창 닫기' : '문서 작성 창 열기'}
        style={{
          width: 30,
          background: open
            ? 'linear-gradient(180deg, #1e3a8a, #4c1d95)'
            : 'linear-gradient(180deg, #ede9fe, #ddd6fe)',
          borderLeft: '1px solid #c4b5fd',
          borderRight: '1px solid #c4b5fd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 0.2s',
        }}
      >
        <span style={{
          writingMode: 'vertical-lr',
          fontSize: 11,
          fontWeight: 700,
          color: open ? '#fff' : '#5b21b6',
          letterSpacing: '.05em',
          userSelect: 'none',
        }}>
          ✍️ 문서 작성
        </span>
      </div>

      {/* 패널 본문 */}
      {open && (
        <div style={{
          width: 400,
          background: '#fff',
          borderLeft: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {/* 패널 헤더 & 탭 */}
          <div style={{
            padding: '10px 12px 0',
            background: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>✍️ 문서 작성</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {currentDocId && (
                  <span style={{ fontSize: 10, color: '#93c5fd', background: 'rgba(59,130,246,0.2)', padding: '2px 6px', borderRadius: 4 }}>
                    저장됨
                  </span>
                )}
                <button
                  onClick={handleNewDoc}
                  title="새 문서 작성"
                  style={{
                    padding: '5px 8px', fontSize: 11, fontWeight: 700,
                    background: 'rgba(255,255,255,0.12)', color: '#e2e8f0',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 14, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  + 새 문서
                </button>
                <button
                  onClick={handleStorageSave}
                  title="내 저장소 → 설교 문서 작성 폴더에 저장"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 10px', fontSize: 11, fontWeight: 800,
                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                    color: '#fff', border: '2px solid #fca5a5',
                    borderRadius: 20, cursor: 'pointer',
                    boxShadow: '0 0 8px rgba(239,68,68,0.5)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  💾 저장소에 저장
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 700,
                    border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer',
                    background: activeTab === t.id ? '#fff' : 'rgba(255,255,255,0.12)',
                    color: activeTab === t.id ? '#1e3a8a' : 'rgba(255,255,255,0.8)',
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 탭 콘텐츠 */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'sermon' ? (
              <SermonTab
                structure={structure}
                setStructure={setStructure}
                docTitle={sermonTitle}
                setDocTitle={setSermonTitle}
                scripture={scripture}
                setScripture={setScripture}
                sections={sections}
                setSections={setSections}
                tags={tags}
                setTags={setTags}
                onExportMd={exportSermonMd}
                onExportDocx={exportSermonDocx}
              />
            ) : (
              <SketchTab
                text={sketchText}
                setText={setSketchText}
                docTitle={sketchTitle}
                setSketchTitle={setSketchTitle}
                onExportMd={exportSketchMd}
                onExportDocx={exportSketchDocx}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
