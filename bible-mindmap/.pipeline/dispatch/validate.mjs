// 모델이 낸 산출물이 쓸 만한지 검사한다. 못 쓸 것은 지워서 다시 돌게 한다.
//
// 왜 필요한가: batch 07 에서 Codex 가 낸 R-codex.json 이 translit="e",
// translitKo="ḥ" 처럼 한 글자짜리 값 100개로 채워져 있었다. 파일은 있고 JSON 도
// 파싱되니 디스패처는 "완료"로 봤고, 대조 단계에서 만장일치가 0건이 되고서야
// 드러났다. 다수결이 흡수해 데이터는 무사했지만, 조용히 지나갈 뻔했다.
//
// 사용: node .pipeline/dispatch/validate.mjs [--fix]
//   --fix 는 못 쓸 파일을 지운다. 디스패처가 알아서 다시 돌린다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIX = process.argv.includes('--fix');
const bad = [];

const read = (p) => {
  let raw = fs.readFileSync(p, 'utf8').trim();
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  return JSON.parse(raw);
};

// 판정·감사 산출물도 빈 파일이나 깨진 JSON 으로 남을 수 있다. 파일이 있으면
// 디스패처는 완료로 보므로, 0 바이트짜리 하나가 그 단계를 영구히 막는다.
// 실제로 b09 감사 1 이 쿼터로 죽으며 0 바이트를 남겼고, 아무도 모르는 채
// 감사가 3/4 에서 멈춰 있었다. 제안만 보던 앞 판본은 이것을 놓쳤다.
for (const task of fs.readdirSync(path.join(ROOT, '.pipeline')).filter((d) => /^task\d+$/.test(d))) {
  for (const sub of ['rulings', 'audits']) {
    const d2 = path.join(ROOT, '.pipeline', task, sub);
    if (!fs.existsSync(d2)) continue;
    for (const f of fs.readdirSync(d2).filter((x) => x.endsWith('.json'))) {
      const p = path.join(d2, f);
      if (!fs.statSync(p).size) { bad.push({ p, why: '0 바이트 — 실행이 중간에 끊겼다' }); continue; }
      try { read(p); } catch (e) { bad.push({ p, why: `JSON 파싱 실패: ${e.message.slice(0, 60)}` }); }
    }
  }

  const dir = path.join(ROOT, '.pipeline', task, 'proposals');
  if (!fs.existsSync(dir)) continue;

  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const p = path.join(dir, f);
    let j;
    try {
      j = read(p);
    } catch (e) {
      bad.push({ p, why: `JSON 파싱 실패: ${e.message.slice(0, 60)}` });
      continue;
    }
    const rows = j.entries || [];
    if (!rows.length) {
      bad.push({ p, why: 'entries 가 비었다' });
      continue;
    }
    // 한 글자짜리 값이나 한글이 아닌 translitKo 가 절반을 넘으면 못 쓴다.
    const tiny = rows.filter((r) => String(r.translit || '').length <= 2 || String(r.translitKo || '').length <= 1).length;
    const noHangul = rows.filter((r) => !/[가-힣]/.test(String(r.translitKo || ''))).length;
    if (tiny > rows.length / 2) bad.push({ p, why: `값이 한 글자뿐인 항목 ${tiny}/${rows.length}` });
    else if (noHangul > rows.length / 2) bad.push({ p, why: `translitKo 가 한글이 아닌 항목 ${noHangul}/${rows.length}` });
  }
}

if (!bad.length) {
  console.log('✓ 모델 산출물 이상 없음 (제안·판정·감사)');
  process.exit(0);
}

for (const b of bad) {
  const rel = path.relative(ROOT, b.p);
  if (FIX) {
    fs.unlinkSync(b.p);
    console.log(`✗ ${rel} — ${b.why} · 지웠다. 디스패처가 다시 돌린다.`);
  } else {
    console.log(`✗ ${rel} — ${b.why}`);
  }
}
process.exit(FIX ? 0 : 1);
