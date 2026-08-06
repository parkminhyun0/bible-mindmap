import { BIBLICAL_PEOPLE_T1 } from '../src/data/biblicalPeople.js';
import { BIBLICAL_PERIODS } from '../src/data/biblicalPeriods.js';
import { BIBLICAL_PLACE_PROFILES } from '../src/data/bibleReferences.js';

const EXPECTED_IDS = [
  'adam', 'noah', 'abraham', 'sarah', 'isaac', 'jacob', 'joseph', 'moses',
  'aaron', 'joshua', 'deborah', 'gideon', 'samson', 'ruth', 'samuel', 'saul',
  'david', 'solomon', 'elijah', 'elisha', 'hezekiah', 'isaiah', 'josiah',
  'jeremiah', 'ezekiel', 'daniel', 'ezra', 'nehemiah', 'esther', 'mary-mother',
  'john-baptist', 'jesus', 'peter', 'john-apostle', 'stephen', 'paul', 'barnabas',
  'timothy',
];
const REQUIRED_FIELDS = ['id','name','aliases','testament','periodId','placeIds','bibleRefs','role','summary','certainty','relatedPeople'];
const TESTAMENTS = new Set(['ot','nt']);
const CERTAINTIES = new Set(['confirmed','estimated','debated']);
const periodIds = new Set(BIBLICAL_PERIODS.map((period) => period.id));
const placeIds = new Set(Object.keys(BIBLICAL_PLACE_PROFILES));
const peopleIds = new Set(BIBLICAL_PEOPLE_T1.map((person) => person.id));
const issues = [];
const fail = (message) => issues.push(message);
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const refPattern = /^[가-힣A-Za-z0-9·:–—\-\s]+$/u;

if (BIBLICAL_PEOPLE_T1.length !== 38) fail(`T1 인물 수는 정확히 38명이어야 합니다: ${BIBLICAL_PEOPLE_T1.length}`);
if (peopleIds.size !== BIBLICAL_PEOPLE_T1.length) fail('중복 인물 ID가 있습니다.');
if (JSON.stringify(BIBLICAL_PEOPLE_T1.map((person) => person.id)) !== JSON.stringify(EXPECTED_IDS)) {
  fail('Notion 카드에 고정된 T1 38명 로스터 또는 순서와 다릅니다.');
}

for (const person of BIBLICAL_PEOPLE_T1) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in person)) fail(`${person.id}: 필수 필드 ${field} 누락`);
  }
  if (!idPattern.test(person.id)) fail(`${person.id}: id는 안정적인 kebab-case여야 합니다.`);
  if (!String(person.name || '').trim()) fail(`${person.id}: 한글 표준명 누락`);
  if (!Array.isArray(person.aliases)) fail(`${person.id}: aliases는 배열이어야 합니다.`);
  if (!TESTAMENTS.has(person.testament)) fail(`${person.id}: testament는 ot 또는 nt여야 합니다.`);
  if (!periodIds.has(person.periodId)) fail(`${person.id}: 존재하지 않는 periodId ${person.periodId}`);
  if (!CERTAINTIES.has(person.certainty)) fail(`${person.id}: certainty 값이 허용 목록과 다릅니다.`);
  if (!String(person.role || '').trim()) fail(`${person.id}: role 누락`);
  if (String(person.summary || '').length < 25 || String(person.summary || '').length > 180) {
    fail(`${person.id}: summary는 25~180자여야 합니다.`);
  }

  if (!Array.isArray(person.placeIds)) {
    fail(`${person.id}: placeIds는 배열이어야 합니다.`);
  } else {
    for (const placeId of person.placeIds) {
      if (!placeIds.has(placeId)) fail(`${person.id}: 존재하지 않는 placeId ${placeId}`);
    }
  }

  if (!Array.isArray(person.bibleRefs) || person.bibleRefs.length < 1 || person.bibleRefs.length > 6) {
    fail(`${person.id}: bibleRefs는 1~6개여야 합니다.`);
  } else {
    for (const ref of person.bibleRefs) {
      if (typeof ref !== 'string' || ref.length < 2 || ref.length > 80 || !refPattern.test(ref)) {
        fail(`${person.id}: 허용되지 않는 bibleRef 형식 ${JSON.stringify(ref)}`);
      }
    }
  }

  if (!Array.isArray(person.relatedPeople)) {
    fail(`${person.id}: relatedPeople은 배열이어야 합니다.`);
  } else {
    for (const relatedId of person.relatedPeople) {
      if (!peopleIds.has(relatedId)) fail(`${person.id}: 미등록 relatedPeople ID ${relatedId}`);
      if (relatedId === person.id) fail(`${person.id}: 자기 자신을 relatedPeople에 연결할 수 없습니다.`);
    }
  }
}

const jesus = BIBLICAL_PEOPLE_T1.find((person) => person.id === 'jesus');
if (!jesus || !jesus.role.includes('그리스도') || !jesus.role.includes('주') || !jesus.summary.includes('성자 하나님')) {
  fail('예수 인물의 장로교 개혁주의 신학 게이트(그리스도·주·성자 하나님)가 누락되었습니다.');
}

console.log(`성경 인물 T1 verifier · people=${BIBLICAL_PEOPLE_T1.length} periods=${periodIds.size} curatedPlaces=${placeIds.size}`);
if (issues.length) {
  console.error('✗ 성경 인물 T1 검증 실패');
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}
console.log('✓ T1 38명 · 고정 스키마 · 시대/장소/관련인물 · 신학 게이트 통과');
