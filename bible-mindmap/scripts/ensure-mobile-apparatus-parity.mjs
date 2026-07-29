import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve('src/components/ContextBibleModal.jsx');
const marker = '비평장치 모드 (모바일 · PC와 동일한 OFF/일반/학술 상태 공유)';
const anchor = '        {/* ── 폰트 조절 (모바일 · legendOpen 시) — 본문·분석·부가만 노출 ── */}\n';

const block = `        {/* ── 비평장치 모드 (모바일 · PC와 동일한 OFF/일반/학술 상태 공유) ── */}
        {isMobile && (
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'6px 14px',
            borderBottom:'1px solid rgba(245,158,11,.18)',
            background:'#FFFBEB', flexShrink:0,
            overflowX:'auto', WebkitOverflowScrolling:'touch'
          }}>
            <span style={{
              fontSize:11, fontWeight:900, color:'#B45309',
              letterSpacing:'.02em', flexShrink:0
            }}>✎ 비평</span>
            {[
              { key:'off',       label:'OFF',  bg:'#6B7280', title:'비평장치 아이콘 완전 숨김 (깔끔한 읽기)' },
              { key:'standard',  label:'일반', bg:'#059669', title:'학술 유의미 (수동 큐레이션 + SBLGNT Metzger A/B 등급)' },
              { key:'scholarly', label:'학술', bg:'#7C3AED', title:'자동 감지 전체 (OSHB · SP-MT · LXX-MT 포함 · 노이즈 있음)' },
            ].map(({ key, label, bg, title }) => {
              const active = apparatusMode === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setApparatusMode(key)}
                  title={title}
                  style={{
                    minWidth:52, minHeight:40, padding:'6px 12px',
                    borderRadius:8, cursor:'pointer', flexShrink:0,
                    fontSize:11, fontWeight:active ? 900 : 700,
                    background:active ? bg : '#fff',
                    color:active ? '#fff' : '#78716C',
                    border:active ? \`1px solid \${bg}\` : '1px solid #FDE68A',
                    boxShadow:active ? \`0 1px 3px \${bg}55\` : 'none',
                    transition:'all .12s',
                    touchAction:'manipulation'
                  }}
                >{label}</button>
              );
            })}
          </div>
        )}

`;

if (!fs.existsSync(target)) {
  console.error(`[apparatus-parity] target not found: ${target}`);
  process.exit(1);
}

const source = fs.readFileSync(target, 'utf8');

if (source.includes(marker)) {
  console.log('[apparatus-parity] already applied');
  process.exit(0);
}

if (!source.includes(anchor)) {
  console.error('[apparatus-parity] insertion anchor not found; aborting without modifying source');
  process.exit(1);
}

const next = source.replace(anchor, block + anchor);
fs.writeFileSync(target, next, 'utf8');
console.log('[apparatus-parity] mobile OFF/일반/학술 controls applied');
