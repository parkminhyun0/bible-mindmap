/**
 * parseLXX.cjs
 *
 * eliranwong/LXX-Rahlfs-1935 GitHub 레포에서
 * LXX Rahlfs 1935 헬라어 본문을 다운로드하여
 * public/lxx/{bookId}.json 으로 저장합니다.
 *
 * 사용 텍스트: text_accented.csv (악센트 포함 원어)
 * 버전 선택: JoshB, JudgB (MT 기준), DanTh (테오도시온)
 * 2Esdr 1-10 → Ezra / 11-23 → Neh (장번호 재매핑)
 *
 * 실행: node scripts/parseLXX.cjs
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const BASE_URL = 'https://raw.githubusercontent.com/eliranwong/LXX-Rahlfs-1935/master/';

// LXX 책명 → 앱 도서 ID 매핑 (외경/중복 버전 제외)
const LXX_BOOK_MAP = {
  'Gen':        'Gen',
  'Exod':       'Exod',
  'Lev':        'Lev',
  'Num':        'Num',
  'Deut':       'Deut',
  'JoshB':      'Josh',    // B = MT 기준 정렬 버전
  'JudgB':      'Judg',    // B = MT 기준 정렬 버전
  'Ruth':       'Ruth',
  '1Sam':       '1Sam',
  '2Sam':       '2Sam',
  '1Kgs':       '1Kgs',
  '2Kgs':       '2Kgs',
  '1Chr':       '1Chr',
  '2Chr':       '2Chr',
  // 2Esdr은 아래에서 분리 처리
  'Esth':       'Esth',
  'Job':        'Job',
  'Ps':         'Ps',
  'Prov':       'Prov',
  'Eccl':       'Eccl',
  'Song':       'Song',
  'Isa':        'Isa',
  'Jer':        'Jer',
  'Lam':        'Lam',
  'Ezek':       'Ezek',
  'DanTh':      'Dan',     // 테오도시온 버전 (표준 기독교 정경)
  'Hos':        'Hos',
  'Joel':       'Joel',
  'Amos':       'Amos',
  'Obad':       'Obad',
  'Jonah':      'Jonah',
  'Mic':        'Mic',
  'Nah':        'Nah',
  'Hab':        'Hab',
  'Zeph':       'Zeph',
  'Hag':        'Hag',
  'Zech':       'Zech',
  'Mal':        'Mal',
};

// 제외할 LXX 책 (외경, 중복 버전, 사용 안 함)
const SKIP_BOOKS = new Set([
  'JoshA', 'JudgA',           // 대안 버전 (B 사용)
  'DanOG',                     // 대안 버전 (Th 사용)
  'SusOG', 'SusTh',           // 수산나 (외경)
  'BelOG', 'BelTh',           // 벨과 용 (외경)
  '1Esdr', '1Macc', '2Macc',  // 외경
  '3Macc', '4Macc',
  'Bar', 'EpJer', 'Jdt',      // 외경
  'PsSol', 'Odes', 'Sir',     // 외경/외전
  'Wis', 'TobBA', 'TobS',     // 외경
]);

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

async function main() {
  const outDir = path.join(__dirname, '..', 'public', 'lxx');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // ── 1. 단어 목록 다운로드 (약 15MB) ──────────────────────────────────────
  process.stdout.write('1/2 단어 목록 다운로드 중 (15MB) ... ');
  const wordCsv = await fetchText(BASE_URL + '01_wordlist_unicode/text_accented.csv');
  process.stdout.write('파싱 중 ... ');

  // words[1] = 첫 번째 단어 (1-indexed 유지)
  const words = [''];
  for (const line of wordCsv.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const parts = t.split('\t');
    if (parts.length < 2) continue;
    words.push(parts[parts.length - 1]); // 마지막 컬럼 = 실제 헬라어 단어
  }
  console.log(`✓  단어 ${(words.length - 1).toLocaleString()}개`);

  // ── 2. 절 색인 다운로드 ───────────────────────────────────────────────────
  process.stdout.write('2/2 절 색인 다운로드 중... ');
  const verseCsv = await fetchText(BASE_URL + '08_versification/001_verse_c_modified_KEEP.csv');
  process.stdout.write('파싱 중 ... ');

  // [{ref, start}] — start 오름차순 정렬
  const verseList = [];
  for (const line of verseCsv.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const [ref, startStr] = t.split('\t');
    if (!ref || !startStr) continue;
    verseList.push({ ref, start: parseInt(startStr, 10) });
  }
  verseList.sort((a, b) => a.start - b.start);
  console.log(`✓  ${verseList.length.toLocaleString()}절`);

  // ── 3. 절 텍스트 추출 ────────────────────────────────────────────────────
  console.log('\n절 텍스트 추출 중...');
  const bookData = {}; // appId → { ch → { vs → text } }

  for (let i = 0; i < verseList.length; i++) {
    const { ref, start } = verseList[i];
    const end = i + 1 < verseList.length ? verseList[i + 1].start - 1 : words.length - 1;

    const [lxxBook, lxxCh, lxxVs] = ref.split('.');
    if (!lxxBook || !lxxCh || !lxxVs) continue;

    // 2Esdr: Ezra(ch 1-10) / Neh(ch 11-23, 재매핑 11→1)
    let appId;
    let ch = parseInt(lxxCh, 10);

    if (lxxBook === '2Esdr') {
      if (ch <= 10) {
        appId = 'Ezra';
      } else {
        appId = 'Neh';
        ch = ch - 10;
      }
    } else if (SKIP_BOOKS.has(lxxBook)) {
      continue;
    } else {
      appId = LXX_BOOK_MAP[lxxBook];
      if (!appId) continue;
    }

    const vs   = parseInt(lxxVs, 10);
    const text = words.slice(start, end + 1).join(' ');

    if (!bookData[appId]) bookData[appId] = {};
    if (!bookData[appId][ch]) bookData[appId][ch] = {};
    bookData[appId][ch][vs] = text;
  }

  // ── 4. 도서별 JSON 저장 ──────────────────────────────────────────────────
  const bookIds = Object.keys(bookData).sort();
  console.log(`\n${bookIds.length}권 저장:`);
  let saved = 0;
  for (const appId of bookIds) {
    const data     = bookData[appId];
    const chapters = Object.keys(data).length;
    const verses   = Object.values(data).reduce((s, c) => s + Object.keys(c).length, 0);
    fs.writeFileSync(path.join(outDir, `${appId}.json`), JSON.stringify(data));
    console.log(`  [${++saved}/${bookIds.length}] ${appId.padEnd(6)} ${chapters}장 ${verses}절`);
  }

  const totalSize = fs.readdirSync(outDir)
    .reduce((s, f) => s + fs.statSync(path.join(outDir, f)).size, 0);
  console.log(`\n완료 → public/lxx/  (${(totalSize / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
