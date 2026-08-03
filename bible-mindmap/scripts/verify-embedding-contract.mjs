import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEmbeddingResult, validateEmbeddingInput } from './ai/retrieval/embedding-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const requiredFiles = [
  'scripts/ai/retrieval/embedding-contract.mjs',
  'scripts/ai/providers/nvidia-embeddings.mjs',
];

for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(root, relative))) errors.push(`${relative} 누락`);
}

try {
  validateEmbeddingInput({ texts: ['언약과 씨'], task: 'query' });
  normalizeEmbeddingResult({ provider: 'fixture', model: 'fixture-model', task: 'query', vectors: [Array(8).fill(0.125)] });
} catch (error) {
  errors.push(`embedding contract self-check 실패: ${error.message}`);
}

try {
  validateEmbeddingInput({ texts: [], task: 'query' });
  errors.push('빈 texts 입력이 거부되지 않음');
} catch {}

try {
  normalizeEmbeddingResult({ provider: 'fixture', model: 'fixture-model', task: 'query', vectors: [[0, 1], [0, 1, 2]] });
  errors.push('벡터 차원 불일치가 거부되지 않음');
} catch {}

const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
if (!envExample.includes('NVIDIA_EMBEDDING_MODEL_ID=')) errors.push('.env.example에 NVIDIA_EMBEDDING_MODEL_ID 누락');

if (errors.length) {
  console.error(`✗ Embedding 계약 검증 실패 (${errors.length}건)`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log('✓ Embedding 계약 통과 · 입력 한도·task·벡터 차원·provider adapter 경계 확인');
