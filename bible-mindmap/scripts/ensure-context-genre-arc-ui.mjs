import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, '../src/components/ContextBibleModal.jsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

const genreMarker = 'const CONTEXT_BOOK_GROUPS = [';
const genreInsertAnchor = `};\n\nconst BASE = import.meta.env.BASE_URL;`;
const genreConstants = `};

// 문맥성경 책 탐색용 정경·장르 대분류
// 칩의 순서는 기존 66권 정경 순서를 유지하되, 사용자가 장르 경계를 즉시 인식할 수 있게 그룹화한다.
const CONTEXT_BOOK_GROUPS = [
  { id:'ot-law', testament:'OT', label:'율법서', bookIds:['Gen','Exod','Lev','Num','Deut'] },
  { id:'ot-history', testament:'OT', label:'역사서', bookIds:['Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh','Esth'] },
  { id:'ot-wisdom', testament:'OT', label:'시가·지혜서', bookIds:['Job','Ps','Prov','Eccl','Song'] },
  { id:'ot-major-prophets', testament:'OT', label:'대선지서', bookIds:['Isa','Jer','Lam','Ezek','Dan'] },
  { id:'ot-minor-prophets', testament:'OT', label:'소선지서', bookIds:['Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal'] },
  { id:'nt-gospels', testament:'NT', label:'복음서', bookIds:['Matt','Mark','Luke','John'] },
  { id:'nt-history', testament:'NT', label:'사도행전', bookIds:['Acts'] },
  { id:'nt-paul', testament:'NT', label:'바울서신', bookIds:['Rom','1Cor','2Cor','Gal','Eph','Phil','Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm'] },
  { id:'nt-general', testament:'NT', label:'히브리·일반서신', bookIds:['Heb','Jas','1Pet','2Pet','1John','2John','3John','Jude'] },
  { id:'nt-apocalypse', testament:'NT', label:'묵시문학', bookIds:['Rev'] },
];

const BASE = import.meta.env.BASE_URL;`;

if (!source.includes(genreMarker)) {
  if (!source.includes(genreInsertAnchor)) throw new Error('[context-genre-ui] constants anchor not found');
  source = source.replace(genreInsertAnchor, genreConstants);
  changed = true;
}

const startMarker = '        {/* ── 성경 66권 라벨링 칩 (다이어리 인덱스 스타일) — 모바일·데스크톱 공통 ── */}';
const endMarker = '        {/* ── 장 네비게이션 (데스크톱, 흐름 아래, Rom 전용) ── */}';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('[context-genre-ui] chip rail boundaries not found');

const newRail = `        {/* ── 성경 66권 · 정경/장르 대분류 + 책 칩 — 모바일·데스크톱 공통 ── */}
        <div
          ref={chipRowRef}
          aria-label="성경 책 선택 · 장르별 분류"
          style={{
            padding: isMobile ? '8px 12px 4px' : '10px 20px 6px',
            background:\`linear-gradient(180deg, rgba(255,255,255,0) 0%, \${activeFadeTint} 100%)\`,
            flexShrink:0,
            overflowX:'auto',
            overflowY:'hidden',
            position:'relative',
            WebkitOverflowScrolling:'touch',
          }}>
          <div style={{
            display:'flex',
            alignItems:'stretch',
            gap: isMobile ? 10 : 14,
            minWidth:'max-content',
            paddingTop:2,
            paddingBottom:2,
          }}>
            {CONTEXT_BOOK_GROUPS.map((group, groupIndex) => {
              const p = BOOK_CHIP_PALETTE[group.testament];
              const sourceBooks = group.testament === 'OT' ? OT_BOOKS : NT_BOOKS;
              const groupBooks = group.bookIds
                .map(id => sourceBooks.find(book => book.id === id))
                .filter(Boolean);
              const hasActiveBook = group.bookIds.includes(activeBookId);
              return (
                <div key={group.id} style={{
                  display:'flex', flexDirection:'column', gap:4, flexShrink:0,
                  paddingLeft: groupIndex === 0 ? 0 : (isMobile ? 8 : 12),
                  borderLeft: groupIndex === 0 ? 'none' : '1px solid rgba(148,163,184,.22)',
                }}>
                  <div style={{
                    display:'flex', alignItems:'center', gap:6,
                    minHeight:18,
                    padding:'0 2px',
                    color: hasActiveBook ? p.tabText : '#64748b',
                    fontSize: isMobile ? 9 : 10,
                    fontWeight: hasActiveBook ? 900 : 800,
                    letterSpacing:'.055em',
                    whiteSpace:'nowrap',
                    fontFamily:"'Inter','Pretendard',sans-serif",
                    userSelect:'none',
                  }}>
                    <span style={{
                      padding:'2px 5px', borderRadius:4,
                      background: hasActiveBook ? p.tabBg : 'rgba(248,250,252,.92)',
                      border:\`1px solid \${hasActiveBook ? p.tabBorder : 'rgba(148,163,184,.28)'}\`,
                      color: hasActiveBook ? p.tabText : '#64748b',
                      fontSize: isMobile ? 8 : 9,
                      fontWeight:900,
                    }}>
                      {group.testament === 'OT' ? '구약' : '신약'}
                    </span>
                    <span>{group.label}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:isMobile?2:3 }}>
                    {groupBooks.map(b => {
                      const abbr = KO_ABBR_BY_ID[b.id] || b.ko.slice(0,1);
                      const isActive = b.id === activeBookId;
                      const isDone = SUPPORTED_BOOK_IDS.includes(b.id);
                      return (
                        <div key={b.id}
                          data-book-active={isActive ? 'true' : 'false'}
                          title={\`\${group.label} · \${b.ko} (\${b.en}) · \${b.chapters}장\${isDone ? ' · ✅ 문맥성경 지원' : ''}\`}
                          onClick={(e) => { setActiveBookId(b.id); scrollChipToLeft(e.currentTarget); }}
                          style={bookChipStyle(isActive, group.testament)}
                          onMouseEnter={e => {
                            if (isActive) return;
                            e.currentTarget.style.background = p.hoverBg;
                            e.currentTarget.style.color = p.hoverText;
                            e.currentTarget.style.borderColor = p.hoverBorder;
                          }}
                          onMouseLeave={e => {
                            if (isActive) return;
                            e.currentTarget.style.background = p.baseBg;
                            e.currentTarget.style.color = p.baseText;
                            e.currentTarget.style.borderColor = p.baseBorder;
                          }}
                        >
                          {abbr}
                          {isDone && <span style={completedDotStyle} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

`;

if (!source.slice(start, end).includes('CONTEXT_BOOK_GROUPS.map')) {
  source = source.slice(0, start) + newRail + source.slice(end);
  changed = true;
}

if (changed) {
  fs.writeFileSync(target, source);
  console.log('✓ Context Bible uses genre-grouped book chips and shared Arc UX');
} else {
  console.log('✓ Context Bible genre/Arc UI already applied');
}
