import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, '../src/components/ManualModal.jsx');
let source = fs.readFileSync(target, 'utf8');

const marker = "id: 'context-all-66-books'";
const anchor = `  {
    id: 'syntax-mobile-scroll',`;
const section = `  {
    id: 'context-all-66-books',
    icon: '📚',
    title: '문맥 성경 · 66권 전체 구조 분석',
    content: [
      {
        type: 'desc',
        text: '문맥 성경은 창세기부터 요한계시록까지 66권 전체에서 동일한 연구 화면 계약을 사용합니다. 기존 전문 컨텍스트가 있는 책은 정밀 데이터를 우선 사용하고, 나머지 책도 권별 구조 프로필과 장르별 분석 규칙으로 빈 화면 없이 연구할 수 있습니다.',
      },
      {
        type: 'list',
        title: '모든 책에서 제공되는 구조',
        items: [
          '권 정보 — 장르·저자/편집 전승·주요 독자 맥락·핵심 주제',
          '장별 의제 — 현재 장이 권 전체 구조에서 어느 구간에 속하는지 표시',
          '거시 구조 — 권 전체 sections, 핵심 Pivot, Pivot 사이 Arc 관계',
          '담화/구조 표지 — 서사·율법·시가/지혜·예언·복음서·서신·묵시 장르에 맞춘 역할 표시',
          '신학 핵심어 — 원어 데이터가 있는 본문에서 주요 신학어를 구조 분석과 함께 표시',
          '논증·서사 구조 지도 — 정밀 데이터가 있는 본문은 수동 정밀 지도를 우선하고, 그 외 본문은 현재 장 구조를 탐색할 수 있는 자동 지도를 제공',
        ],
      },
      {
        type: 'list',
        title: '분석 수준 표시',
        items: [
          '정밀 — 책/본문별로 직접 설계된 담화·Pivot·Arc·논증 데이터가 있는 경우',
          '구조화 — 권별 정식 프로필과 장르 규칙을 적용해 로마서와 같은 데이터 필드 구조로 제공하는 경우',
          '자동 구조 지도 — 현재 장의 단락·담화 신호를 바탕으로 탐색을 돕는 제안이며 정밀 주해를 대신하지 않음',
        ],
      },
      {
        type: 'tip',
        text: 'Arc·구조 지도는 본문 관계를 탐색하기 위한 연구 보조 장치입니다. 구조화/자동 분석 결과는 반드시 실제 본문, 앞뒤 문맥, 원어 정보와 함께 확인하세요. 원어 파일이 없는 본문도 KRV 본문과 권별 거시 구조는 계속 사용할 수 있습니다.',
      },
    ],
  },
`;

if (!source.includes(marker)) {
  if (!source.includes(anchor)) throw new Error('[manual-all-bible-contexts] insertion anchor not found');
  source = source.replace(anchor, `${section}${anchor}`);
  fs.writeFileSync(target, source);
  console.log('✓ Manual includes full 66-book contextual Bible guide');
} else {
  console.log('✓ Manual already includes full 66-book contextual Bible guide');
}
