import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { loadChapterLexicon, humanizeMorph } from '../utils/lexicon';
import useMobile from '../hooks/useMobile';
import { fetchVerse } from '../api/bibleApi';
import { ALL_BOOKS } from '../data/bibleBooks';
import { buildPhraseTree, analyzeClause, getNodeColor } from '../utils/phraseMarker';
import { isOT } from '../data/bibleBooks';
import LexiconPopup from './LexiconPopup';

// ── 트리 레이아웃 상수 ──────────────────────────────────────────────────────
// LEAF_W·LEVEL_H 는 글자 크기에 따라 ParseTreeSVG 내부에서 동적으로 계산
const NODE_R  = 18;

function countLeaves(node) {
  return node.children.length === 0 ? 1 : node.children.reduce((s, c) => s + countLeaves(c), 0);
}
function treeDepth(node) {
  return node.children.length === 0 ? 1 : 1 + Math.max(...node.children.map(treeDepth));
}
function assignXY(node, x0, width, y, levelH) {
  node.x = x0 + width / 2;
  node.y = y;
  if (!node.children.length) return;
  const lc = node.children.map(countLeaves);
  const total = lc.reduce((s, n) => s + n, 0);
  let cx = x0;
  node.children.forEach((child, i) => {
    const cw = (lc[i] / total) * width;
    assignXY(child, cx, cw, y + levelH, levelH);
    cx += cw;
  });
}
function* walkNodes(n) { yield n; for (const c of n.children) yield* walkNodes(c); }
function* walkEdges(n) { for (const c of n.children) { yield { from: n, to: c }; yield* walkEdges(c); } }
function getLeaves(node, acc = []) {
  if (!node.children.length) acc.push(node);
  else node.children.forEach(c => getLeaves(c, acc));
  return acc;
}


// ── SVG 트리 ──────────────────────────────────────────────────────────────
function ParseTreeSVG({ tree, koText, sizes, onWordClick }) {
  const laid = useMemo(() => {
    if (!tree) return null;
    const copy = JSON.parse(JSON.stringify(tree));
    const PADDING = 24;
    // 글자 크기에 비례해 리프 폭·레벨 간격 자동 조정 → 단어 겹침 방지
    const leafW  = Math.max(90, sizes.heb * 5.2 + sizes.eng * 2.5);
    const levelH = Math.max(76, NODE_R * 2 + sizes.label * 1.5 + 24);
    const nLeaves = countLeaves(copy);
    const depth   = treeDepth(copy);
    const svgW = Math.max(320, nLeaves * leafW) + PADDING * 2;
    const svgH = 26 + (depth - 1) * levelH
      + NODE_R + 6 + sizes.heb
      + 6 + Math.ceil(sizes.eng * 1.4)
      + 14;
    assignXY(copy, PADDING, svgW - PADDING * 2, 26, levelH);
    return { tree: copy, svgW, svgH };
  }, [tree, sizes.heb, sizes.eng, sizes.label]);

  if (!laid) return null;
  const { tree: t, svgW, svgH } = laid;
  const allNodes = [...walkNodes(t)];
  const allEdges = [...walkEdges(t)];

  return (
    <svg width={svgW} height={svgH} style={{ display: 'block', minWidth: svgW }}>
      {allEdges.map((e, i) => (
        <line key={i}
          x1={e.from.x} y1={e.from.y + NODE_R}
          x2={e.to.x}   y2={e.to.y - NODE_R}
          stroke="#94a3b8" strokeWidth={1.5} strokeLinecap="round"
        />
      ))}
      {allNodes.map((node, i) => {
        const col    = getNodeColor(node.label);
        const isLeaf = node.children.length === 0;
        const word   = node.word;
        const hw = word ? (word.w || '').replace(/\//g, '') : '';
        const isGreekWord = word?.s?.startsWith('G');

        const leafBaseY = node.y + NODE_R;

        return (
          <g key={i}>
            <circle cx={node.x} cy={node.y} r={NODE_R}
              fill={col.fill} stroke={col.stroke} strokeWidth={isLeaf ? 1.5 : 2} />
            <text x={node.x} y={node.y + (isLeaf ? 4 : 5)}
              textAnchor="middle"
              fontSize={sizes.label}
              fontWeight="bold" fill={col.text}
              style={{ userSelect: 'none' }}>
              {node.label}
            </text>

            {isLeaf && word && (
              <>
                {/* 원어 단어 — 클릭 시 어형·사전·용례 팝업 */}
                <text
                  x={node.x} y={leafBaseY + 6 + sizes.heb}
                  textAnchor="middle"
                  fontSize={sizes.heb}
                  fontFamily={isGreekWord
                    ? '"SBL BibLit", "Palatino Linotype", Palatino, "Times New Roman", serif'
                    : '"Ezra SIL", "SBL BibLit", "SBL Hebrew", serif'}
                  fill="#1e293b"
                  textDecoration="underline"
                  style={{ cursor: 'pointer', textDecorationStyle: 'dotted', textDecorationColor: '#8b5cf6' }}
                  onClick={(ev) => {
                    const r = ev.currentTarget.getBoundingClientRect();
                    onWordClick(word, { x: r.left + r.width / 2, y: r.bottom + 6 });
                  }}
                  onMouseEnter={ev => ev.currentTarget.setAttribute('fill', col.stroke)}
                  onMouseLeave={ev => ev.currentTarget.setAttribute('fill', '#1e293b')}
                >
                  <title>{`${word.tr || ''} · ${word.g || ''} · ${word.s || ''}`}</title>
                  {hw}
                </text>

                {/* 영어 대응 단어 — 클릭 시 동일 팝업 */}
                {word.g && sizes.eng >= 8 && (
                  <text x={node.x}
                    y={leafBaseY + 6 + sizes.heb + 6 + sizes.eng}
                    textAnchor="middle" fontSize={sizes.eng}
                    fontStyle="italic" fill="#7c3aed"
                    style={{ cursor: 'pointer' }}
                    onClick={(ev) => {
                      const r = ev.currentTarget.getBoundingClientRect();
                      onWordClick(word, { x: r.left + r.width / 2, y: r.bottom + 6 });
                    }}
                    onMouseEnter={ev => ev.currentTarget.setAttribute('fill', '#4c1d95')}
                    onMouseLeave={ev => ev.currentTarget.setAttribute('fill', '#7c3aed')}
                  >
                    {word.g}
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── 트리 카드 (절 단위) ────────────────────────────────────────────────────
function VerseTreeCard({ data, sizes, onWordClick }) {
  const tree = useMemo(() => buildPhraseTree(data.words), [data.words]);
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap',
        padding: '6px 0 8px', borderBottom: '1px dashed #d1fae5', marginBottom: 10 }}>
        <span style={{ fontSize: sizes.label, fontWeight: 800, color: '#059669', flexShrink: 0 }}>{data.ref}</span>
        <span style={{ fontSize: sizes.ko, color: '#475569', lineHeight: 1.7 }}>{data.ko || '(본문 없음)'}</span>
      </div>
      {tree ? (
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
          <ParseTreeSVG tree={tree} koText={data.ko} sizes={sizes} onWordClick={onWordClick} />
        </div>
      ) : (
        <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>원어 데이터 없음</span>
      )}
    </div>
  );
}

// ── 장 흐름 뷰 ─────────────────────────────────────────────────────────────
// 주어 색상 팔레트 (반복 주어 추적)
const SUBJ_COLORS = [
  { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
  { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
  { bg: '#fef3c7', border: '#d97706', text: '#92400e' },
  { bg: '#fce7f3', border: '#db2777', text: '#831843' },
  { bg: '#e0e7ff', border: '#4f46e5', text: '#312e81' },
  { bg: '#f3e8ff', border: '#9333ea', text: '#581c87' },
  { bg: '#ffedd5', border: '#ea580c', text: '#7c2d12' },
];

// 열별 색상·셀 배경 정의
const FLOW_COLS = [
  {
    label: '주어 (Subject)',         chip: null,
    cellBg: '#f0f9ff', cellBorder: '1px dotted #7dd3fc',
    swatchDesc: '주어 — 행위자 추적 (같은 색 = 같은 행위자)',
  },
  {
    label: '동사 (Predicate)',       chip: { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
    cellBg: '#f0fdf4', cellBorder: '1px dotted #86efac',
    swatchDesc: '동사 — 절의 핵심 행위·서술어',
  },
  {
    label: '목적어 (Object)',        chip: { bg: '#e0e7ff', border: '#4f46e5', text: '#312e81' },
    cellBg: '#eef2ff', cellBorder: '1px dotted #a5b4fc',
    swatchDesc: '목적어 — 동사가 향하는 대상',
  },
  {
    label: '보어·장소 (Complement)', chip: { bg: '#fef9c3', border: '#ca8a04', text: '#78350f' },
    cellBg: '#fefce8', cellBorder: 'none',
    swatchDesc: '보어·장소 — 시간·장소·방식 등 부가 정보',
  },
];

function FlowView({ verses, sizes, onWordClick, isHebrew }) {
  const subjColorMap = useMemo(() => {
    const map = {};
    let next = 0;
    verses.forEach(v => {
      const cl = analyzeClause(v.words);
      if (cl?.subject?.heb) {
        const key = cl.subject.heb;
        if (!(key in map)) map[key] = next++ % SUBJ_COLORS.length;
      }
    });
    return map;
  }, [verses]);

  return (
    <div>
      {/* ── 설명 + 색상 범례 ── */}
      <div style={{
        padding: '8px 12px 6px', background: '#f0fdf4', borderBottom: '1px solid #d1fae5',
      }}>
        <div style={{ fontSize: sizes.desc, color: '#065f46', lineHeight: 1.7, marginBottom: 8 }}>
          {isHebrew ? (
            <>
              <b>문장 구조 한눈에 보기 (히브리어)</b> — 히브리어 원문의 각 절을 <b>"누가 / 어떻게 했다 / 무엇을 / 어디서"</b>로 나눠서 보여줍니다.<br />
              <span style={{ color: '#6b7280', fontSize: Math.max(sizes.desc - 2, 9) }}>
                히브리어는 보통 <b>동사가 먼저</b> 나오고 그다음 주어가 나오는 어순(VSO)입니다.
                동사 형태 안에 인칭·수·성별 정보가 포함되어 있어, 주어 없이도 "누가"를 알 수 있을 때가 많아요.
                단어 칩을 클릭하면 원어 사전과 문법 정보가 열립니다.
              </span>
            </>
          ) : (
            <>
              <b>문장 구조 한눈에 보기 (헬라어)</b> — 헬라어 원문의 각 절을 <b>"누가 / 어떻게 했다 / 무엇을 / 어디서"</b>로 나눠서 보여줍니다.<br />
              <span style={{ color: '#6b7280', fontSize: Math.max(sizes.desc - 2, 9) }}>
                헬라어는 <b>어미 변화(격 변화)</b>로 주어·목적어를 구분하기 때문에 어순이 비교적 자유롭습니다.
                관사(the)가 명사 앞에 붙어 명사구를 표시해줘요.
                단어 칩을 클릭하면 원어 사전과 문법 정보가 열립니다.
              </span>
            </>
          )}
        </div>
        {/* 색상 범례 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>

          {/* 주어 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>
                {SUBJ_COLORS.slice(0, 5).map((sc, si) => (
                  <span key={si} style={{
                    display: 'inline-block', width: sizes.desc * 0.5, height: sizes.desc * 0.9, borderRadius: 2,
                    background: sc.bg, border: `1.5px solid ${sc.border}`,
                  }} />
                ))}
              </span>
              <span style={{ fontSize: sizes.desc, fontWeight: 700, color: '#1e3a8a' }}>누가? (주어)</span>
            </div>
            <span style={{ fontSize: Math.max(sizes.desc - 3, 8), color: '#6b7280', paddingLeft: 2, lineHeight: 1.6 }}>
              이 절에서 행동하는 사람·대상입니다.<br />
              색이 여러 가지인 이유 → 단락 안에 여러 인물이 등장하기 때문이에요.<br />
              <b>같은 색 = 같은 인물</b>이 다시 등장했다는 표시입니다.<br />
              테두리가 점선인 칩 → 원어 동사 형태로 인물을 추측한 경우예요.
            </span>
          </div>

          <div style={{ width: 1, background: '#d1fae5', alignSelf: 'stretch' }} />

          {/* 동사 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-block',
                width: sizes.desc * 0.75, height: sizes.desc * 0.75, borderRadius: 2, flexShrink: 0,
                background: '#dcfce7', border: '1.5px solid #16a34a',
              }} />
              <span style={{ fontSize: sizes.desc, fontWeight: 700, color: '#14532d' }}>어떻게 했다? (동사)</span>
            </div>
            <span style={{ fontSize: Math.max(sizes.desc - 3, 8), color: '#6b7280', paddingLeft: 2, lineHeight: 1.6 }}>
              문장의 핵심 행동·상태 단어입니다.<br />
              예) "갔다", "말했다", "있었다"
            </span>
          </div>

          <div style={{ width: 1, background: '#d1fae5', alignSelf: 'stretch' }} />

          {/* 목적어 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-block',
                width: sizes.desc * 0.75, height: sizes.desc * 0.75, borderRadius: 2, flexShrink: 0,
                background: '#e0e7ff', border: '1.5px solid #4f46e5',
              }} />
              <span style={{ fontSize: sizes.desc, fontWeight: 700, color: '#312e81' }}>무엇을? (목적어)</span>
            </div>
            <span style={{ fontSize: Math.max(sizes.desc - 3, 8), color: '#6b7280', paddingLeft: 2, lineHeight: 1.6 }}>
              동사의 행동을 받는 대상입니다.<br />
              예) "땅을", "아들을", "떡을"
            </span>
          </div>

          <div style={{ width: 1, background: '#d1fae5', alignSelf: 'stretch' }} />

          {/* 보어·장소 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-block',
                width: sizes.desc * 0.75, height: sizes.desc * 0.75, borderRadius: 2, flexShrink: 0,
                background: '#fef9c3', border: '1.5px solid #ca8a04',
              }} />
              <span style={{ fontSize: sizes.desc, fontWeight: 700, color: '#78350f' }}>어디서·어떻게? (보어·장소)</span>
            </div>
            <span style={{ fontSize: Math.max(sizes.desc - 3, 8), color: '#6b7280', paddingLeft: 2, lineHeight: 1.6 }}>
              장소, 시간, 방법 같은 추가 정보입니다.<br />
              예) "모압 땅에서", "그 시절에"
            </span>
          </div>

        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        {/* ── 열 헤더 ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '44px 1fr 1fr 1fr 1fr',
          background: '#065f46',
        }}>
          <div style={{ padding: '7px 4px', textAlign: 'center', borderRight: '1px solid #047857' }}>
            <span style={{ fontSize: sizes.desc, fontWeight: 700, color: '#d1fae5' }}>절</span>
          </div>
          {FLOW_COLS.map((col, i) => (
            <div key={i} style={{
              padding: '7px 10px',
              borderRight: i < FLOW_COLS.length - 1 ? '1px solid #047857' : 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {col.chip ? (
                <span style={{
                  display: 'inline-block',
                  width: sizes.desc * 0.65, height: sizes.desc * 0.65,
                  borderRadius: 2, flexShrink: 0,
                  background: col.chip.bg, border: `1.5px solid ${col.chip.border}`,
                }} />
              ) : (
                <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>
                  {SUBJ_COLORS.slice(0, 4).map((sc, si) => (
                    <span key={si} style={{
                      display: 'inline-block',
                      width: sizes.desc * 0.35, height: sizes.desc * 0.65,
                      borderRadius: 1,
                      background: sc.bg, border: `1px solid ${sc.border}`,
                    }} />
                  ))}
                </span>
              )}
              <span style={{ fontSize: sizes.desc, fontWeight: 700, color: '#d1fae5' }}>
                {col.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── 데이터 행 ── */}
        {verses.map((v, rowIdx) => {
          const cl = analyzeClause(v.words);
          if (!cl) return null;
          const subjKey   = cl.subject?.heb || '';
          const subjColor = subjKey in subjColorMap ? SUBJ_COLORS[subjColorMap[subjKey]] : null;
          const isEven    = rowIdx % 2 === 0;
          const rowBg     = isEven ? '#f8fafc' : '#fff';

          return (
            <div key={v.verse}>
              <div style={{
                display: 'grid', gridTemplateColumns: '44px 1fr 1fr 1fr 1fr',
                borderBottom: '1px solid #e2e8f0',
              }}>
                {/* 절 번호 */}
                <div style={{
                  padding: '8px 4px', textAlign: 'center',
                  background: rowBg, borderRight: '1px solid #d1fae5',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: sizes.label, fontWeight: 800, color: '#059669' }}>{v.ref}</span>
                </div>

                {/* 주어 */}
                <FlowCell color={subjColor} sizes={sizes} onWordClick={onWordClick}
                  entries={cl.subject?.entries || []}
                  note={!cl.subject && cl.impliedPGN ? `← ${cl.impliedPGN} (암시)` : ''}
                  implied={!cl.subject}
                  cellBg={FLOW_COLS[0].cellBg} cellBorder={FLOW_COLS[0].cellBorder}
                />

                {/* 동사 */}
                <FlowCell
                  color={FLOW_COLS[1].chip} sizes={sizes} onWordClick={onWordClick}
                  entries={cl.verb?.entry ? [cl.verb.entry] : []}
                  note={cl.verb?.pgn || ''}
                  cellBg={FLOW_COLS[1].cellBg} cellBorder={FLOW_COLS[1].cellBorder}
                />

                {/* 목적어 */}
                <FlowCell
                  color={FLOW_COLS[2].chip} sizes={sizes} onWordClick={onWordClick}
                  entries={cl.objects.flatMap(o => o.entries || [])}
                  cellBg={FLOW_COLS[2].cellBg} cellBorder={FLOW_COLS[2].cellBorder}
                />

                {/* 보어/장소 */}
                <FlowCell
                  color={FLOW_COLS[3].chip} sizes={sizes} onWordClick={onWordClick}
                  entries={cl.complements.flatMap(c => c.entries || [])}
                  cellBg={FLOW_COLS[3].cellBg} cellBorder={FLOW_COLS[3].cellBorder}
                />
              </div>

              {/* 한글 번역 */}
              <div style={{
                padding: '3px 8px 5px 52px',
                background: isEven ? '#f0fdf4' : '#f8fafc',
                borderBottom: '1px solid #d1fae5',
                fontSize: sizes.ko, color: '#475569', lineHeight: 1.6,
              }}>
                {v.ko}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// entries: 원본 word 배열 [{w, tr, s, m, l, g, ...}]
// implied: 암시된 주어 (동사 PGN에서 유추)
// note: PGN 등 보조 텍스트
function FlowCell({ color, sizes, entries, note, implied, onWordClick, cellBg, cellBorder }) {
  const hasEntries = entries && entries.length > 0;
  const cellStyle = {
    background: cellBg || 'transparent',
    borderRight: cellBorder || 'none',
  };
  if (!hasEntries && !note) {
    return (
      <div style={{ padding: '8px', ...cellStyle }}>
        <span style={{ color: '#cbd5e1', fontSize: sizes.label }}>—</span>
      </div>
    );
  }
  const col = color || { bg: 'transparent', border: '#e2e8f0', text: '#475569' };

  return (
    <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 3, ...cellStyle }}>
      {hasEntries && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {entries.map((entry, i) => {
            const hw = (entry.w || '').replace(/\//g, '');
            const isGreek = entry.s?.startsWith('G');
            return (
              <div key={i}
                title={`${entry.tr || ''} · ${entry.g || ''} · ${entry.s || ''}`}
                onClick={(ev) => {
                  const r = ev.currentTarget.getBoundingClientRect();
                  onWordClick(entry, { x: r.left + r.width / 2, y: r.bottom + 6 });
                }}
                style={{
                  display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                  direction: isGreek ? 'ltr' : 'rtl',
                  fontFamily: isGreek
                    ? '"SBL BibLit", "Palatino Linotype", Palatino, "Times New Roman", serif'
                    : '"Ezra SIL", "SBL BibLit", serif',
                  fontSize: sizes.heb * 0.85,
                  padding: '2px 7px 4px', borderRadius: 5,
                  background: implied ? 'transparent' : col.bg,
                  color: implied ? '#94a3b8' : col.text,
                  border: `1.5px solid ${implied ? '#e2e8f0' : col.border}`,
                  borderBottom: `2px dotted ${col.border || '#8b5cf6'}`,
                  cursor: 'pointer',
                  fontStyle: implied ? 'italic' : 'normal',
                }}>
                {hw}
                {entry.g && (
                  <span style={{
                    direction: 'ltr', fontFamily: 'inherit',
                    fontSize: Math.max(7, sizes.eng - 1),
                    fontStyle: 'italic', color: '#7c3aed',
                    fontWeight: 400, marginTop: 1,
                  }}>
                    {entry.g}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {note && (
        <div style={{ fontSize: Math.max(8, sizes.label - 1), color: '#94a3b8' }}>{note}</div>
      )}
    </div>
  );
}

// ── 본문 선택 폼 ────────────────────────────────────────────────────────────
function PassageForm({ initial, onAnalyze }) {
  const [bookId,  setBookId]  = useState(initial?.bookId    || 'Ruth');
  const [chapter, setChapter] = useState(initial?.chapter   || 1);
  const [vStart,  setVStart]  = useState(initial?.verseStart || 1);
  const [vEnd,    setVEnd]    = useState(initial?.verseEnd   || 22);

  return (
    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46' }}>📖 분석할 본문 선택</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 7 }}>
        <select value={bookId} onChange={e => setBookId(e.target.value)} style={inpSty}>
          <optgroup label="구약">
            {ALL_BOOKS.slice(0, 39).map(b => <option key={b.id} value={b.id}>{b.ko}</option>)}
          </optgroup>
          <optgroup label="신약">
            {ALL_BOOKS.slice(39).map(b => <option key={b.id} value={b.id}>{b.ko}</option>)}
          </optgroup>
        </select>
        <span style={lblSty}>장</span>
        <input type="number" min="1" max="150" value={chapter}
          onChange={e => setChapter(parseInt(e.target.value) || 1)} style={{ ...inpSty, width: 50 }} />
        <span style={lblSty}>절</span>
        <input type="number" min="1" max="200" value={vStart}
          onChange={e => setVStart(parseInt(e.target.value) || 1)} style={{ ...inpSty, width: 50 }} />
        <span style={lblSty}>—</span>
        <input type="number" min="1" max="200" value={vEnd}
          onChange={e => setVEnd(parseInt(e.target.value) || vStart)} style={{ ...inpSty, width: 50 }} />
        <span style={lblSty}>절</span>
        <button onClick={() => onAnalyze({ bookId, chapter, verseStart: vStart, verseEnd: vEnd })}
          style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          분석 ↗
        </button>
      </div>
    </div>
  );
}

const inpSty = { padding: '4px 7px', borderRadius: 5, border: '1.5px solid #d1fae5', fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff' };
const lblSty = { fontSize: 11, color: '#6b7280' };

// ── 글자 크기 컨트롤 ────────────────────────────────────────────────────────
const SIZE_FIELDS = [
  { key: 'heb',   labelHeb: '히브리어', labelGrk: '헬라어' },
  { key: 'eng',   labelHeb: '영어 뜻',  labelGrk: '영어 뜻' },
  { key: 'ko',    labelHeb: '절 본문',  labelGrk: '절 본문' },
  { key: 'label', labelHeb: '레이블',   labelGrk: '레이블' },
  { key: 'desc',  labelHeb: '설명·범례', labelGrk: '설명·범례' },
];

function SizeControls({ sizes, onChange, isHebrew }) {
  return (
    <div style={{
      padding: '10px 14px', background: '#f0fdf4', borderTop: '1px solid #d1fae5',
      display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', flexShrink: 0,
    }}>
      {SIZE_FIELDS.map(({ key, labelHeb, labelGrk }) => {
        const label = isHebrew ? labelHeb : labelGrk;
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#065f46', fontWeight: 700, minWidth: 44 }}>{label}</span>
            <button onClick={() => onChange(key, -5)} style={szBtn}>−5</button>
            <button onClick={() => onChange(key, -1)} style={szBtn}>−</button>
            <span style={{ fontSize: 11, color: '#1e293b', minWidth: 24, textAlign: 'center', fontWeight: 700 }}>
              {sizes[key]}
            </span>
            <button onClick={() => onChange(key, +1)} style={szBtn}>+</button>
            <button onClick={() => onChange(key, +5)} style={szBtn}>+5</button>
          </div>
        );
      })}
    </div>
  );
}

const szBtn = {
  width: 24, height: 22, fontSize: 10, border: '1px solid #6ee7b7',
  borderRadius: 4, background: 'transparent', color: '#065f46',
  cursor: 'pointer', fontFamily: 'inherit', padding: 0,
};

// ── 범례 ────────────────────────────────────────────────────────────────────
const LEGEND = [
  { label: 'S', desc: '문장' }, { label: 'NP', desc: '명사구' }, { label: 'VP', desc: '동사구' },
  { label: 'PP', desc: '전치사구' }, { label: 'V', desc: '동사' }, { label: 'N', desc: '명사' },
  { label: 'Det', desc: '관사' }, { label: 'Pro', desc: '대명사' }, { label: 'P', desc: '전치사' },
  { label: 'Adj', desc: '형용사' }, { label: 'CONJ', desc: '접속사' }, { label: 'Prt', desc: '불변화사' },
];

const hdrBtn = {
  height: 26, borderRadius: 6, border: '1px solid #047857',
  background: 'transparent', color: '#6ee7b7',
  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, padding: '0 6px',
};

// 모바일: tap target 44px + 폰트 확대
const mHdrBtn = {
  height: 40,
  minWidth: 44,
  fontSize: 12,
  padding: '0 12px',
  borderRadius: 8,
};

// ── 데이터 로드 ────────────────────────────────────────────────────────────
async function loadSyntaxData(bookId, chapter, verseStart, verseEnd) {
  const chLex = await loadChapterLexicon(bookId, chapter);
  if (!chLex) throw new Error('원어 데이터를 불러올 수 없습니다.');

  const range = Array.from({ length: verseEnd - verseStart + 1 }, (_, i) => verseStart + i);
  const verseMap = {};
  await Promise.all(range.map(async (v) => {
    const ko = await fetchVerse(bookId, chapter, v, v, 'krv').catch(() => '');
    const raw = chLex[v] || [];
    // 원어 절 내 위치를 기록 → 한글 어순 보정에 사용
    const words = raw.map((w, i) => ({ ...w, _origIdx: i, _totalWords: raw.length }));
    verseMap[v] = { words, ko };
  }));
  return range.map(v => ({ verse: v, ref: `${chapter}:${v}`, ko: verseMap[v].ko, words: verseMap[v].words }));
}

// ── 메인 팝업 ────────────────────────────────────────────────────────────────
export default function SyntaxPanel({ passage: passageProp, onClose, panelIndex = 0 }) {
  const isMobile = useMobile();
  const [pos,  setPos]  = useState(() => {
    if (isMobile) return { x: 0, y: 0 };
    const offset = panelIndex * 36;
    return { x: Math.max(0, (typeof window !== 'undefined' ? window.innerWidth / 2 - 430 : 100) + offset), y: 70 + offset };
  });
  const [size, setSize] = useState(() => isMobile
    ? { w: typeof window !== 'undefined' ? window.innerWidth : 375,
        h: typeof window !== 'undefined' ? window.innerHeight : 667 }
    : { w: 860, h: 580 });
  const [minimized, setMinimized] = useState(false);

  // 모바일 orientation/resize 자동 대응
  useEffect(() => {
    if (!isMobile) return;
    const onR = () => {
      setPos({ x: 0, y: 0 });
      setSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onR);
    window.addEventListener('orientationchange', onR);
    return () => {
      window.removeEventListener('resize', onR);
      window.removeEventListener('orientationchange', onR);
    };
  }, [isMobile]);

  const dragging    = useRef(false);
  const resizing    = useRef(false);
  const dragStart   = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0 });

  const onHeaderMouseDown = useCallback((e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  }, [pos]);

  const onResizeMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    resizing.current = true;
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
    e.preventDefault(); e.stopPropagation();
  }, [size]);

  useEffect(() => {
    const onMove = (e) => {
      if (dragging.current) setPos({
        x: Math.max(0, Math.min(window.innerWidth  - 200, dragStart.current.px + e.clientX - dragStart.current.mx)),
        y: Math.max(0, Math.min(window.innerHeight -  60, dragStart.current.py + e.clientY - dragStart.current.my)),
      });
      if (resizing.current) setSize({
        w: Math.max(500, Math.min(window.innerWidth  - 40, resizeStart.current.w + e.clientX - resizeStart.current.mx)),
        h: Math.max(240, Math.min(window.innerHeight - 80, resizeStart.current.h + e.clientY - resizeStart.current.my)),
      });
    };
    const onUp = () => { dragging.current = false; resizing.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',  onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  const [passage,   setPassage]  = useState(passageProp || null);
  const [verses,    setVerses]   = useState(null);
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState(null);
  const [viewMode,  setViewMode] = useState('flow'); // 'tree' | 'flow'
  const [showForm,  setShowForm] = useState(!passageProp);
  const [showSizes, setShowSizes] = useState(false);
  const [popups,    setPopups]   = useState([]);

  // 개별 글자 크기 (8~50pt)
  const [sizes, setSizes] = useState({ heb: 18, eng: 9, ko: 12, label: 10, desc: 18 });
  const adjSize = useCallback((key, delta) => {
    setSizes(s => ({ ...s, [key]: Math.max(8, Math.min(50, s[key] + delta)) }));
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const analyze = useCallback(async (p) => {
    setPassage(p); setShowForm(false); setLoading(true); setError(null); setVerses(null);
    try {
      setVerses(await loadSyntaxData(p.bookId, p.chapter, p.verseStart, p.verseEnd));
    } catch (err) {
      setError(err.message || '분석 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (passageProp) analyze(passageProp); }, []); // eslint-disable-line

  const handleWordClick = useCallback((entry, anchor) => {
    setPopups(prev => [...prev, { id: Date.now(), entry, anchor }]);
  }, []);

  const isHebrew = !passage || isOT(passage.bookId);
  const bookKo = passage ? (ALL_BOOKS.find(b => b.id === passage.bookId)?.ko || passage.bookId) : '';
  const passageLabel = passage
    ? `${bookKo} ${passage.chapter}:${passage.verseStart}${passage.verseEnd !== passage.verseStart ? `-${passage.verseEnd}` : ''}절`
    : '';

  return createPortal(
    <div
      className={isMobile ? 'h-screen-safe' : undefined}
      style={{
        position: 'fixed',
        left: isMobile ? 0 : pos.x,
        top: isMobile ? 0 : pos.y,
        width: isMobile ? '100%' : size.w,
        height: isMobile ? undefined : (minimized ? 'auto' : undefined),
        zIndex: 8900,
        background: '#fff',
        borderRadius: isMobile ? 0 : 12,
        boxShadow: isMobile ? 'none' : '0 20px 60px rgba(0,0,0,0.26), 0 4px 16px rgba(0,0,0,0.1)',
        border: isMobile ? 'none' : '1px solid #6ee7b7',
        fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
        display: 'flex', flexDirection: 'column',
      }}>

      {/* ── 타이틀바 ── */}
      <div onMouseDown={isMobile ? undefined : onHeaderMouseDown} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        padding: isMobile
          ? 'calc(env(safe-area-inset-top, 0px) + 8px) calc(env(safe-area-inset-right, 0px) + 12px) 8px calc(env(safe-area-inset-left, 0px) + 12px)'
          : '0 10px',
        height: isMobile ? 'auto' : 44,
        minHeight: isMobile ? 52 : undefined,
        flexShrink: 0,
        background: 'linear-gradient(135deg, #064e3b, #065f46)',
        borderRadius: isMobile ? 0 : (minimized ? 12 : '12px 12px 0 0'),
        cursor: isMobile ? 'default' : 'grab', userSelect: 'none',
      }}>
        <span style={{ fontSize: 14 }}>🔤</span>
        <span style={{ fontWeight: 700, fontSize: 12, color: '#d1fae5', flexShrink: 0 }}>구문 구조</span>
        {passageLabel && (
          <span style={{ fontSize: 10, color: '#6ee7b7', flexShrink: 0 }}>— {passageLabel}</span>
        )}
        <div style={{ flex: 1 }} />

        {/* 뷰 모드 토글 */}
        {!minimized && verses && (
          <>
            <button onMouseDown={e => e.stopPropagation()} onClick={() => setViewMode('flow')}
              style={{ ...hdrBtn, ...(isMobile ? mHdrBtn : {}), background: viewMode === 'flow' ? '#047857' : 'transparent' }}>
              📋 절 구조
            </button>
            <button onMouseDown={e => e.stopPropagation()} onClick={() => setViewMode('tree')}
              style={{ ...hdrBtn, ...(isMobile ? mHdrBtn : {}), background: viewMode === 'tree' ? '#047857' : 'transparent' }}>
              🌲 트리
            </button>
          </>
        )}

        {/* 크기 설정 */}
        {!minimized && (
          <button onMouseDown={e => e.stopPropagation()} onClick={() => setShowSizes(v => !v)}
            style={{ ...hdrBtn, ...(isMobile ? mHdrBtn : {}), background: showSizes ? '#047857' : 'transparent' }}
            title="글자 크기 조절">
            ⚙️
          </button>
        )}

        {/* 본문 선택 */}
        <button onMouseDown={e => e.stopPropagation()} onClick={() => setShowForm(v => !v)}
          style={{ ...hdrBtn, ...(isMobile ? mHdrBtn : {}), background: showForm ? '#047857' : 'transparent' }}>
          {showForm ? '▲' : '본문'}
        </button>

        {/* 최소화 (데스크톱만) */}
        {!isMobile && (
          <button onMouseDown={e => e.stopPropagation()} onClick={() => setMinimized(v => !v)} style={hdrBtn}>
            {minimized ? '▲' : '▼'}
          </button>
        )}

        {/* 닫기 */}
        <button onMouseDown={e => e.stopPropagation()} onClick={onClose}
          style={{ ...hdrBtn, ...(isMobile ? mHdrBtn : {}), border: '1px solid #7f1d1d', color: '#fca5a5' }}>✕</button>
      </div>

      {/* ── 본문 선택 폼 ── */}
      {!minimized && showForm && (
        <PassageForm initial={passage} onAnalyze={(p) => { analyze(p); setShowForm(false); }} />
      )}

      {/* ── 글자 크기 컨트롤 ── */}
      {!minimized && showSizes && (
        <SizeControls sizes={sizes} onChange={adjSize} isHebrew={isHebrew} />
      )}

      {/* ── 내용 ── */}
      {!minimized && !showForm && (
        <div style={{
          flex: isMobile ? 1 : undefined,
          height: isMobile ? undefined : size.h,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: isMobile ? 0 : '0 0 12px 12px',
        }}>

          {/* 설명 + 범례 (트리 뷰) */}
          {verses && viewMode === 'tree' && (
            <div style={{
              background: '#f0fdf4', borderBottom: '1px solid #d1fae5', flexShrink: 0,
              padding: '8px 14px 10px',
            }}>
              {/* 활용 설명 — 언어별 분기 */}
              <div style={{ fontSize: sizes.desc, color: '#065f46', lineHeight: 1.7, marginBottom: 8 }}>
                {isHebrew ? (
                  <>
                    <b>구문 트리란? (히브리어)</b> — 히브리어 원문 문장을 나무처럼 쪼개서, 각 단어가 어떤 역할을 하는지 한눈에 보여주는 그림입니다.<br />
                    <span style={{ color: '#6b7280', fontSize: Math.max(sizes.desc - 2, 9) }}>
                      📌 맨 위 <b>S</b>(문장 전체)에서 아래로 내려갈수록 더 작은 단위로 나뉩니다. 맨 아래가 실제 히브리어 단어예요.<br />
                      📌 히브리어는 오른쪽→왼쪽(RTL)으로 읽습니다. 트리에서 단어들은 오른쪽이 문장 앞부분입니다.<br />
                      📌 단어를 클릭하면 원어 사전·어형 정보가 열립니다. 트리가 넓으면 가로로 스크롤하세요.
                    </span>
                  </>
                ) : (
                  <>
                    <b>구문 트리란? (헬라어)</b> — 헬라어 원문 문장을 나무처럼 쪼개서, 각 단어가 어떤 역할을 하는지 한눈에 보여주는 그림입니다.<br />
                    <span style={{ color: '#6b7280', fontSize: Math.max(sizes.desc - 2, 9) }}>
                      📌 맨 위 <b>S</b>(문장 전체)에서 아래로 내려갈수록 더 작은 단위로 나뉩니다. 맨 아래가 실제 헬라어 단어예요.<br />
                      📌 헬라어는 왼쪽→오른쪽(LTR)으로 읽으며, 관사(the)가 명사구의 시작을 알려줍니다.<br />
                      📌 단어를 클릭하면 원어 사전·어형 정보가 열립니다. 트리가 넓으면 가로로 스크롤하세요.
                    </span>
                  </>
                )}
              </div>
              {/* 문법 약어 범례 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: Math.max(sizes.desc - 3, 9), color: '#6b7280', fontWeight: 700, marginRight: 2 }}>약어</span>
                {LEGEND.map(({ label, desc }) => {
                  const col = getNodeColor(label);
                  return (
                    <span key={label} style={{
                      fontSize: sizes.desc, padding: '2px 7px', borderRadius: 4,
                      color: col.text, background: col.fill, border: `1px solid ${col.stroke}`,
                      lineHeight: 1.5,
                    }}>
                      <b>{label}</b> {desc}
                    </span>
                  );
                })}
              </div>
            </div>
          )}


          {loading && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>⏳</span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>원어 데이터 분석 중…</span>
            </div>
          )}

          {error && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <span style={{ fontSize: 13, color: '#dc2626' }}>{error}</span>
              <button onClick={() => { setShowForm(true); setError(null); }}
                style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                다시 선택
              </button>
            </div>
          )}

          {!loading && verses && (
            <div className={isMobile ? 'momentum-scroll' : undefined}
              style={{ flex: 1, overflowY: 'auto',
                padding: viewMode === 'tree' ? (isMobile ? '10px 12px calc(env(safe-area-inset-bottom, 0px) + 24px)' : '14px 14px 24px') : '0',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                paddingBottom: isMobile && viewMode !== 'tree' ? 'calc(env(safe-area-inset-bottom, 0px) + 12px)' : undefined,
              }}>
              {viewMode === 'tree' ? (
                <>
                  {verses.map(v => (
                    <VerseTreeCard key={v.verse} data={v} sizes={sizes} onWordClick={handleWordClick} />
                  ))}
                </>
              ) : (
                <FlowView verses={verses} sizes={sizes} onWordClick={handleWordClick} isHebrew={isHebrew} />
              )}
            </div>
          )}

          {!loading && !verses && !error && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>"본문" 버튼을 눌러 분석할 구절을 선택하세요.</span>
            </div>
          )}
        </div>
      )}

      {/* 리사이즈 */}
      {!minimized && (
        <div onMouseDown={onResizeMouseDown} style={{
          position: 'absolute', right: 0, bottom: 0, width: 16, height: 16,
          cursor: 'se-resize',
          background: 'linear-gradient(135deg, transparent 50%, #6ee7b7 50%)',
          borderRadius: '0 0 12px 12px',
        }} />
      )}

      {popups.map(p => (
        <LexiconPopup
          key={p.id}
          entry={p.entry}
          anchor={p.anchor}
          bookId={passage?.bookId || 'Gen'}
          onClose={() => setPopups(prev => prev.filter(x => x.id !== p.id))}
          zIndex={9500}
        />
      ))}
    </div>,
    document.body
  );
}
