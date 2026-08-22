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
import { KOREAN_GLOSS_TOP_BATCH_07, KOREAN_GLOSS_TOP_BATCH_07_META } from './koreanGlossTopBatch07.js';
import { KOREAN_GLOSS_TOP_BATCH_08, KOREAN_GLOSS_TOP_BATCH_08_META } from './koreanGlossTopBatch08.js';
import { KOREAN_GLOSS_TOP_BATCH_09, KOREAN_GLOSS_TOP_BATCH_09_META } from './koreanGlossTopBatch09.js';
import { KOREAN_GLOSS_TOP_BATCH_10, KOREAN_GLOSS_TOP_BATCH_10_META } from './koreanGlossTopBatch10.js';
import { KOREAN_GLOSS_TOP_BATCH_11, KOREAN_GLOSS_TOP_BATCH_11_META } from './koreanGlossTopBatch11.js';
import { KOREAN_GLOSS_TOP_BATCH_12, KOREAN_GLOSS_TOP_BATCH_12_META } from './koreanGlossTopBatch12.js';
import { KOREAN_GLOSS_TOP_BATCH_13, KOREAN_GLOSS_TOP_BATCH_13_META } from './koreanGlossTopBatch13.js';
import { KOREAN_GLOSS_TOP_BATCH_14, KOREAN_GLOSS_TOP_BATCH_14_META } from './koreanGlossTopBatch14.js';
import { KOREAN_GLOSS_TOP_BATCH_15, KOREAN_GLOSS_TOP_BATCH_15_META } from './koreanGlossTopBatch15.js';
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
  { entries: KOREAN_GLOSS_TOP_BATCH_07, meta: KOREAN_GLOSS_TOP_BATCH_07_META },
  { entries: KOREAN_GLOSS_TOP_BATCH_08, meta: KOREAN_GLOSS_TOP_BATCH_08_META },
  { entries: KOREAN_GLOSS_TOP_BATCH_09, meta: KOREAN_GLOSS_TOP_BATCH_09_META },
  { entries: KOREAN_GLOSS_TOP_BATCH_10, meta: KOREAN_GLOSS_TOP_BATCH_10_META },
  { entries: KOREAN_GLOSS_TOP_BATCH_11, meta: KOREAN_GLOSS_TOP_BATCH_11_META },
  { entries: KOREAN_GLOSS_TOP_BATCH_12, meta: KOREAN_GLOSS_TOP_BATCH_12_META },
  { entries: KOREAN_GLOSS_TOP_BATCH_13, meta: KOREAN_GLOSS_TOP_BATCH_13_META },
  { entries: KOREAN_GLOSS_TOP_BATCH_14, meta: KOREAN_GLOSS_TOP_BATCH_14_META },
  { entries: KOREAN_GLOSS_TOP_BATCH_15, meta: KOREAN_GLOSS_TOP_BATCH_15_META },
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
  ...KOREAN_GLOSS_TOP_BATCH_07,
  ...KOREAN_GLOSS_TOP_BATCH_08,
  ...KOREAN_GLOSS_TOP_BATCH_09,
  ...KOREAN_GLOSS_TOP_BATCH_10,
  ...KOREAN_GLOSS_TOP_BATCH_11,
  ...KOREAN_GLOSS_TOP_BATCH_12,
  ...KOREAN_GLOSS_TOP_BATCH_13,
  ...KOREAN_GLOSS_TOP_BATCH_14,
  ...KOREAN_GLOSS_TOP_BATCH_15,
  ...KOREAN_GLOSS_GENESIS_1_BATCH_01,
  ...KOREAN_GLOSS_GENESIS_1_BATCH_02,
};

export const KOREAN_GLOSS_ACTIVE_META = {
  baselineCount: Object.keys(KOREAN_GLOSS).length,
  batchCount: KOREAN_GLOSS_BATCHES.length,
  extensionCount: KOREAN_GLOSS_BATCHES.reduce((n, b) => n + Object.keys(b.entries).length, 0),
};
