import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, '../src/components/ManualModal.jsx');
let source = fs.readFileSync(target, 'utf8');

const MARKER = "id: 'research-annotations'";
const anchor = `  {
    id: 'obsidian',`;

const sections = `  {
    id: 'mobile-workspace',
    icon: '📱',
    title: '모바일 작업 화면',
    content: [
      {
        type: 'desc',
        text: '스마트폰·태블릿에서는 PC 화면을 축소해서 보여주지 않고 터치 전용 작업 흐름을 사용합니다. 하단 작업 Dock과 전체화면 작업 시트로 필요한 기능에 빠르게 접근할 수 있습니다.',
      },
      {
        type: 'list',
        title: '하단 작업 Dock',
        items: [
          '＋ 추가 — 구절·노트·주제·인물·장소·시대 자료를 전체화면 작업 시트에서 추가',
          '✎ 편집 — 선택한 노드를 편집. 노드를 처음 선택하면 작은 미리보기 시트가 열리고 편집을 누르면 확장',
          '⌗ 전체보기 — 현재 마인드맵 전체가 화면에 들어오도록 자동 맞춤',
          '▣ 저장 — 개인 저장소를 전체화면으로 열어 저장·복원·백업 관리',
        ],
      },
      {
        type: 'tip',
        text: '모바일에서는 좌우의 좁은 고정 탭 대신 하단 Dock을 사용합니다. 닫기 버튼과 주요 터치 대상은 손가락으로 누르기 쉬운 크기로 조정되어 있습니다.',
      },
    ],
  },
  {
    id: 'research-annotations',
    icon: '📌',
    title: '개인 연구 주석',
    content: [
      {
        type: 'desc',
        text: '한 구절에 작성한 개인 연구 기록을 구절 노드·문맥 성경·관련 본문·관주 미리보기·본문 흐름 분석·구문 구조 분석에서 같은 주석으로 공유합니다. 한 곳에서 수정하거나 삭제하면 열려 있는 다른 연구 화면에도 즉시 반영됩니다.',
      },
      {
        type: 'list',
        title: '주석 종류',
        items: [
          '📌 개인 메모 — 자유 연구 기록',
          '💡 묵상·강조 — 묵상 포인트와 중요한 문구 표시',
          '❓ 연구 질문 — 추가 확인이 필요한 질문 기록',
          '🔤 원어 연구 — 히브리어·헬라어 단어와 어형 관련 기록',
          '🧩 구문 연구 — 절 구조·구문 트리 관찰 기록',
          '🔗 교차 참조 — 연결 본문과 관주에 대한 기록',
          '📝 설교 메모 — 설교 준비용 관찰·적용 기록',
        ],
      },
      {
        type: 'step',
        title: '사용 방법',
        steps: [
          '본문 또는 구절 카드의 📌 주석 버튼을 누릅니다.',
          '주석 종류를 선택하고 내용을 입력한 뒤 저장합니다.',
          '특정 문구에 메모하려면 본문 문구를 먼저 선택한 뒤 주석 버튼을 눌러 선택 문구와 함께 저장합니다.',
          '저장된 주석은 같은 본문을 여는 다른 연구 도구에서도 확인·수정·삭제할 수 있습니다.',
        ],
      },
      {
        type: 'tip',
        text: '현재 주석은 같은 브라우저의 개인 Workspace에 저장됩니다. Obsidian 동기화를 사용할 때는 research/annotations.json과 research/annotations.md에도 함께 내보냅니다.',
      },
    ],
  },
  {
    id: 'context-advanced-20260729',
    icon: '🧭',
    title: '문맥 성경 · Arc & 비평장치',
    content: [
      {
        type: 'desc',
        text: '문맥 성경의 거시 구조 Arc와 본문 비평장치는 PC·모바일·태블릿에서 같은 의미와 상태를 공유합니다. Arc는 단순 연결선이 아니라 연결 근거와 해석 의미를 확인하는 연구 도구입니다.',
      },
      {
        type: 'list',
        title: 'Arc 연결 해설',
        items: [
          '연결 기준 — 반복·수미상관·대조·논증·약속과 성취·주제 모티프 등 어떤 기준으로 두 본문을 연결했는지 설명',
          '본문 근거 — 연결된 출발·도착 장절과 핵심 피벗을 함께 제시',
          '신학적 의미 — 해당 성경 권의 중심 주제 안에서 연결이 갖는 의미 설명',
          '해석 주의 — Arc는 본문 자체의 새 계시가 아니라 문맥을 설명하기 위한 해석적 제안임을 명시',
        ],
      },
      {
        type: 'step',
        title: 'Arc 사용법',
        steps: [
          'PC에서는 Arc 선을 클릭하고, 모바일에서는 헤더의 ARC를 켠 뒤 Arc 선을 탭합니다.',
          '열린 해설 카드에서 해석 유형·연결 기준·본문 근거·신학적 의미·해석 주의를 확인합니다.',
          '카드의 양쪽 본문 버튼을 눌러 연결된 출발·도착 구절로 즉시 이동합니다.',
        ],
      },
      {
        type: 'list',
        title: '✎ 비평장치 3단계',
        items: [
          'OFF — 비평장치 표시를 끔',
          '일반 — 일반 독자가 확인할 핵심 이문과 설명 표시',
          '학술 — 더 상세한 본문비평 정보를 포함해 표시',
          '선택한 모드는 브라우저에 저장되어 새로고침 뒤에도 유지',
          '모바일·태블릿에서도 PC와 동일한 OFF · 일반 · 학술 선택 경로 제공',
        ],
      },
      {
        type: 'tip',
        text: 'Arc 해설은 역사·문법적 문맥을 먼저 보고, 문학적 구조를 확인한 뒤 정경적·구속사적으로 종합합니다. Arc 하나만으로 새로운 교리를 확정하지 말고 반드시 양쪽 본문과 앞뒤 문맥을 함께 확인하세요.',
      },
    ],
  },
  {
    id: 'syntax-mobile-scroll',
    icon: '🌲',
    title: '구문 구조 · 모바일 읽기',
    content: [
      {
        type: 'desc',
        text: '모바일 구문 구조 화면은 상단 도구막대 아래에서 설명·약어 범례·실제 구문 트리를 하나의 세로 흐름으로 읽도록 구성되어 있습니다.',
      },
      {
        type: 'list',
        title: '모바일 조작',
        items: [
          '설명 영역 위에서 그대로 위로 스와이프해 약어 범례와 실제 트리까지 연속해서 이동',
          '트리가 화면보다 넓을 때는 트리 영역을 좌우로 스크롤해 전체 가지를 확인',
          '[절 구조]와 [트리] 모두 같은 모바일 세로 스크롤 규칙 사용',
          '상단의 📋 절 구조 · 🌲 트리 · ⚙️ · 본문 · ✕ 버튼으로 화면을 전환하거나 닫기',
        ],
      },
      {
        type: 'tip',
        text: '모바일에서는 설명 부분과 트리 부분이 서로 다른 세로 스크롤 영역으로 나뉘지 않습니다. 화면 어디에서 시작해도 자연스럽게 아래 본문 구조로 이어집니다.',
      },
    ],
  },
`;

if (!source.includes(MARKER)) {
  if (!source.includes(anchor)) {
    throw new Error('[manual-20260729] insertion anchor not found; refusing unsafe patch');
  }
  source = source.replace(anchor, `${sections}${anchor}`);
}

const oldArc = "          '좌측 거시구조 pivot dot / arc 호버 시 신학적 의미 pill 라벨 노출',";
const newArc = "          '좌측 거시구조 Arc를 클릭/탭하면 연결 기준·본문 근거·신학적 의미·해석 주의가 담긴 해설 카드 표시',";
if (source.includes(oldArc)) source = source.replace(oldArc, newArc);

const oldSyntaxTip = "        text: '원어 데이터가 제공되는 절은 원어 단어가 표시되고, 데이터가 없는 절은 한글 번역본(KRV)만 나타납니다.',";
const newSyntaxTip = "        text: '원어 데이터가 제공되는 절은 원어 단어가 표시되고, 데이터가 없는 절은 한글 번역본(KRV)만 나타납니다. 모바일에서는 설명·약어·트리가 하나의 세로 스크롤 흐름으로 이어지며, 넓은 트리만 좌우로 스크롤합니다.',";
if (source.includes(oldSyntaxTip)) source = source.replace(oldSyntaxTip, newSyntaxTip);

fs.writeFileSync(target, source);
console.log('✓ Manual includes July 29 mobile, annotation, Arc, apparatus, and syntax updates');
