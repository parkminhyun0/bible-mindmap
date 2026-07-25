#!/usr/bin/env node
// parse-oshb.mjs — OSHB (Open Scriptures Hebrew Bible) WLC XML → Ketiv/Qere variants JSON
// 사용: node scripts/parse-oshb.mjs [BookId]
//   인자 없으면 39권 OT 전체
//   인자 있으면 해당 책만 (예: node scripts/parse-oshb.mjs Gen)
// 출력: public/data/variants/{BookId}.json (SBLGNT variants와 동일 포맷 · source='oshb')
// 근거: openscriptures/morphhb · CC BY 4.0 · WLC Ketiv/Qere 마소라 표기

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CACHE_DIR = join(ROOT, '.oshb-cache')
const OUT_DIR = join(ROOT, 'public/data/variants')

const BASE_URL = 'https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc'

// 39권 OT 매핑 (STEPBible ID → OSHB XML 파일명)
const OT_BOOKS = {
  Gen: 'Gen.xml', Exod: 'Exod.xml', Lev: 'Lev.xml', Num: 'Num.xml', Deut: 'Deut.xml',
  Josh: 'Josh.xml', Judg: 'Judg.xml', Ruth: 'Ruth.xml',
  '1Sam': '1Sam.xml', '2Sam': '2Sam.xml', '1Kgs': '1Kgs.xml', '2Kgs': '2Kgs.xml',
  '1Chr': '1Chr.xml', '2Chr': '2Chr.xml',
  Ezra: 'Ezra.xml', Neh: 'Neh.xml', Esth: 'Esth.xml',
  Job: 'Job.xml', Ps: 'Ps.xml', Prov: 'Prov.xml', Eccl: 'Eccl.xml', Song: 'Song.xml',
  Isa: 'Isa.xml', Jer: 'Jer.xml', Lam: 'Lam.xml', Ezek: 'Ezek.xml', Dan: 'Dan.xml',
  Hos: 'Hos.xml', Joel: 'Joel.xml', Amos: 'Amos.xml', Obad: 'Obad.xml', Jonah: 'Jonah.xml',
  Mic: 'Mic.xml', Nah: 'Nah.xml', Hab: 'Hab.xml', Zeph: 'Zeph.xml',
  Hag: 'Hag.xml', Zech: 'Zech.xml', Mal: 'Mal.xml',
}

try { mkdirSync(CACHE_DIR, { recursive: true }) } catch {}
try { mkdirSync(OUT_DIR, { recursive: true }) } catch {}

async function fetchOrCache(bookId) {
  const file = OT_BOOKS[bookId]
  if (!file) throw new Error(`Unknown OT book: ${bookId}`)
  const cachePath = join(CACHE_DIR, file)
  if (existsSync(cachePath)) {
    console.log(`[${bookId}] 캐시에서 로드`)
    return readFileSync(cachePath, 'utf8')
  }
  console.log(`[${bookId}] 다운로드: ${BASE_URL}/${file}`)
  const res = await fetch(`${BASE_URL}/${file}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const text = await res.text()
  writeFileSync(cachePath, text, 'utf8')
  return text
}

// XML에서 Hebrew 텍스트 정리 (모음·악센트·구두점 유지)
function cleanHebrew(s) {
  if (!s) return ''
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

// OSHB Ketiv/Qere 파싱 (verse 단위)
//   <w type="x-ketiv" ...>KETIV</w>
//   <note type="variant">
//     <catchWord>KETIV</catchWord>
//     <rdg type="x-qere"><w ...>QERE</w></rdg>
//   </note>
function parseVersesKQ(xml, bookId) {
  const variants = []
  // verse 블록 추출: <verse osisID="Book.CH.V">...(next verse or /chapter)
  const verseRE = /<verse\s+osisID="([^"]+)"[^>]*\/?>([\s\S]*?)(?=<verse\s+osisID=|<\/chapter>)/g
  let vm
  while ((vm = verseRE.exec(xml)) !== null) {
    const [, osisID, body] = vm
    const parts = osisID.split('.')
    if (parts.length !== 3 || parts[0] !== bookId) continue
    const chapter = parseInt(parts[1], 10)
    const verse   = parseInt(parts[2], 10)
    if (!Number.isFinite(chapter) || !Number.isFinite(verse)) continue

    // Ketiv/Qere 페어 찾기
    // <w type="x-ketiv" ...>KETIV_TEXT</w> [whitespace] <note type="variant"> ... <rdg type="x-qere"><w ...>QERE_TEXT</w>...</rdg> ... </note>
    const kqRE = /<w\s+type="x-ketiv"[^>]*>([^<]+)<\/w>\s*<note\s+type="variant">[\s\S]*?<rdg\s+type="x-qere">([\s\S]*?)<\/rdg>\s*<\/note>/g
    let km
    while ((km = kqRE.exec(body)) !== null) {
      const ketivRaw = km[1]
      const qereBlock = km[2]
      // Qere 안의 <w>...</w> 텍스트 추출
      const qMatch = /<w[^>]*>([^<]+)<\/w>/g
      let qtxt = ''
      let qm
      while ((qm = qMatch.exec(qereBlock)) !== null) {
        qtxt += (qtxt ? ' ' : '') + qm[1]
      }
      const ketiv = cleanHebrew(ketivRaw)
      const qere  = cleanHebrew(qtxt)
      if (!ketiv || !qere) continue
      variants.push({
        bookId,
        chapter,
        verse,
        type: 'substitution',
        source: 'oshb', // ← 자동 감지 · UI 구분용
        title: `Ketiv/Qere · ${ketiv} / ${qere}`,
        summary: `마소라 자음 텍스트(Ketiv): ${ketiv} · 마소라 학자 낭독(Qere): ${qere}. 서기관들이 원문 자음은 보존하되 낭독은 수정된 형태로 하도록 표기.`,
        witnesses: {
          variants: {
            ketiv: `${ketiv} (자음: 기록된 형태)`,
            qere:  `${qere} (읽기: 낭독 형태)`,
          },
        },
        metzger: 'C', // 마소라 표기는 표준 · 낭독 전통 정착
        translations: {
          krv: 'Qere 따라 번역 (마소라 낭독 전통)',
          esv: 'Qere 따라 번역 (표준)',
        },
        significance: '마소라 서기관들이 원문 자음(Ketiv)은 보존하되 낭독(Qere)은 수정 형태로 표기한 표준 사본 편집 · 문법·표기·완곡 어법 등 다양한 원인.',
        refs: [
          'OSHB (Open Scriptures Hebrew Bible · openscriptures/morphhb · CC BY 4.0)',
          'WLC (Westminster Leningrad Codex, 파블릭 도메인) 마소라 Ketiv/Qere 표기 자동 파싱',
          '⚠ 학술 검증: BHS·BHQ·DSS 1차 자료 대조 권장',
        ],
      })
    }
  }
  return variants
}

async function processBook(bookId) {
  const xml = await fetchOrCache(bookId)
  const variants = parseVersesKQ(xml, bookId)
  const outPath = join(OUT_DIR, `${bookId}.json`)
  // 기존 파일과 병합? OT는 지금까지 curated (하드코딩) 방식이라 파일 없음.
  // 만약 있다면 병합 (source 필드로 구분)
  let existing = []
  if (existsSync(outPath)) {
    try {
      const raw = JSON.parse(readFileSync(outPath, 'utf8'))
      existing = Array.isArray(raw) ? raw : (raw.variants || [])
    } catch { /* ignore */ }
  }
  // OSHB source가 아닌 기존 항목만 유지 (재실행 시 OSHB만 갱신)
  const kept = existing.filter((v) => v.source !== 'oshb')
  const merged = [...kept, ...variants]
  writeFileSync(outPath, JSON.stringify(merged), 'utf8')
  console.log(`[${bookId}] Ketiv/Qere ${variants.length}건 + 기존 ${kept.length}건 = 총 ${merged.length}건 → ${outPath}`)
  return { bookId, oshb: variants.length, kept: kept.length, total: merged.length }
}

// ── 메인 ──────────────────────────────────────────────
const target = process.argv[2]
const targets = target ? [target] : Object.keys(OT_BOOKS)

if (target && !OT_BOOKS[target]) {
  console.error(`❌ ${target}: OT 책 아님. 지원 목록: ${Object.keys(OT_BOOKS).join(', ')}`)
  process.exit(1)
}

console.log(`🔍 parse-oshb · 대상: ${targets.length}권 (${targets.join(', ')})`)
console.log('')

let totalOshb = 0, totalBooks = 0
for (const bookId of targets) {
  try {
    const r = await processBook(bookId)
    totalOshb += r.oshb
    totalBooks++
  } catch (err) {
    console.error(`❌ [${bookId}]: ${err.message}`)
  }
}

console.log('')
console.log(`✅ 완료 · ${totalBooks}권 · Ketiv/Qere 자동 ${totalOshb}건`)
console.log(`   출력 위치: ${OUT_DIR}/`)
