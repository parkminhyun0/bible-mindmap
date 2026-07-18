#!/usr/bin/env node
/**
 * OpenBible.info cross-references.txt → 책별 JSON 분할
 *
 * 입력:  /tmp/openbible/cross_references.txt
 * 출력:  public/crossref/<BookId>.json  (예: Gen.json, Mark.json …)
 *
 * 형식:
 *   { "Gen": [ { from: {book,ch,vs,ve}, to: {book,ch,vs,ve}, votes }, … ] }
 *
 * 필터:  votes >= MIN_VOTES (기본 5) — 잡음 제거
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const INPUT  = process.argv[2] || '/tmp/openbible/cross_references.txt';
const OUT_DIR = process.argv[3] || path.join(__dirname, '../public/crossref');
const MIN_VOTES = parseInt(process.argv[4] || '5', 10);

// OpenBible 약어 → 앱 book ID 매핑
const OB_TO_ID = {
  Gen: 'Gen', Exod: 'Exod', Lev: 'Lev', Num: 'Num', Deut: 'Deut',
  Josh: 'Josh', Judg: 'Judg', Ruth: 'Ruth', '1Sam': '1Sam', '2Sam': '2Sam',
  '1Kgs': '1Kgs', '2Kgs': '2Kgs', '1Chr': '1Chr', '2Chr': '2Chr',
  Ezra: 'Ezra', Neh: 'Neh', Esth: 'Esth', Job: 'Job', Ps: 'Ps',
  Prov: 'Prov', Eccl: 'Eccl', Song: 'Song', Isa: 'Isa', Jer: 'Jer',
  Lam: 'Lam', Ezek: 'Ezek', Dan: 'Dan', Hos: 'Hos', Joel: 'Joel',
  Amos: 'Amos', Obad: 'Obad', Jonah: 'Jonah', Mic: 'Mic', Nah: 'Nah',
  Hab: 'Hab', Zeph: 'Zeph', Hag: 'Hag', Zech: 'Zech', Mal: 'Mal',
  Matt: 'Matt', Mark: 'Mark', Luke: 'Luke', John: 'John', Acts: 'Acts',
  Rom: 'Rom', '1Cor': '1Cor', '2Cor': '2Cor', Gal: 'Gal', Eph: 'Eph',
  Phil: 'Phil', Col: 'Col', '1Thess': '1Thess', '2Thess': '2Thess',
  '1Tim': '1Tim', '2Tim': '2Tim', Titus: 'Titus', Phlm: 'Phlm',
  Heb: 'Heb', Jas: 'Jas', '1Pet': '1Pet', '2Pet': '2Pet',
  '1John': '1John', '2John': '2John', '3John': '3John', Jude: 'Jude', Rev: 'Rev',
};

/**
 * "Gen.1.2" 또는 "1Cor.11.7-1Cor.11.9" 파싱
 * 단일: { book, ch, vs, ve }  (ve = vs)
 * 범위: 끝 절은 마지막 Book.Ch.V 에서 추출
 */
function parseRef(str) {
  str = str.trim();
  // 범위 형식: Book.Ch.Vs-Book.Ch.Ve
  const rangeParts = str.split('-');
  const first = rangeParts[0].split('.');
  if (first.length < 3) return null;

  const book = OB_TO_ID[first[0]];
  if (!book) return null;
  const ch = parseInt(first[1], 10);
  const vs = parseInt(first[2], 10);

  let ve = vs;
  if (rangeParts.length > 1) {
    const last = rangeParts[rangeParts.length - 1].split('.');
    // "1Cor.11.9" 형태이면 마지막 숫자가 ve
    ve = parseInt(last[last.length - 1], 10);
    if (isNaN(ve)) ve = vs;
  }

  return { book, ch, vs, ve };
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`입력 파일 없음: ${INPUT}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // book → 항목 배열
  const byBook = {};

  const rl = readline.createInterface({ input: fs.createReadStream(INPUT) });
  let lineNum = 0;
  let skipped = 0;
  let kept = 0;

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue; // 헤더 스킵

    const parts = line.split('\t');
    if (parts.length < 3) continue;

    const votes = parseInt(parts[2], 10);
    if (isNaN(votes) || votes < MIN_VOTES) { skipped++; continue; }

    const from = parseRef(parts[0]);
    const to   = parseRef(parts[1]);
    if (!from || !to) { skipped++; continue; }

    // from.book 기준으로 분류
    if (!byBook[from.book]) byBook[from.book] = [];
    byBook[from.book].push({ from, to, votes });

    kept++;
  }

  // 각 책별 JSON 저장 (votes 내림차순 정렬)
  let fileCount = 0;
  for (const [bookId, entries] of Object.entries(byBook)) {
    entries.sort((a, b) => b.votes - a.votes);
    const outPath = path.join(OUT_DIR, `${bookId}.json`);
    fs.writeFileSync(outPath, JSON.stringify(entries), 'utf8');
    fileCount++;
  }

  console.log(`✅ 완료`);
  console.log(`   총 입력: ${lineNum - 1}행`);
  console.log(`   저장:    ${kept}건 (votes ≥ ${MIN_VOTES})`);
  console.log(`   제외:    ${skipped}건`);
  console.log(`   파일:    ${fileCount}개 → ${OUT_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
