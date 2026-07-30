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

  // ── 1b. 단어별 사전 연동 데이터 (index 정렬, 1-indexed) ────────────────────
  // 표제어(lemma)·Strong's(G번호)·SBL 음역 — 표시 단어와 완전히 같은 인덱스.
  // 이 데이터로 LXX 단어를 헬라어 사전 팝업(Strong's 기반)에 연결한다.
  const parseIndexed = (csv) => {
    const arr = [''];
    for (const line of csv.split('\n')) {
      const t = line.replace(/\r$/, '');
      if (!t.trim()) continue;
      const parts = t.split('\t');
      const idx = parseInt(parts[0], 10);
      if (!idx) continue;
      arr[idx] = parts.length >= 2 ? parts[parts.length - 1].trim() : '';
    }
    return arr;
  };
  process.stdout.write('1b/2 사전 연동 데이터(표제어·Strong·음역) 다운로드 중... ');
  const [lexemeCsv, strongCsv, translitCsv] = await Promise.all([
    fetchText(BASE_URL + '02_lexemes/OSSP_lexemes.csv'),
    fetchText(BASE_URL + '07_StrongNumber/final_Strongs.csv'),
    fetchText(BASE_URL + '04_SBL_transliteration/final_transliteration_SBL.csv'),
  ]);
  const lemmas   = parseIndexed(lexemeCsv);
  const strongs  = parseIndexed(strongCsv);
  const translit = parseIndexed(translitCsv);
  console.log('✓');

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
  const lexData  = {}; // appId → { ch → { vs → [ {w,tr,s,l}, ... ] } }  (사전 연동용)

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

    // 단어별 사전 연동 엔트리 (원어 탭과 동일한 {w,tr,s,m,l,g} 스키마 · m/g 생략)
    const lexWords = [];
    for (let wi = start; wi <= end && wi < words.length; wi += 1) {
      const w = words[wi];
      if (!w) continue;
      lexWords.push({ w, tr: translit[wi] || '', s: strongs[wi] || '', l: lemmas[wi] || '' });
    }
    if (!lexData[appId]) lexData[appId] = {};
    if (!lexData[appId][ch]) lexData[appId][ch] = {};
    lexData[appId][ch][vs] = lexWords;
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

  // ── 5. 사전 연동용 LXX lex 저장 (lxx-lex/{book}/{ch}.json) ────────────────
  // public/data/* 는 .gitignore(CI 생성) 대상이고 parseLXX는 CI 체인에 없으므로,
  // 커밋되는 tracked 경로 public/lxx-lex 에 저장한다(공개 실행 시 항상 존재).
  const lexRoot = path.join(__dirname, '..', 'public', 'lxx-lex');
  fs.mkdirSync(lexRoot, { recursive: true });
  let lexBooks = 0, lexWithStrong = 0, lexTotal = 0;
  for (const appId of Object.keys(lexData).sort()) {
    const bookDir = path.join(lexRoot, appId);
    fs.mkdirSync(bookDir, { recursive: true });
    for (const ch of Object.keys(lexData[appId])) {
      const chObj = lexData[appId][ch];
      for (const vs of Object.keys(chObj)) {
        for (const wd of chObj[vs]) { lexTotal += 1; if (wd.s) lexWithStrong += 1; }
      }
      fs.writeFileSync(path.join(bookDir, `${ch}.json`), JSON.stringify(chObj));
    }
    lexBooks += 1;
  }
  const cov = lexTotal ? (lexWithStrong / lexTotal * 100).toFixed(1) : '0';
  console.log(`LXX lex → public/data/lex/lxx/  (${lexBooks}권 · 단어 ${lexTotal.toLocaleString()} · Strong 매칭 ${cov}%)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
