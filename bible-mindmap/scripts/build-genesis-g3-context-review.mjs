#!/usr/bin/env node
export const RETIRED = true
export function buildGenesisContextReview() { throw new Error('RETIRED: use FOUR_LLM_ONLY_POLICY.md') }
if (process.argv[1]?.endsWith('build-genesis-g3-context-review.mjs')) { console.error('RETIRED: use FOUR_LLM_ONLY_POLICY.md'); process.exitCode = 2 }
