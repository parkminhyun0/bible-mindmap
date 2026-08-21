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

for (const task of fs.readdirSync(path.join(ROOT, '.pipeline')).filter((d) => /^task\d+$/.test(d))) {
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
  console.log('✓ 제안 산출물 이상 없음');
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
