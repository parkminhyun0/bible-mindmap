import { useState, useRef, useCallback } from 'react';

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

// ── DOCX 내보내기 (동적 import) ─────────────────────────────────────────
async function downloadDocx(filename, mdText) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');

  const lines = mdText.split('\n');
  const children = [];

  for (const line of lines) {
    if (line.startsWith('# '))      children.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 }));
    else if (line.startsWith('## ')) children.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 }));
    else if (line.startsWith('### '))children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 }));
    else if (line.startsWith('> '))  children.push(new Paragraph({ text: line.slice(2), indent: { left: 720 } }));
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      children.push(new Paragraph({ text: '• ' + line.slice(2) }));
    } else if (/^\d+\. /.test(line)) {
      children.push(new Paragraph({ text: line }));
    } else if (line.trim() === '') {
      children.push(new Paragraph({ text: '' }));
    } else {
      // 인라인 **bold** 처리
      const parts = [];
      let rest = line;
      const bold = /\*\*(.+?)\*\*/g;
      let last = 0; let m;
      while ((m = bold.exec(line)) !== null) {
        if (m.index > last) parts.push(new TextRun(line.slice(last, m.index)));
        parts.push(new TextRun({ text: m[1], bold: true }));
        last = m.index + m[0].length;
      }
      if (last < line.length) parts.push(new TextRun(line.slice(last)));
      children.push(new Paragraph({ children: parts.length ? parts : [new TextRun(line)] }));
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

// ── 설교 구성 → 마크다운 변환 ───────────────────────────────────────────
function sermonToMd(title, scripture, structure, sections) {
  const lines = [];
  if (title) lines.push(`# ${title}`, '');
  if (scripture) lines.push(`**성경 본문:** ${scripture}`, '', '---', '');

  if (structure === '3part') {
    const labels = [['서론', '서론'], ['본론', '본론'], ['결론', '결론']];
    labels.forEach(([key, label], i) => {
      const s = sections[i] || {};
      lines.push(`## ${label}${s.subtitle ? ` — ${s.subtitle}` : ''}`, '');
      if (s.content) lines.push(s.content, '');
    });
  } else {
    const labels = ['발달', '전개', '절정', '결말'];
    labels.forEach((label, i) => {
      const s = sections[i] || {};
      lines.push(`## ${label}${s.subtitle ? ` — ${s.subtitle}` : ''}`, '');
      if (s.content) lines.push(s.content, '');
    });
  }
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

// ── 마크다운 툴바 ────────────────────────────────────────────────────────
function MdToolbar({ areaRef, setter }) {
  const ins = (b, a) => insertMarkdown(areaRef, setter, b, a);
  const inl = (p)    => insertLine(areaRef, setter, p);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '5px 8px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
      <ToolbarBtn label="H1" title="제목 1" onClick={() => inl('# ')} />
      <ToolbarBtn label="H2" title="제목 2" onClick={() => inl('## ')} />
      <ToolbarBtn label="H3" title="제목 3" onClick={() => inl('### ')} />
      <span style={{ width: 1, background: '#e2e8f0', margin: '0 2px' }} />
      <ToolbarBtn label="B"  title="굵게 (**bold**)"    onClick={() => ins('**', '**')} />
      <ToolbarBtn label="I"  title="이탤릭 (*italic*)"  onClick={() => ins('*', '*')} />
      <ToolbarBtn label="~~" title="취소선"             onClick={() => ins('~~', '~~')} />
      <span style={{ width: 1, background: '#e2e8f0', margin: '0 2px' }} />
      <ToolbarBtn label="—"  title="구분선"     onClick={() => insertLine(areaRef, setter, '---\n')} />
      <ToolbarBtn label="• " title="글머리 기호" onClick={() => inl('- ')} />
      <ToolbarBtn label="1." title="번호 목록"   onClick={() => inl('1. ')} />
      <ToolbarBtn label="❝"  title="인용구"      onClick={() => inl('> ')} />
    </div>
  );
}

// ── 섹션 에디터 (설교 구성) ──────────────────────────────────────────────
function SermonSection({ label, data, onChange, color }) {
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
          onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
          style={{
            flex: 1, border: 'none', background: 'rgba(255,255,255,0.2)',
            borderRadius: 4, padding: '2px 8px', fontSize: 11,
            color: '#fff', outline: 'none',
          }}
        />
      </div>
      <MdToolbar areaRef={areaRef} setter={(v) => onChange({ ...data, content: v })} />
      <textarea
        ref={areaRef}
        value={data.content || ''}
        onChange={(e) => onChange({ ...data, content: e.target.value })}
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

// ── 설교 구성 탭 ─────────────────────────────────────────────────────────
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

function SermonTab() {
  const [structure, setStructure] = useState('3part');
  const [docTitle, setDocTitle]   = useState('');
  const [scripture, setScripture] = useState('');
  const [exporting, setExporting] = useState(false);

  const sectionDefs = structure === '3part' ? SERMON_3 : SERMON_4;
  const [sections, setSections]   = useState(sectionDefs.map(() => ({})));

  const updateSection = useCallback((i, val) => {
    setSections((prev) => { const n = [...prev]; n[i] = val; return n; });
  }, []);

  const handleStructure = (v) => {
    if (v === structure) return;
    const newDefs = v === '3part' ? SERMON_3 : SERMON_4;
    setStructure(v);
    setSections(newDefs.map(() => ({})));
  };

  const getMd = () => sermonToMd(docTitle, scripture, structure, sections);
  const fname  = (docTitle || '설교') .replace(/\s+/g, '_');

  const handleDocx = async () => {
    setExporting(true);
    try { await downloadDocx(`${fname}.docx`, getMd()); }
    catch (e) { alert('Word 내보내기 실패: ' + e.message); }
    finally { setExporting(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 헤더 메타 */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input
          placeholder="설교 제목"
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          style={metaInputStyle}
        />
        <input
          placeholder="성경 본문 (예: 요한복음 3:16)"
          value={scripture}
          onChange={(e) => setScripture(e.target.value)}
          style={metaInputStyle}
        />
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {sectionDefs.map((def, i) => (
          <SermonSection
            key={def.label + structure}
            label={def.label}
            color={def.color}
            data={sections[i] || {}}
            onChange={(v) => updateSection(i, v)}
          />
        ))}
      </div>

      {/* 내보내기 */}
      <ExportBar
        onMd={() => downloadMd(`${fname}.md`, getMd())}
        onDocx={handleDocx}
        exporting={exporting}
      />
    </div>
  );
}

// ── 아이디어 스케치 탭 ───────────────────────────────────────────────────
function SketchTab() {
  const [text, setText]       = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [exporting, setExporting] = useState(false);
  const areaRef = useRef(null);

  const fname = (docTitle || '스케치').replace(/\s+/g, '_');

  const handleDocx = async () => {
    setExporting(true);
    const md = docTitle ? `# ${docTitle}\n\n${text}` : text;
    try { await downloadDocx(`${fname}.docx`, md); }
    catch (e) { alert('Word 내보내기 실패: ' + e.message); }
    finally { setExporting(false); }
  };

  const getMd = () => docTitle ? `# ${docTitle}\n\n${text}` : text;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
        <input
          placeholder="문서 제목 (선택)"
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
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
          flex: 1, padding: '12px 14px', border: 'none', resize: 'none',
          fontSize: 13, lineHeight: 1.8, fontFamily: "'D2Coding', 'Fira Code', monospace",
          outline: 'none', color: '#1e293b', background: '#fafafa',
        }}
      />

      <ExportBar
        onMd={() => downloadMd(`${fname}.md`, getMd())}
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

export default function DocPanel({ open, onToggle }) {
  const [activeTab, setActiveTab] = useState('sermon');

  return (
    <>
      {/* 세로 탭 트리거 버튼 */}
      <div
        onClick={onToggle}
        title={open ? '문서 작성 창 닫기' : '문서 작성 창 열기'}
        style={{
          width: 28,
          background: open ? '#1e3a8a' : '#f1f5f9',
          borderLeft: '1px solid #e2e8f0',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 0.2s',
        }}
      >
        <span style={{
          writingMode: 'vertical-rl',
          fontSize: 11,
          fontWeight: 700,
          color: open ? '#fff' : '#64748b',
          letterSpacing: '.05em',
          userSelect: 'none',
          transform: 'rotate(180deg)',
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
        }}>
          {/* 패널 헤더 & 탭 */}
          <div style={{
            padding: '10px 12px 0',
            background: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
          }}>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
              ✍️ 문서 작성
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
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'sermon' ? <SermonTab /> : <SketchTab />}
          </div>
        </div>
      )}
    </>
  );
}
