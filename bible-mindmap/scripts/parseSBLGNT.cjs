/**
 * parseSBLGNT.cjs
 *
 * GitHub morphgnt/sblgnt 에서 27권 파일을 다운로드하여
 * public/sblgnt/{bookId}.json 형태로 저장합니다.
 *
 * 출력 형식:
 *   { "1": { "1": "Ἀρχὴ τοῦ...", "2": "Καθὼς...", ... }, ... }
 *
 * 실행: node scripts/parseSBLGNT.cjs
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// SBLGNT 파일번호(61-87) → 앱 도서 ID 매핑
const FILE_TO_BOOK_ID = {
  61: 'Matt', 62: 'Mark', 63: 'Luke',   64: 'John',
  65: 'Acts', 66: 'Rom',  67: '1Cor',   68: '2Cor',
  69: 'Gal',  70: 'Eph',  71: 'Phil',   72: 'Col',
  73: '1Thess', 74: '2Thess', 75: '1Tim',  76: '2Tim',
  77: 'Titus',  78: 'Phlm',   79: 'Heb',   80: 'Jas',
  81: '1Pet', 82: '2Pet', 83: '1John',  84: '2John',
  85: '3John', 86: 'Jude', 87: 'Rev',
};

// SBLGNT 파일명 형식: 62-Mk-morphgnt.txt
const FILE_NAMES = {
  61: '61-Mt-morphgnt.txt',  62: '62-Mk-morphgnt.txt',  63: '63-Lk-morphgnt.txt',
  64: '64-Jn-morphgnt.txt',  65: '65-Ac-morphgnt.txt',  66: '66-Ro-morphgnt.txt',
  67: '67-1Co-morphgnt.txt', 68: '68-2Co-morphgnt.txt', 69: '69-Ga-morphgnt.txt',
  70: '70-Eph-morphgnt.txt', 71: '71-Php-morphgnt.txt', 72: '72-Col-morphgnt.txt',
  73: '73-1Th-morphgnt.txt', 74: '74-2Th-morphgnt.txt', 75: '75-1Ti-morphgnt.txt',
  76: '76-2Ti-morphgnt.txt', 77: '77-Tit-morphgnt.txt', 78: '78-Phm-morphgnt.txt',
  79: '79-Heb-morphgnt.txt', 80: '80-Jas-morphgnt.txt', 81: '81-1Pe-morphgnt.txt',
  82: '82-2Pe-morphgnt.txt', 83: '83-1Jn-morphgnt.txt', 84: '84-2Jn-morphgnt.txt',
  85: '85-3Jn-morphgnt.txt', 86: '86-Jud-morphgnt.txt', 87: '87-Re-morphgnt.txt',
};

const BASE_URL = 'https://raw.githubusercontent.com/morphgnt/sblgnt/master/';

// SBLGNT 비평 기호 제거 (⸀⸁⸂⸃ 등), 구두점은 유지
const VARIANT_MARKERS = /[⸀⸁⸂⸃⌞⌟]/g;

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseFile(text) {
  // 결과: { chapter: { verse: [word, word, ...] } }
  const book = {};

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 형식: BBCCVV POS Morphology Word Normalized NormalizedAlt Lemma
    const parts = trimmed.split(/\s+/);
    if (parts.length < 5) continue;

    const ref  = parts[0]; // e.g. "020101"
    const ch   = String(parseInt(ref.slice(2, 4), 10));
    const vs   = String(parseInt(ref.slice(4, 6), 10));
    const word = parts[3].replace(VARIANT_MARKERS, ''); // 실제 굴절형, 비평기호 제거

    if (!book[ch]) book[ch] = {};
    if (!book[ch][vs]) book[ch][vs] = [];
    book[ch][vs].push(word);
  }

  // 단어 배열 → 구절 텍스트 (공백 결합)
  const result = {};
  for (const ch of Object.keys(book)) {
    result[ch] = {};
    for (const vs of Object.keys(book[ch])) {
      result[ch][vs] = book[ch][vs].join(' ');
    }
  }
  return result;
}

async function main() {
  const outDir = path.join(__dirname, '..', 'public', 'sblgnt');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const fileNums = Object.keys(FILE_NAMES).map(Number).sort((a, b) => a - b);
  let done = 0;

  for (const num of fileNums) {
    const bookId   = FILE_TO_BOOK_ID[num];
    const fileName = FILE_NAMES[num];
    const url      = BASE_URL + fileName;

    process.stdout.write(`[${++done}/27] ${bookId} (${fileName}) ... `);
    try {
      const text = await fetch(url);
      const data = parseFile(text);
      const chapters = Object.keys(data).length;
      const verses   = Object.values(data).reduce((s, ch) => s + Object.keys(ch).length, 0);
      fs.writeFileSync(
        path.join(outDir, `${bookId}.json`),
        JSON.stringify(data),
      );
      console.log(`✓  ${chapters}장 ${verses}절`);
    } catch (e) {
      console.log(`✗  ${e.message}`);
    }
  }

  console.log('\n완료 → public/sblgnt/');
}

main().catch((e) => { console.error(e); process.exit(1); });
