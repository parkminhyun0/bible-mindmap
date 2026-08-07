import { KOREAN_GLOSS } from './koreanGloss.js';
import { KOREAN_GLOSS_GENESIS_1_BATCH_01 } from './koreanGlossGenesis1Batch01.js';
import { KOREAN_GLOSS_GENESIS_1_BATCH_02 } from './koreanGlossGenesis1Batch02.js';

// Runtime dictionary assembled without rewriting the reviewed 144-entry baseline.
// Candidate entries retain their review metadata so consumers can prevent unsafe auto-approval.
export const KOREAN_GLOSS_ACTIVE = {
  ...KOREAN_GLOSS,
  ...KOREAN_GLOSS_GENESIS_1_BATCH_01,
  ...KOREAN_GLOSS_GENESIS_1_BATCH_02,
};

export const KOREAN_GLOSS_ACTIVE_META = {
  baselineCount: Object.keys(KOREAN_GLOSS).length,
  extensionCount:
    Object.keys(KOREAN_GLOSS_GENESIS_1_BATCH_01).length
    + Object.keys(KOREAN_GLOSS_GENESIS_1_BATCH_02).length,
};
