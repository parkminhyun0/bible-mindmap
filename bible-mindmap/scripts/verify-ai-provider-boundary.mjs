import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src');
const errors = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const sourceFiles = walk(srcDir).filter((file) => /\.(js|jsx|ts|tsx|json)$/.test(file));
const forbidden = [
  ['NVIDIA_API_KEY', '서버 비밀키 이름이 클라이언트 src에 포함됨'],
  ['VITE_NVIDIA', 'VITE_ 접두 NVIDIA 비밀 설정은 브라우저 번들에 노출됨'],
  ['integrate.api.nvidia.com', 'NVIDIA endpoint를 클라이언트에서 직접 호출함'],
  ['api.nvcf.nvidia.com', 'NVIDIA endpoint를 클라이언트에서 직접 호출함'],
  ['OPENAI_API_KEY', 'OpenAI 서버 비밀키 이름이 클라이언트 src에 포함됨'],
  ['VITE_OPENAI', 'VITE_ 접두 OpenAI 비밀 설정은 브라우저 번들에 노출됨'],
  ['api.openai.com', 'OpenAI endpoint를 클라이언트에서 직접 호출함'],
];

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [token, message] of forbidden) {
    if (text.includes(token)) errors.push(`${path.relative(root, file)}: ${message} (${token})`);
  }
}

const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
if (!/^\.env(?:\.\*)?$/m.test(gitignore) && !/^\.env\*/m.test(gitignore)) errors.push('.gitignore: .env 계열 비밀 파일 제외 규칙이 없음');

const nvidiaProviderPath = path.join(root, 'scripts/ai/providers/nvidia.mjs');
if (!fs.existsSync(nvidiaProviderPath)) errors.push('scripts/ai/providers/nvidia.mjs 누락');
else {
  const provider = fs.readFileSync(nvidiaProviderPath, 'utf8');
  for (const required of ['NVIDIA_API_KEY', 'NVIDIA_MODEL_ID', 'AbortController', 'https://']) {
    if (!provider.includes(required)) errors.push(`nvidia adapter 필수 경계 누락: ${required}`);
  }
}

const openAiProviderPath = path.join(root, 'scripts/ai/providers/openai.mjs');
if (!fs.existsSync(openAiProviderPath)) errors.push('scripts/ai/providers/openai.mjs 누락');
else {
  const provider = fs.readFileSync(openAiProviderPath, 'utf8');
  for (const required of ['OPENAI_API_KEY', 'OPENAI_MODEL_ID', 'AbortController', '/responses', 'json_schema', 'https://']) {
    if (!provider.includes(required)) errors.push(`openai adapter 필수 서버 경계 누락: ${required}`);
  }
}

const runnerPath = path.join(root, 'scripts/ai/lexicon/run-genesis-g2-blind-translation.mjs');
if (!fs.existsSync(runnerPath)) errors.push('Genesis G2 blind translation runner 누락');
else {
  const runner = fs.readFileSync(runnerPath, 'utf8');
  for (const required of ['GENESIS_G2_TRANSLATION_EXECUTION_ENABLED', 'LEXICON_TRANSLATION_KILL_SWITCH', 'productionWriteAllowed']) {
    if (!runner.includes(required)) errors.push(`Genesis G2 실행 경계 누락: ${required}`);
  }
  const contractPath = path.join(root, 'scripts/ai/lexicon/genesis-g2-translation-contract.mjs');
  const contract = fs.existsSync(contractPath) ? fs.readFileSync(contractPath, 'utf8') : '';
  if (!contract.includes('otherProviderOutputIncluded')) errors.push('Genesis G2 블라인드 격리 계약 누락: otherProviderOutputIncluded');
}

const rerankerPath = path.join(root, 'scripts/ai/providers/nvidia-reranker.mjs');
if (!fs.existsSync(rerankerPath)) errors.push('scripts/ai/providers/nvidia-reranker.mjs 누락');
else {
  const reranker = fs.readFileSync(rerankerPath, 'utf8');
  for (const required of ['loadNvidiaTransportConfig', 'NVIDIA_RERANKER_MODEL_ID', 'AbortController', 'authorization']) {
    if (!reranker.includes(required)) errors.push(`nvidia reranker 필수 서버 경계 누락: ${required}`);
  }
}

if (process.argv.includes('--self-test')) {
  const fixture = 'const key = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_NVIDIA_API_KEY;';
  if (!fixture.includes('VITE_NVIDIA') || !fixture.includes('VITE_OPENAI')) errors.push('self-test fixture failed');
  else console.log('✓ provider boundary self-test fixtures detected');
}

if (errors.length) {
  console.error(`✗ AI provider 경계 검증 실패 (${errors.length}건)`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`✓ AI provider 경계 통과 · 클라이언트 파일 ${sourceFiles.length}개 검사 · NVIDIA/OpenAI 비밀키·직접 endpoint 없음 · 서버 전용 실행 경계 확인`);
