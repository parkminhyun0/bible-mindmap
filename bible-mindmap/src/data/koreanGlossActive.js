import { KOREAN_GLOSS } from './koreanGloss.js';
import { KOREAN_GLOSS_GENESIS_1_BATCH_01 } from './koreanGlossGenesis1Batch01.js';
import { KOREAN_GLOSS_GENESIS_1_BATCH_02 } from './koreanGlossGenesis1Batch02.js';
import { KOREAN_GLOSS_TOP_BATCH_01 } from './koreanGlossTopBatch01.js';

// Runtime dictionary assembled without rewriting the reviewed 144-entry baseline.
// Candidate entries retain their review metadata so consumers can prevent unsafe auto-approval.
//
// 순서 주의: 뒤에 오는 것이 앞을 덮는다. 창세기 1장 배치는 해당 본문을 직접 검토해
// 만든 것이므로, 빈도 상위 배치보다 뒤에 두어 우선하게 한다.
export const KOREAN_GLOSS_ACTIVE = {
  ...KOREAN_GLOSS,
  ...KOREAN_GLOSS_TOP_BATCH_01,
  ...KOREAN_GLOSS_GENESIS_1_BATCH_01,
  ...KOREAN_GLOSS_GENESIS_1_BATCH_02,
};

export const KOREAN_GLOSS_ACTIVE_META = {
  baselineCount: Object.keys(KOREAN_GLOSS).length,
  extensionCount:
    Object.keys(KOREAN_GLOSS_GENESIS_1_BATCH_01).length
    + Object.keys(KOREAN_GLOSS_GENESIS_1_BATCH_02).length
    + Object.keys(KOREAN_GLOSS_TOP_BATCH_01).length,
};
