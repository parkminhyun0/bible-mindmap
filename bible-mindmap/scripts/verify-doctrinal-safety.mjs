// 신학 안전 verifier — 장로교 개혁주의(Reformed/Presbyterian) 기준 고정 가드
//
// 목적: <성경 마인드맵>의 모든 큐레이팅 콘텐츠(장별 curated · 학습 스캐폴딩 · 용어 사전 ·
// 인용 카드 등)에 이단·사이비의 고유 주장/명칭이 유입되지 않도록 빌드 단계에서 자동 차단한다.
//
// 설계 원칙:
//  - 정밀도 우선(precision-first): 정상적 성경 용어("여호와" · "보혜사"(요 14:16 파라클레토스) ·
//    "144000"(계 7·14장) · "미가엘"(단·유·계의 천사장) 등 단일어)는 절대 오탐하지 않는다.
//  - 이단 "고유명사"와 "명백한 이단적 단정 표현"의 다단어 signature만 하드 차단한다.
//  - 기계는 신학 전체를 판정할 수 없다 → 이 가드는 tripwire이며, 양성 기준(개혁주의)은
//    GPT 브리프·AGENTS.md·Notion "신학 기준" 선언 + 사람 검토로 병행한다.
//  - 참조: Notion "✝️ 신학 기준 (장로교 개혁주의)" · AGENTS.md 「신학 기준」

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../src/data');

// 이단·사이비 고유 signature (고유명사 + 명백한 반정통 단정). 정상 성경 용어 금지어 아님.
const HERESY_SIGNATURES = [
  // 여호와의 증인
  '여호와의 증인', '여호와의증인', '신세계역', '왕국회관', '피 수혈 금지', '수혈 거부 교리',
  '예수는 미가엘', '예수님은 미가엘', '그리스도는 미가엘', '예수 = 미가엘', '예수는 피조물', '예수님은 피조물',
  '영혼 수면', '영혼수면', '영혼 소멸설', '조건부 불멸',
  // 몰몬교(후기성도)
  '몰몬경', '몰몬교', '후기성도', '후기 성도 예수', '조셉 스미스', '조셉스미스', '니파이서', '모로나이',
  '하나님도 사람이었다', '인간도 신이 될 수 있다', '신격화 교리', 'exaltation 교리',
  // 한국 주요 이단
  '신천지', '이만희', '만민중앙', '이재록', '약속의 목자',
  '통일교', '문선명', '참부모님', '가정연합 교리', 'JMS 정명석', '정명석 교리',
  '안상홍', '어머니 하나님', '장길자', '하늘 어머니 교리', '안상홍증인회',
  // 주: "하나님의 교회"(딤전 3:15 정상 표현)는 signature에서 제외 — 안상홍 이단은 위 고유명사로만 탐지
  '구원파', '박옥수 구원파', '유병언', '전능신교', '동방번개',
  // 일반 반삼위일체·반정통 단정
  '삼위일체는 거짓', '삼위일체 부정', '삼위일체는 이교', '성령은 인격이 아니', '예수는 하나님이 아니',
  '재림주', '보혜사로 오신 이만희', '육체로 오신 보혜사',
];

const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(js|jsx|json)$/.test(name)) files.push(p);
  }
})(DATA_DIR);

const hits = [];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const lower = text.toLowerCase();
  for (const sig of HERESY_SIGNATURES) {
    const idx = lower.indexOf(sig.toLowerCase());
    if (idx !== -1) {
      const around = text.slice(Math.max(0, idx - 40), idx + sig.length + 40).replace(/\s+/g, ' ');
      hits.push(`${path.relative(path.resolve(__dirname, '..'), f)} :: "${sig}" → …${around}…`);
    }
  }
}

console.log(`신학 안전 verifier (장로교 개혁주의 기준) · 스캔 ${files.length}개 데이터 파일 · signature ${HERESY_SIGNATURES.length}종`);

if (hits.length) {
  console.error(`✗ 이단·사이비 signature 검출 (${hits.length}건) — 개혁주의 기준 위배. 제거/수정 필요:`);
  for (const h of hits) console.error(`  - ${h}`);
  process.exit(1);
}

console.log('✓ 신학 안전 통과 (이단·사이비 signature 미검출 · 개혁주의 기준 유지)');
