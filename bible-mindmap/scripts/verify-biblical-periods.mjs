import {
  BIBLICAL_PERIODS,
  BIBLICAL_PERIOD_GROUPS,
} from '../src/data/biblicalPeriods.js';

const ALLOWED_TESTAMENTS = new Set(['ot', 'nt', 'both']);
const ALLOWED_CERTAINTY = new Set(['confirmed', 'estimated', 'debated']);
const groupIds = new Set(BIBLICAL_PERIOD_GROUPS.map((group) => group.id));
const errors = [];

if (BIBLICAL_PERIOD_GROUPS.length < 7) {
  errors.push(`시대 대분류가 너무 적습니다: ${BIBLICAL_PERIOD_GROUPS.length}`);
}

if (BIBLICAL_PERIODS.length < 35) {
  errors.push(`세부 시대가 35개 미만입니다: ${BIBLICAL_PERIODS.length}`);
}

const ids = new Set();
for (let index = 0; index < BIBLICAL_PERIODS.length; index += 1) {
  const period = BIBLICAL_PERIODS[index];
  const prefix = `[${period?.id || index}]`;

  if (!period?.id || ids.has(period.id)) errors.push(`${prefix} id 누락/중복`);
  ids.add(period?.id);

  if (period.sequence !== index + 1) {
    errors.push(`${prefix} sequence=${period.sequence}, expected=${index + 1}`);
  }
  if (!groupIds.has(period.group)) errors.push(`${prefix} 알 수 없는 group=${period.group}`);
  if (!ALLOWED_TESTAMENTS.has(period.testament)) errors.push(`${prefix} 잘못된 testament=${period.testament}`);
  if (!ALLOWED_CERTAINTY.has(period.certainty)) errors.push(`${prefix} 잘못된 certainty=${period.certainty}`);

  for (const field of ['name', 'range', 'summary', 'transition', 'politicalContext']) {
    if (!period[field] || String(period[field]).trim().length < 4) {
      errors.push(`${prefix} ${field} 누락/불충분`);
    }
  }

  if (!Array.isArray(period.events) || period.events.length < 3) {
    errors.push(`${prefix} events 3개 미만`);
  }
  if (!Array.isArray(period.bibleTags) || period.bibleTags.length < 1) {
    errors.push(`${prefix} bibleTags 누락`);
  }
}

const counts = BIBLICAL_PERIODS.reduce((acc, period) => {
  acc[period.testament] = (acc[period.testament] || 0) + 1;
  return acc;
}, {});

if ((counts.ot || 0) < 20) errors.push(`구약 세부 시대 부족: ${counts.ot || 0}`);
if ((counts.both || 0) < 5) errors.push(`제2성전/중간시대 세부 구간 부족: ${counts.both || 0}`);
if ((counts.nt || 0) < 10) errors.push(`신약 세부 시대 부족: ${counts.nt || 0}`);

const requiredAnchors = [
  'assyrian-crisis',
  'late-judah-babylon',
  'babylonian-exile',
  'early-persian-return',
  'alexander-successors',
  'maccabean-revolt',
  'roman-herodian',
  'passion-resurrection-pentecost',
  'jerusalem-church',
  'paul-first-council',
  'paul-second-journey',
  'paul-third-journey',
  'paul-arrest-rome',
  'post70-late-apostolic',
];
for (const id of requiredAnchors) {
  if (!ids.has(id)) errors.push(`핵심 전환 시대 누락: ${id}`);
}

if (errors.length) {
  console.error('✗ 성경 시대 DB 검증 실패');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `✓ 성경 시대 DB 검증: ${BIBLICAL_PERIOD_GROUPS.length}개 대분류 / ${BIBLICAL_PERIODS.length}개 세부 시대 `
  + `(OT ${counts.ot || 0} · Bridge ${counts.both || 0} · NT ${counts.nt || 0})`,
);
