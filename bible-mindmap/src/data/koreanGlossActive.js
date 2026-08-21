// 런타임 한글 음역 사전 등록부.
//
// **이 파일은 scripts/build-korean-gloss-registry.mjs 가 만든다. 손으로 고치지 마라.**
// 배치를 더하려면 src/data/koreanGloss{TopBatch|Genesis1Batch}NN.js 를 놓고
// 스크립트를 다시 돌려라. 충돌이 나면 어느 쪽을 택하든 다시 돌리면 정답이 된다.
//
// 적용 순서: 파일럿 baseline → 빈도 상위 배치(번호 순) → 창세기 1장 배치(번호 순).
// 뒤에 오는 것이 앞을 덮는다. 창세기 배치는 본문을 직접 검토해 만든 것이라
// 빈도 배치보다 뒤에 둔다.

import { KOREAN_GLOSS } from './koreanGloss.js';
import { KOREAN_GLOSS_TOP_BATCH_01, KOREAN_GLOSS_TOP_BATCH_01_META } from './koreanGlossTopBatch01.js';
import { KOREAN_GLOSS_TOP_BATCH_02, KOREAN_GLOSS_TOP_BATCH_02_META } from './koreanGlossTopBatch02.js';
import { KOREAN_GLOSS_TOP_BATCH_03, KOREAN_GLOSS_TOP_BATCH_03_META } from './koreanGlossTopBatch03.js';
import { KOREAN_GLOSS_TOP_BATCH_04, KOREAN_GLOSS_TOP_BATCH_04_META } from './koreanGlossTopBatch04.js';
import { KOREAN_GLOSS_TOP_BATCH_05, KOREAN_GLOSS_TOP_BATCH_05_META } from './koreanGlossTopBatch05.js';
import { KOREAN_GLOSS_TOP_BATCH_06, KOREAN_GLOSS_TOP_BATCH_06_META } from './koreanGlossTopBatch06.js';
import { KOREAN_GLOSS_GENESIS_1_BATCH_01, KOREAN_GLOSS_GENESIS_1_BATCH_01_META } from './koreanGlossGenesis1Batch01.js';
import { KOREAN_GLOSS_GENESIS_1_BATCH_02, KOREAN_GLOSS_GENESIS_1_BATCH_02_META } from './koreanGlossGenesis1Batch02.js';

// 검증기·리포트가 배치를 순회할 때 쓴다. 배치가 늘어도 소비하는 쪽은 고칠 일이 없다.
export const KOREAN_GLOSS_BATCHES = [
  { entries: KOREAN_GLOSS_TOP_BATCH_01, meta: KOREAN_GLOSS_TOP_BATCH_01_META },
  { entries: KOREAN_GLOSS_TOP_BATCH_02, meta: KOREAN_GLOSS_TOP_BATCH_02_META },
  { entries: KOREAN_GLOSS_TOP_BATCH_03, meta: KOREAN_GLOSS_TOP_BATCH_03_META },
  { entries: KOREAN_GLOSS_TOP_BATCH_04, meta: KOREAN_GLOSS_TOP_BATCH_04_META },
  { entries: KOREAN_GLOSS_TOP_BATCH_05, meta: KOREAN_GLOSS_TOP_BATCH_05_META },
  { entries: KOREAN_GLOSS_TOP_BATCH_06, meta: KOREAN_GLOSS_TOP_BATCH_06_META },
  { entries: KOREAN_GLOSS_GENESIS_1_BATCH_01, meta: KOREAN_GLOSS_GENESIS_1_BATCH_01_META },
  { entries: KOREAN_GLOSS_GENESIS_1_BATCH_02, meta: KOREAN_GLOSS_GENESIS_1_BATCH_02_META },
];

export const KOREAN_GLOSS_ACTIVE = {
  ...KOREAN_GLOSS,
  ...KOREAN_GLOSS_TOP_BATCH_01,
  ...KOREAN_GLOSS_TOP_BATCH_02,
  ...KOREAN_GLOSS_TOP_BATCH_03,
  ...KOREAN_GLOSS_TOP_BATCH_04,
  ...KOREAN_GLOSS_TOP_BATCH_05,
  ...KOREAN_GLOSS_TOP_BATCH_06,
  ...KOREAN_GLOSS_GENESIS_1_BATCH_01,
  ...KOREAN_GLOSS_GENESIS_1_BATCH_02,
};

export const KOREAN_GLOSS_ACTIVE_META = {
  baselineCount: Object.keys(KOREAN_GLOSS).length,
  batchCount: KOREAN_GLOSS_BATCHES.length,
  extensionCount: KOREAN_GLOSS_BATCHES.reduce((n, b) => n + Object.keys(b.entries).length, 0),
};
