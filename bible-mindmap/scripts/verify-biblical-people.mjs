import { BIBLICAL_PEOPLE_T1 } from '../src/data/biblicalPeople.js';
import { BIBLICAL_PEOPLE_T2 } from '../src/data/biblicalPeopleT2.js';
import { BIBLICAL_PEOPLE_T3 } from '../src/data/biblicalPeopleT3.js';
import {
  BIBLICAL_PEOPLE,
  BIBLICAL_PEOPLE_BY_ID,
  BIBLICAL_PEOPLE_TIERS,
} from '../src/data/biblicalPeopleRegistry.js';
import { BIBLICAL_PERIODS } from '../src/data/biblicalPeriods.js';
import { BIBLICAL_PLACE_PROFILES } from '../src/data/bibleReferences.js';

const EXPECTED_T1_IDS = [
  'adam', 'noah', 'abraham', 'sarah', 'isaac', 'jacob', 'joseph', 'moses',
  'aaron', 'joshua', 'deborah', 'gideon', 'samson', 'ruth', 'samuel', 'saul',
  'david', 'solomon', 'elijah', 'elisha', 'hezekiah', 'isaiah', 'josiah',
  'jeremiah', 'ezekiel', 'daniel', 'ezra', 'nehemiah', 'esther', 'mary-mother',
  'john-baptist', 'jesus', 'peter', 'john-apostle', 'stephen', 'paul', 'barnabas',
  'timothy',
];
const EXPECTED_T2_IDS = [
  'enoch', 'shem', 'lot', 'hagar', 'ishmael', 'esau', 'leah', 'judah',
  'benjamin', 'miriam', 'caleb', 'rahab', 'barak', 'naomi', 'boaz', 'eli',
  'hannah', 'jonathan', 'abigail', 'nathan-prophet', 'bathsheba', 'absalom',
  'rehoboam', 'jeroboam-i', 'ahab', 'jezebel', 'amos', 'hosea',
  'joseph-husband-mary', 'elizabeth', 'zechariah-priest', 'mary-magdalene',
  'martha', 'lazarus-bethany', 'andrew', 'james-zebedee', 'matthew-apostle',
  'thomas', 'philip-apostle', 'nicodemus', 'joseph-arimathea',
  'james-brother-jesus', 'philip-evangelist', 'cornelius',
];
const EXPECTED_T3_IDS = [
  'methuselah', 'lamech-noah-father', 'melchizedek', 'rebekah', 'rachel',
  'laban', 'reuben', 'levi', 'ephraim', 'manasseh-joseph-son', 'jethro',
  'bezalel', 'korah', 'balaam', 'phinehas-aaron-grandson', 'achan', 'othniel',
  'ehud', 'jephthah', 'jael', 'elimelech', 'obed', 'ichabod', 'nabal', 'joab',
  'mephibosheth', 'uriah-hittite', 'gad-prophet', 'abishag', 'adonijah',
  'zadok-priest', 'ahijah-shilonite', 'asa', 'jehoshaphat', 'jehu-king',
  'joash-judah', 'uzziah', 'micah-prophet', 'nahum', 'habakkuk', 'haggai',
  'zechariah-prophet', 'mordecai', 'zerubbabel',
];
const REQUIRED_FIELDS = [
  'id', 'name', 'aliases', 'testament', 'periodId', 'placeIds', 'bibleRefs',
  'role', 'summary', 'certainty', 'relatedPeople',
];
const TESTAMENTS = new Set(['ot', 'nt']);
const CERTAINTIES = new Set(['confirmed', 'estimated', 'debated']);
const periodIds = new Set(BIBLICAL_PERIODS.map((period) => period.id));
const placeIds = new Set(Object.keys(BIBLICAL_PLACE_PROFILES));
const peopleIds = new Set(BIBLICAL_PEOPLE.map((person) => person.id));
const issues = [];
const fail = (message) => issues.push(message);
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const refPattern = /^[가-힣A-Za-z0-9·:–—\-\s]+$/u;

function verifyRoster(label, people, expectedIds) {
  if (people.length !== expectedIds.length) {
    fail(`${label} 인물 수 불일치: expected=${expectedIds.length} actual=${people.length}`);
  }
  if (JSON.stringify(people.map((person) => person.id)) !== JSON.stringify(expectedIds)) {
    fail(`${label} 승인 로스터 또는 순서와 다릅니다.`);
  }
}

verifyRoster('T1', BIBLICAL_PEOPLE_T1, EXPECTED_T1_IDS);
verifyRoster('T2', BIBLICAL_PEOPLE_T2, EXPECTED_T2_IDS);
verifyRoster('T3', BIBLICAL_PEOPLE_T3, EXPECTED_T3_IDS);

if (BIBLICAL_PEOPLE.length !== 126) fail(`통합 인물 수는 126명이어야 합니다: ${BIBLICAL_PEOPLE.length}`);
if (peopleIds.size !== BIBLICAL_PEOPLE.length) fail('T1~T3 사이에 중복 인물 ID가 있습니다.');
if (Object.keys(BIBLICAL_PEOPLE_BY_ID).length !== BIBLICAL_PEOPLE.length) {
  fail('BIBLICAL_PEOPLE_BY_ID 통합 색인 수가 전체 인물 수와 다릅니다.');
}
if (BIBLICAL_PEOPLE_TIERS.length !== 3
  || BIBLICAL_PEOPLE_TIERS[0]?.count !== 38
  || BIBLICAL_PEOPLE_TIERS[1]?.count !== 44
  || BIBLICAL_PEOPLE_TIERS[2]?.count !== 44) {
  fail('T1/T2/T3 티어 레지스트리 수량 계약이 잘못되었습니다.');
}

for (const person of BIBLICAL_PEOPLE) {
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

const jesus = BIBLICAL_PEOPLE_BY_ID.jesus;
if (!jesus || !jesus.role.includes('그리스도') || !jesus.role.includes('주') || !jesus.summary.includes('성자 하나님')) {
  fail('예수 인물의 장로교 개혁주의 신학 게이트가 누락되었습니다.');
}
const cornelius = BIBLICAL_PEOPLE_BY_ID.cornelius;
if (!cornelius || !cornelius.summary.includes('성령')) {
  fail('고넬료 인물의 성령 강림 서술 게이트가 누락되었습니다.');
}

console.log(`성경 인물 verifier · T1=${BIBLICAL_PEOPLE_T1.length} T2=${BIBLICAL_PEOPLE_T2.length} T3=${BIBLICAL_PEOPLE_T3.length} total=${BIBLICAL_PEOPLE.length}`);
console.log(`periods=${periodIds.size} curatedPlaces=${placeIds.size}`);
if (issues.length) {
  console.error('✗ 성경 인물 T1~T3 검증 실패');
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}
console.log('✓ T1 38명 + T2 44명 + T3 44명 · 통합 126명 계약 통과');
