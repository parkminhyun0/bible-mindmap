import { BIBLICAL_PEOPLE } from '../src/data/biblicalPeople.js';
import { BIBLICAL_PERIODS } from '../src/data/biblicalPeriods.js';
import { BIBLICAL_PLACE_PROFILES } from '../src/data/bibleReferences.js';

const EXPECTED_IDS = [
  'adam', 'eve', 'cain', 'abel', 'seth', 'noah', 'abraham', 'sarah',
  'isaac', 'rebekah', 'jacob', 'rachel', 'joseph', 'moses', 'aaron',
  'joshua', 'deborah', 'gideon', 'samson', 'samuel', 'saul', 'david',
  'solomon', 'elijah', 'elisha', 'isaiah', 'jeremiah', 'ezekiel', 'daniel',
  'esther', 'ezra', 'nehemiah', 'john-baptist', 'mary', 'peter',
  'john-apostle', 'paul', 'barnabas',
];
const REQUIRED_FIELDS = [
  'id', 'names', 'eraIds', 'roles', 'keyRefs', 'family', 'placeIds',
  'summary', 'redemptionNote', 'relatedPeople', 'sourceRefs',
];
const FAMILY_KEYS = ['parents', 'spouses', 'children', 'siblings'];
const issues = [];
const fail = (message) => issues.push(message);
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const refPattern = /^[가-힣A-Za-z0-9·:–—\-\s]+$/u;

const periodIds = new Set(BIBLICAL_PERIODS.map((period) => period.id));
const placeIds = new Set(Object.keys(BIBLICAL_PLACE_PROFILES));
const peopleById = new Map(BIBLICAL_PEOPLE.map((person) => [person.id, person]));
const actualIds = BIBLICAL_PEOPLE.map((person) => person.id);

if (BIBLICAL_PEOPLE.length !== 38) {
  fail(`인물 수는 정확히 38명이어야 합니다: ${BIBLICAL_PEOPLE.length}`);
}
if (new Set(actualIds).size !== actualIds.length) fail('중복 인물 ID가 있습니다.');
if (JSON.stringify(actualIds) !== JSON.stringify(EXPECTED_IDS)) {
  fail('T1 인물 순서 또는 ID 목록이 승인된 38명 로스터와 다릅니다.');
}

for (const person of BIBLICAL_PEOPLE) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in person)) fail(`${person.id}: 필수 필드 ${field} 누락`);
  }

  if (!idPattern.test(person.id)) fail(`${person.id}: ID는 kebab-case여야 합니다.`);
  if (!person.names || ['ko', 'en', 'original', 'transliteration'].some((key) => !String(person.names[key] || '').trim())) {
    fail(`${person.id}: names.ko/en/original/transliteration을 모두 채워야 합니다.`);
  }
  if (!Array.isArray(person.eraIds) || person.eraIds.length === 0) {
    fail(`${person.id}: eraIds는 1개 이상이어야 합니다.`);
  } else {
    for (const eraId of person.eraIds) {
      if (!periodIds.has(eraId)) fail(`${person.id}: 존재하지 않는 eraId ${eraId}`);
    }
  }
  if (!Array.isArray(person.roles) || person.roles.length === 0) {
    fail(`${person.id}: roles는 1개 이상이어야 합니다.`);
  }
  if (!Array.isArray(person.keyRefs) || person.keyRefs.length < 2 || person.keyRefs.length > 6) {
    fail(`${person.id}: keyRefs는 2~6개여야 합니다.`);
  }
  for (const ref of [...(person.keyRefs || []), ...(person.sourceRefs || [])]) {
    if (typeof ref !== 'string' || ref.length < 2 || ref.length > 80 || !refPattern.test(ref)) {
      fail(`${person.id}: 허용되지 않는 성경 참조 형식 ${JSON.stringify(ref)}`);
    }
  }

  if (!person.family || FAMILY_KEYS.some((key) => !Array.isArray(person.family[key]))) {
    fail(`${person.id}: family는 parents/spouses/children/siblings 배열을 가져야 합니다.`);
  } else {
    for (const key of FAMILY_KEYS) {
      for (const relatedId of person.family[key]) {
        if (!peopleById.has(relatedId)) fail(`${person.id}: family.${key}의 미등록 ID ${relatedId}`);
        if (relatedId === person.id) fail(`${person.id}: 자기 자신을 family.${key}에 연결할 수 없습니다.`);
      }
    }
  }

  for (const placeId of person.placeIds || []) {
    if (!placeIds.has(placeId)) fail(`${person.id}: 존재하지 않는 placeId ${placeId}`);
  }
  for (const relatedId of person.relatedPeople || []) {
    if (!peopleById.has(relatedId)) fail(`${person.id}: relatedPeople의 미등록 ID ${relatedId}`);
    if (relatedId === person.id) fail(`${person.id}: relatedPeople에 자기 자신을 넣을 수 없습니다.`);
  }

  if (String(person.summary || '').length < 25 || String(person.summary || '').length > 220) {
    fail(`${person.id}: summary는 25~220자 범위여야 합니다.`);
  }
  if (String(person.redemptionNote || '').length < 25 || String(person.redemptionNote || '').length > 240) {
    fail(`${person.id}: redemptionNote는 25~240자 범위여야 합니다.`);
  }
  if (!Array.isArray(person.sourceRefs) || person.sourceRefs.length === 0) {
    fail(`${person.id}: sourceRefs는 1개 이상이어야 합니다.`);
  }
}

for (const person of BIBLICAL_PEOPLE) {
  for (const parentId of person.family.parents) {
    if (!peopleById.get(parentId)?.family.children.includes(person.id)) {
      fail(`${person.id} ↔ ${parentId}: 부모-자녀 관계가 상호 일치하지 않습니다.`);
    }
  }
  for (const childId of person.family.children) {
    if (!peopleById.get(childId)?.family.parents.includes(person.id)) {
      fail(`${person.id} ↔ ${childId}: 자녀-부모 관계가 상호 일치하지 않습니다.`);
    }
  }
  for (const spouseId of person.family.spouses) {
    if (!peopleById.get(spouseId)?.family.spouses.includes(person.id)) {
      fail(`${person.id} ↔ ${spouseId}: 배우자 관계가 상호 일치하지 않습니다.`);
    }
  }
  for (const siblingId of person.family.siblings) {
    if (!peopleById.get(siblingId)?.family.siblings.includes(person.id)) {
      fail(`${person.id} ↔ ${siblingId}: 형제자매 관계가 상호 일치하지 않습니다.`);
    }
  }
}

console.log(`성경 인물 T1 verifier · people=${BIBLICAL_PEOPLE.length} periods=${periodIds.size} curatedPlaces=${placeIds.size}`);

if (issues.length) {
  console.error('✗ 성경 인물 T1 검증 실패');
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

console.log('✓ 성경 인물 T1 38명 · 시대/장소/관계/참조 계약 통과');
