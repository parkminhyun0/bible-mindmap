import { useState, useRef, useEffect, useCallback } from 'react';

const SECTIONS = [
  {
    id: 'intro',
    icon: '📖',
    title: '시작하기',
    content: [
      {
        type: 'desc',
        text: '성경 마인드맵은 성경 구절·인물·장소·시대를 캔버스에 시각적으로 배치하고 연결선으로 관계를 표현하는 인터랙티브 도구입니다. 설치 없이 브라우저에서 바로 사용할 수 있습니다.',
      },
      {
        type: 'list',
        title: '화면 구성',
        items: [
          '왼쪽 패널 — 구절·노트·주제·인물·장소·시대 노드를 캔버스에 추가',
          '중앙 캔버스 — 노드 배치, 연결, 편집',
          '오른쪽 저장소 패널 — 맵 저장·로드·내보내기·Obsidian 연동',
          '✍️ 문서 작성 패널 — 설교 구성·아이디어 스케치 작성 및 저장소 연동',
          '하단 패널 — 자동 정렬 / 연결선 스타일 선택',
        ],
      },
    ],
  },
  {
    id: 'canvas',
    icon: '🗺️',
    title: '캔버스 조작',
    content: [
      {
        type: 'table',
        rows: [
          ['동작', '방법'],
          ['화면 이동 (패닝)', '빈 공간 드래그 / 트랙패드 두 손가락 스크롤'],
          ['줌 인/아웃', '마우스 휠 / 트랙패드 핀치'],
          ['전체 보기', '좌하단 ⊡ 버튼 또는 컨트롤 패널 Fit 버튼'],
          ['미니맵', '우하단 — 전체 캔버스 조감, 파란 영역 드래그로 뷰포트 이동'],
          ['노드 선택', '클릭'],
          ['다중 선택', 'Shift 클릭 / 빈 공간 드래그 (라쏘 선택)'],
          ['노드 이동', '선택 후 드래그'],
          ['노드 삭제', 'Backspace 또는 Delete'],
          ['실행 취소', 'Ctrl+Z (Mac: ⌘+Z)'],
          ['재실행', 'Ctrl+Shift+Z 또는 Ctrl+Y'],
        ],
      },
      {
        type: 'tip',
        text: '노드를 선택하면 테두리에 핸들이 생깁니다. 핸들을 드래그해서 노드 크기를 자유롭게 조절할 수 있습니다.',
      },
    ],
  },
  {
    id: 'verse',
    icon: '📜',
    title: '구절 노드 추가',
    content: [
      {
        type: 'step',
        title: '🔍 검색으로 추가',
        steps: [
          '왼쪽 패널 상단 "구절" 탭 선택',
          '"검색" 버튼 클릭 후 성경책 / 장 / 절 선택',
          '역본(개역한글 · ESV · 원어) 선택',
          '"검색" 클릭 — 본문이 미리보기로 표시됨',
          '"캔버스에 추가" 클릭 — 노드가 캔버스 중앙에 생성됨',
        ],
      },
      {
        type: 'step',
        title: '✏️ 직접 입력으로 추가',
        steps: [
          '왼쪽 패널 "직접입력" 탭 클릭',
          '참조 (예: 요 3:16) 와 본문을 직접 입력',
          '"캔버스에 추가" 클릭',
        ],
      },
      {
        type: 'tip',
        text: '검색 시 개역한글·ESV·원어 세 역본이 동시에 미리 로드됩니다. 노드 추가 후 즉시 어느 탭이든 딜레이 없이 전환할 수 있습니다.',
      },
    ],
  },
  {
    id: 'translation',
    icon: '🌐',
    title: '역본 탭 & 원어 분석',
    content: [
      {
        type: 'desc',
        text: '구절 노드는 세 가지 역본 탭을 지원합니다. 노드 내 탭 버튼을 클릭하면 즉시 전환됩니다.',
      },
      {
        type: 'list',
        title: '역본 탭',
        items: [
          '개역한글 — 한국어 개역한글판',
          'ESV — English Standard Version',
          '원어 — 구약: 히브리어(RTL), 신약: 헬라어',
        ],
      },
      {
        type: 'step',
        title: '📚 원어 어형 분석 사용법',
        steps: [
          '원어 탭 클릭',
          '노드를 선택(클릭)한 상태에서 밑줄 단어를 클릭',
          '어형 분석 팝업이 나타남',
          '팝업에서 Strong 번호 · 품사 · 어형 · 의미 확인',
          '팝업 닫기 버튼(✕)으로 닫음',
        ],
      },
      {
        type: 'tip',
        text: '원어 탭은 노드가 선택된(파란 테두리) 상태에서만 밑줄 단어가 활성화됩니다. 노드를 한 번 클릭해 선택한 후 단어를 클릭하세요.',
      },
    ],
  },
  {
    id: 'nodes',
    icon: '🗂️',
    title: '노드 종류',
    content: [
      {
        type: 'table',
        rows: [
          ['노드 타입', '아이콘', '용도'],
          ['구절', '📖', '성경 구절 본문 (KRV / ESV / 원어)'],
          ['노트', '📝', '자유 텍스트 메모'],
          ['주제', '💡', '키워드 태그 묶음 — 주제별 분류'],
          ['인물', '👤', 'Wikidata 연동 성경 인물 (생몰연도, 설명 포함)'],
          ['장소', '📍', 'Wikidata 연동 성경 지명 (좌표, 설명 포함)'],
          ['시대', '🕰️', '성경 시대별 기간 박스 (배경 타임라인 역할)'],
        ],
      },
      {
        type: 'tip',
        text: '인물·장소 노드는 검색창에 이름을 입력하면 Wikidata에서 자동으로 정보를 가져옵니다. 선택 후 "캔버스에 추가"를 클릭하세요.',
      },
    ],
  },
  {
    id: 'editor',
    icon: '✏️',
    title: '노드 편집 (상단 툴바)',
    content: [
      {
        type: 'desc',
        text: '노드를 선택하면 상단에 편집 툴바가 나타납니다. 여기서 스타일과 내용을 변경할 수 있습니다.',
      },
      {
        type: 'table',
        rows: [
          ['항목', '기능'],
          ['글자색', '컬러 피커로 텍스트 색상 변경'],
          ['테두리색', '노드 테두리 및 헤더 색상 변경'],
          ['폰트 크기', '슬라이더 또는 A- / A+ 버튼'],
          ['B / I / U / S', '굵게 / 이탤릭 / 밑줄 / 취소선 (직접 입력 노드)'],
          ['정렬', '왼쪽 / 가운데 / 오른쪽 (직접 입력 노드)'],
          ['구절 참조', '구절 참조 텍스트 수정'],
          ['교차 참조 추가', '선택 구절과 관련된 구절을 새 노드로 연결'],
          ['같은 시대 인물', '동시대 인물을 자동으로 캔버스에 배치'],
        ],
      },
    ],
  },
  {
    id: 'edges',
    icon: '🔗',
    title: '연결선 (관계 표현)',
    content: [
      {
        type: 'step',
        title: '연결선 만들기',
        steps: [
          '노드 테두리에 마우스를 올리면 핸들(파란 점)이 나타남',
          '핸들을 드래그해서 다른 노드의 핸들에 연결',
          '하단 패널에서 연결 타입을 미리 선택하거나, 연결 후 변경 가능',
        ],
      },
      {
        type: 'table',
        rows: [
          ['연결 타입', '색상', '의미'],
          ['인용', '빨강', '한 구절이 다른 구절을 직접 인용'],
          ['반향', '노랑', '단어·표현의 울림, 간접적 참조'],
          ['평행', '파랑', '같은 사건/내용의 다른 복음서 기록'],
          ['주제', '보라', '공통 주제·신학적 연결'],
          ['교차 참조', '하늘', '상호 참조 구절'],
          ['관계', '회색', '인물·장소·개념 간 일반 관계'],
        ],
      },
      {
        type: 'step',
        title: '연결선 곡선 편집',
        steps: [
          '연결선을 클릭하면 상단 툴바에 앵커 관련 버튼이 나타남',
          '"앵커 추가" 클릭 또는 선 위 더블클릭으로 앵커 포인트 추가',
          '앵커를 드래그해서 곡선 모양 조절',
          '"앵커 제거"로 선택된 앵커 삭제, "전체 초기화"로 직선 복원',
        ],
      },
      {
        type: 'table',
        rows: [
          ['선 스타일', '설명'],
          ['두께', '1 ~ 5px 슬라이더로 조절'],
          ['경로', '곡선(Bezier) / 직선(Straight) / 계단식(Step)'],
          ['화살표', '끝점만 / 양방향 / 없음'],
          ['점선', '실선 / 점선 / 파선'],
        ],
      },
    ],
  },
  {
    id: 'layout',
    icon: '🧩',
    title: '자동 정렬',
    content: [
      {
        type: 'desc',
        text: '하단 패널의 "정렬" 버튼으로 노드들을 자동으로 배치할 수 있습니다. Ctrl+Z로 즉시 되돌릴 수 있습니다.',
      },
      {
        type: 'table',
        rows: [
          ['모드', '특징'],
          ['→ 계보식', '왼쪽에서 오른쪽으로 흐르는 계보 구조 — 인용 흐름, 역사 순서에 적합'],
          ['↓ 트리식', '위에서 아래로 내려가는 트리 구조 — 주제 계층, 개요 작성에 적합'],
          ['⊙ 방사형', '중심 노드를 기준으로 방사형 배치 — 개념 확장, 마인드맵에 적합'],
        ],
      },
    ],
  },
  {
    id: 'citation',
    icon: '🔍',
    title: '교차 참조 제안',
    content: [
      {
        type: 'desc',
        text: '구절 노드를 선택하면 캔버스 위쪽에 관련 구절 제안 패널이 나타납니다. AI 기반이 아닌 성경학적 교차 참조 데이터베이스를 기반으로 합니다.',
      },
      {
        type: 'step',
        title: '사용 방법',
        steps: [
          '구절 노드를 클릭해 선택',
          '상단 제안 패널에서 관련 구절 목록 확인',
          '개별 제안 구절 옆 "+" 클릭 → 해당 구절만 새 노드로 추가',
          '"전체 추가" 클릭 → 모든 제안 구절을 한꺼번에 추가',
          '이미 캔버스에 있는 구절은 "연결" 버튼으로 기존 노드에 엣지만 추가',
        ],
      },
      {
        type: 'tip',
        text: '교차 참조 제안은 선택한 구절의 유형(인용·반향·평행 등)을 구분해 표시합니다. 하단 패널의 "연결 타입"을 미리 선택하면 추가되는 엣지 타입이 그에 맞게 설정됩니다.',
      },
    ],
  },
  {
    id: 'save',
    icon: '💾',
    title: '저장소 & 내보내기',
    content: [
      {
        type: 'desc',
        text: '오른쪽 저장소 패널(💾 버튼)에서 맵을 저장·관리합니다. 작업 내용은 브라우저에 자동 저장되므로 탭을 닫아도 복원됩니다.',
      },
      {
        type: 'list',
        title: '주요 기능',
        items: [
          '새 마인드맵 — 현재 작업을 초기화하고 새로 시작',
          '저장 — 현재 맵을 저장소에 저장 (이름·폴더 지정 가능)',
          '새 폴더 — 저장소를 주제별로 폴더 구조로 정리',
          '현재 맵 내보내기 — JSON 파일로 다운로드 (다른 기기에서 가져오기 가능)',
          '파일 불러오기 — 저장된 JSON 파일을 캔버스로 로드',
          '저장소 백업 — 전체 저장소를 하나의 ZIP 파일로 내보내기',
          '저장소 복원 — 백업 ZIP 파일로 전체 저장소 복원',
        ],
      },
      {
        type: 'tip',
        text: '저장소는 브라우저의 localStorage에 보관됩니다. 정기적으로 "저장소 백업"을 눌러 ZIP 파일로 보관해 두길 권장합니다.',
      },
    ],
  },
  {
    id: 'docpanel',
    icon: '✍️',
    title: '문서 작성 패널',
    content: [
      {
        type: 'desc',
        text: '화면 오른쪽 끝 "✍️ 문서 작성" 세로 탭을 클릭하면 문서 작성 패널이 열립니다. 설교 초안·아이디어를 마크다운으로 작성하고, 상단 빨간 버튼으로 내 저장소의 전용 폴더에 바로 저장할 수 있습니다.',
      },
      {
        type: 'list',
        title: '패널 열기 & 저장 버튼',
        items: [
          '오른쪽 화면 끝 세로 탭 "✍️ 문서 작성" 클릭 → 400px 패널이 슬라이드로 열림',
          '패널 상단 우측의 빨간색 "💾 저장소에 저장" 버튼 → 항상 눈에 보이는 위치',
          '저장 후 패널 상단에 "저장됨" 파란 뱃지가 표시되어 저장 상태를 확인할 수 있음',
        ],
      },
      {
        type: 'list',
        title: '탭 1 — 설교 구성',
        items: [
          '설교 제목과 성경 본문(예: 요한복음 3:16)을 입력합니다',
          '구조 선택 — "서론 / 본론 / 결론" 또는 "발달 / 전개 / 절정 / 결말" 중 선택',
          '각 섹션에 소제목과 본문 내용을 마크다운으로 작성합니다',
          '마크다운 툴바(H1·H2·H3·굵게·이탤릭·취소선·목록·인용 등)로 서식 적용',
        ],
      },
      {
        type: 'list',
        title: '탭 2 — 아이디어 스케치',
        items: [
          '제목(선택)과 함께 자유 형식 마크다운 편집기로 아이디어를 빠르게 메모',
          '설교 준비 전 구상 단계, 성경 공부 노트, 브레인스토밍 용도로 활용',
          '동일한 마크다운 툴바 사용 가능',
        ],
      },
      {
        type: 'step',
        title: '✍️ 설교 문서 작성 전용 폴더 — 저장 & 불러오기',
        steps: [
          '패널 상단 빨간 "💾 저장소에 저장" 버튼 클릭',
          '오른쪽 저장소 패널의 "✍️ 설교 문서 작성" 최상위 폴더 안에 ✍️ 아이콘으로 항목이 생성됨',
          '저장된 ✍️ 항목을 더블클릭하면 문서 작성 패널이 열리며 내용이 자동 복원됨',
          '수정 후 다시 빨간 버튼 클릭 → 같은 항목에 자동 덮어쓰기',
        ],
      },
      {
        type: 'list',
        title: '"✍️ 설교 문서 작성" 폴더 관리',
        items: [
          '앱 실행 시 내 저장소 최상단에 "✍️ 설교 문서 작성" 폴더가 자동으로 생성됨',
          '폴더 안에서 새 하위 폴더 생성 가능 (예: "2025년 설교", "특별집회" 등)',
          '항목 드래그로 폴더 간 이동 가능',
          '항목 이름 변경·삭제 — 기존 저장소와 동일한 방식',
        ],
      },
      {
        type: 'list',
        title: '파일 내보내기',
        items: [
          '⬇ Markdown (.md) — 마크다운 파일로 다운로드 (Obsidian, Notion 등 활용 가능)',
          '⬇ Word (.docx) — Microsoft Word 형식으로 다운로드',
        ],
      },
      {
        type: 'tip',
        text: '문서 작성 패널은 데스크톱 전용입니다. 저장소에 보관된 문서는 브라우저 localStorage에 저장되므로, 중요한 설교 원고는 주기적으로 .docx 파일로 내보내 백업하세요.',
      },
    ],
  },
  {
    id: 'obsidian',
    icon: '🔮',
    title: 'Obsidian 연동',
    content: [
      {
        type: 'desc',
        text: 'Obsidian Vault의 폴더를 연결하면 맵을 저장할 때마다 Markdown 파일(.md)이 자동으로 생성·업데이트됩니다.',
      },
      {
        type: 'step',
        title: '설정 방법',
        steps: [
          '오른쪽 저장소 패널에서 "Obsidian 볼트 폴더 연결" 클릭',
          '파인더(탐색기)에서 Vault 내 저장할 폴더 선택',
          '"자동 저장" 토글 활성화',
          '이후 맵 저장 시 해당 폴더에 .md 파일 자동 생성',
        ],
      },
      {
        type: 'tip',
        text: 'Obsidian 연동은 File System Access API를 지원하는 Chrome / Edge 브라우저에서만 동작합니다. Safari · Firefox는 미지원입니다.',
      },
    ],
  },
  {
    id: 'shortcuts',
    icon: '⌨️',
    title: '키보드 단축키',
    content: [
      {
        type: 'table',
        rows: [
          ['단축키', '동작'],
          ['Ctrl+Z (⌘Z)', '실행 취소'],
          ['Ctrl+Shift+Z (⌘⇧Z)', '재실행'],
          ['Ctrl+Y', '재실행 (Windows)'],
          ['Backspace / Delete', '선택된 노드·엣지 삭제'],
          ['Shift + 클릭', '다중 선택'],
          ['Shift + 드래그', '영역 선택 (라쏘)'],
          ['Ctrl + 스크롤', '줌 인/아웃'],
        ],
      },
    ],
  },
  {
    id: 'tips',
    icon: '💡',
    title: '활용 팁',
    content: [
      {
        type: 'list',
        title: '효과적인 마인드맵 작성법',
        items: [
          '중심 주제 구절을 먼저 추가하고 방사형 정렬로 시작하면 구조가 잡힙니다',
          '인물·장소 노드는 해당 구절 노드의 배경 맥락을 시각화하는 데 유용합니다',
          '시대 노드를 여러 구절 노드 뒤에 배치하면 역사적 흐름을 표현할 수 있습니다',
          '교차 참조 제안을 활용하면 연관 구절을 빠르게 확장할 수 있습니다',
          '연결선 타입(인용·반향·평행 등)을 구분하면 관계의 성격이 더 명확해집니다',
          '작업 중 주기적으로 "저장"하고 주간 단위로 "저장소 백업"을 권장합니다',
          '여러 마인드맵을 폴더별로 나눠 저장하면 (예: "공관복음", "바울서신") 관리가 편합니다',
        ],
      },
    ],
  },
];

function renderContent(block, idx) {
  switch (block.type) {
    case 'desc':
      return (
        <p key={idx} style={{ margin: '0 0 10px', color: '#374151', lineHeight: 1.7, fontSize: 13 }}>
          {block.text}
        </p>
      );
    case 'tip':
      return (
        <div key={idx} style={{
          background: '#eff6ff', borderLeft: '3px solid #3b82f6',
          borderRadius: '0 8px 8px 0', padding: '8px 12px',
          margin: '10px 0', fontSize: 12, color: '#1e40af', lineHeight: 1.6,
        }}>
          💡 {block.text}
        </div>
      );
    case 'list':
      return (
        <div key={idx} style={{ margin: '8px 0' }}>
          {block.title && (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
              {block.title}
            </div>
          )}
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {block.items.map((item, i) => (
              <li key={i} style={{ fontSize: 12.5, color: '#4b5563', lineHeight: 1.6 }}>{item}</li>
            ))}
          </ul>
        </div>
      );
    case 'step':
      return (
        <div key={idx} style={{ margin: '8px 0' }}>
          {block.title && (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
              {block.title}
            </div>
          )}
          <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {block.steps.map((step, i) => (
              <li key={i} style={{ fontSize: 12.5, color: '#4b5563', lineHeight: 1.6 }}>{step}</li>
            ))}
          </ol>
        </div>
      );
    case 'table':
      return (
        <div key={idx} style={{ margin: '8px 0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri === 0 ? '#f1f5f9' : ri % 2 === 0 ? '#f8fafc' : '#fff' }}>
                  {row.map((cell, ci) => {
                    const Tag = ri === 0 ? 'th' : 'td';
                    return (
                      <Tag key={ci} style={{
                        padding: '6px 10px',
                        textAlign: 'left',
                        border: '1px solid #e2e8f0',
                        fontWeight: ri === 0 ? 700 : 400,
                        color: ri === 0 ? '#374151' : '#4b5563',
                        whiteSpace: ci === 0 ? 'nowrap' : 'normal',
                      }}>
                        {cell}
                      </Tag>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

export default function ManualModal({ onClose }) {
  const [minimized, setMinimized] = useState(false);
  const [activeSection, setActiveSection] = useState('intro');
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 320, y: 60 });
  const [size, setSize] = useState({ w: 640, h: 560 });

  const dragging   = useRef(false);
  const resizing   = useRef(false);
  const dragStart  = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const resizeStart = useRef({ mx: 0, my: 0, w: 0, h: 0 });
  const modalRef   = useRef(null);

  // ── 드래그 ──────────────────────────────────────────
  const onHeaderMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  }, [pos]);

  // ── 리사이즈 (우하단 핸들) ──────────────────────────
  const onResizeMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    resizing.current = true;
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
    e.preventDefault();
    e.stopPropagation();
  }, [size]);

  useEffect(() => {
    const onMove = (e) => {
      if (dragging.current) {
        const dx = e.clientX - dragStart.current.mx;
        const dy = e.clientY - dragStart.current.my;
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - 200, dragStart.current.px + dx)),
          y: Math.max(0, Math.min(window.innerHeight - 60, dragStart.current.py + dy)),
        });
      }
      if (resizing.current) {
        const dw = e.clientX - resizeStart.current.mx;
        const dh = e.clientY - resizeStart.current.my;
        setSize({
          w: Math.max(400, Math.min(900, resizeStart.current.w + dw)),
          h: Math.max(200, Math.min(window.innerHeight - 80, resizeStart.current.h + dh)),
        });
      }
    };
    const onUp = () => { dragging.current = false; resizing.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const activeData = SECTIONS.find((s) => s.id === activeSection);

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: size.w,
        zIndex: 2000,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.12)',
        border: '1px solid #e2e8f0',
        fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
        userSelect: dragging.current ? 'none' : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── 타이틀바 ── */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          background: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
          borderRadius: minimized ? 12 : '12px 12px 0 0',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 16 }}>📘</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: '#fff' }}>
          성경 마인드맵 — 사용자 매뉴얼
        </span>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setMinimized((v) => !v)}
          title={minimized ? '펼치기' : '최소화'}
          style={iconBtnStyle}
        >
          {minimized ? '▲' : '▼'}
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onClose}
          title="닫기"
          style={{ ...iconBtnStyle, background: 'rgba(239,68,68,0.25)' }}
        >
          ✕
        </button>
      </div>

      {/* ── 본문 (최소화 시 숨김) ── */}
      {!minimized && (
        <div style={{ display: 'flex', height: size.h, minHeight: 200, overflow: 'hidden', borderRadius: '0 0 12px 12px' }}>

          {/* 사이드 네비 */}
          <div style={{
            width: 156, flexShrink: 0,
            background: '#f8fafc', borderRight: '1px solid #e2e8f0',
            overflowY: 'auto', padding: '8px 0',
          }}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  width: '100%', padding: '8px 12px',
                  background: activeSection === s.id ? '#eff6ff' : 'transparent',
                  border: 'none',
                  borderLeft: activeSection === s.id ? '3px solid #3b82f6' : '3px solid transparent',
                  cursor: 'pointer',
                  fontSize: 12, color: activeSection === s.id ? '#1d4ed8' : '#374151',
                  fontWeight: activeSection === s.id ? 700 : 400,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 15, flexShrink: 0 }}>{s.icon}</span>
                <span>{s.title}</span>
              </button>
            ))}
          </div>

          {/* 콘텐츠 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
            {activeData && (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 14, paddingBottom: 10,
                  borderBottom: '1px solid #e2e8f0',
                }}>
                  <span style={{ fontSize: 20 }}>{activeData.icon}</span>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>
                    {activeData.title}
                  </h3>
                </div>
                {activeData.content.map((block, i) => renderContent(block, i))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 리사이즈 핸들 ── */}
      {!minimized && (
        <div
          onMouseDown={onResizeMouseDown}
          style={{
            position: 'absolute', right: 0, bottom: 0,
            width: 16, height: 16, cursor: 'se-resize',
            borderRadius: '0 0 12px 0',
            background: 'linear-gradient(135deg, transparent 50%, #cbd5e1 50%)',
          }}
        />
      )}
    </div>
  );
}

const iconBtnStyle = {
  background: 'rgba(255,255,255,0.15)',
  border: 'none', borderRadius: 6,
  color: '#fff', fontSize: 12,
  width: 26, height: 26,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};
