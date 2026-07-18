export const sampleNodes = [
  // ── 마가복음 본문 ──
  {
    id: 'v-mark-1-2',
    type: 'verse',
    position: { x: 420, y: 40 },
    data: {
      reference: '마가복음 1:2',
      text: '선지자 이사야의 글에 보라 내가 내 사자를 네 앞에 보내노니 그가 네 길을 준비하리라',
      color: '#3b82f6',
    },
  },
  {
    id: 'v-mark-1-3',
    type: 'verse',
    position: { x: 420, y: 260 },
    data: {
      reference: '마가복음 1:3',
      text: '광야에 외치는 자의 소리가 있어 이르되 주의 길을 준비하라 그의 오실 길을 곧게 하라 기록된 것과 같이',
      color: '#3b82f6',
    },
  },

  // ── 구약 인용 원문 ──
  {
    id: 'v-mal-3-1',
    type: 'verse',
    position: { x: 20, y: 20 },
    data: {
      reference: '말라기 3:1',
      text: '만군의 여호와가 이르노라 보라 내가 내 사자를 보내리니 그가 내 앞에서 길을 준비할 것이요',
      color: '#f59e0b',
    },
  },
  {
    id: 'v-isa-40-3',
    type: 'verse',
    position: { x: 20, y: 240 },
    data: {
      reference: '이사야 40:3',
      text: '외치는 자의 소리여 이르되 너희는 광야에서 여호와의 길을 준비하라 사막에서 우리 하나님의 대로를 평탄하게 하라',
      color: '#f59e0b',
    },
  },
  {
    id: 'v-exod-23-20',
    type: 'verse',
    position: { x: 20, y: 460 },
    data: {
      reference: '출애굽기 23:20',
      text: '보라 내가 사자를 네 앞에 보내어 길에서 너를 보호하고 내가 준비한 곳으로 너를 인도하게 하리니',
      color: '#f59e0b',
    },
  },

  // ── 평행본문 (공관복음 + 요한) ──
  {
    id: 'v-matt-3-3',
    type: 'verse',
    position: { x: 840, y: 40 },
    data: {
      reference: '마태복음 3:3',
      text: '그는 선지자 이사야를 통하여 말씀하신 자라 일렀으되 광야에 외치는 자의 소리가 있어 이르되 주의 길을 준비하라 그의 오실 길을 곧게 하라 하였느니라',
      color: '#10b981',
    },
  },
  {
    id: 'v-luke-3-4',
    type: 'verse',
    position: { x: 840, y: 260 },
    data: {
      reference: '누가복음 3:4',
      text: '선지자 이사야의 책에 쓴 바 광야에 외치는 자의 소리가 있어 이르되 주의 길을 준비하라 그의 오실 길을 곧게 하라',
      color: '#10b981',
    },
  },
  {
    id: 'v-john-1-23',
    type: 'verse',
    position: { x: 840, y: 480 },
    data: {
      reference: '요한복음 1:23',
      text: '이르되 나는 선지자 이사야의 말과 같이 주의 길을 곧게 하라고 광야에서 외치는 자의 소리로라 하니라',
      color: '#10b981',
    },
  },

  // ── 주석 노트 ──
  {
    id: 'note-citation',
    type: 'note',
    position: { x: 160, y: 120 },
    data: {
      title: '복합 인용 구조',
      text: '막 1:2는 "이사야의 글에"라고 하지만, 실제로는 말라기 3:1(+ 출 23:20)과 이사야 40:3을 함께 인용한 복합 인용(conflated quotation)이다. 구약의 두 예언이 세례 요한에게 성취됨을 보여준다.',
    },
  },
  {
    id: 'note-messenger',
    type: 'note',
    position: { x: 100, y: 560 },
    data: {
      title: '"사자(使者)" 모티프',
      text: '말라기의 "내 사자"와 출애굽기의 "사자"가 동일 히브리어 מַלְאָךְ(말라크). 하나님이 백성 앞에 길을 여는 사자를 보내시는 패턴이 출애굽-말라기-세례요한으로 이어진다.',
    },
  },
  {
    id: 'note-order',
    type: 'note',
    position: { x: 840, y: 680 },
    data: {
      title: '사복음서 비교',
      text: '마가만 말라기 3:1을 포함하여 인용. 마태·누가·요한은 이사야 40:3만 인용. 마가가 가장 풍부한 구약 배경을 제시한다.',
    },
  },

  // ── 주제 노드 ──
  {
    id: 'topic-forerunner',
    type: 'topic',
    position: { x: 300, y: 500 },
    data: {
      title: '세례 요한 — 길 예비자',
      keywords: ['세례요한', '사자', '광야', '회개'],
    },
  },
  {
    id: 'topic-fulfillment',
    type: 'topic',
    position: { x: 560, y: 500 },
    data: {
      title: '예언 성취',
      keywords: ['이사야', '말라기', '성취', '메시아'],
    },
  },
];

export const sampleEdges = [
  // ── 인용 관계 (점선 빨강 화살표) ──
  {
    id: 'e-mark12-mal31',
    source: 'v-mark-1-2',
    target: 'v-mal-3-1',
    type: 'citation',
    label: '인용',
    data: { note: '"보라 내가 내 사자를 네 앞에 보내노니" — 말라기 3:1을 거의 그대로 인용' },
  },
  {
    id: 'e-mark13-isa403',
    source: 'v-mark-1-3',
    target: 'v-isa-40-3',
    type: 'citation',
    label: '인용',
    data: { note: '"광야에 외치는 자의 소리" — 이사야 40:3의 직접 인용. LXX(70인역) 본문에 가깝다' },
  },
  {
    id: 'e-mal31-exod2320',
    source: 'v-mal-3-1',
    target: 'v-exod-23-20',
    type: 'citation',
    label: '반향',
    data: { note: '말라기 3:1 자체가 출애굽기 23:20을 반향(echo)한다. "사자를 보내어 길을 준비" 패턴 공유' },
  },

  // ── 평행본문 (실선 파랑) ──
  {
    id: 'e-mark13-matt33',
    source: 'v-mark-1-3',
    target: 'v-matt-3-3',
    type: 'parallel',
    label: '평행본문',
  },
  {
    id: 'e-mark13-luke34',
    source: 'v-mark-1-3',
    target: 'v-luke-3-4',
    type: 'parallel',
    label: '평행본문',
  },
  {
    id: 'e-mark13-john123',
    source: 'v-mark-1-3',
    target: 'v-john-1-23',
    type: 'parallel',
    label: '평행본문',
  },

  // ── 주제 연결 (파선 보라) ──
  {
    id: 'e-mark12-forerunner',
    source: 'v-mark-1-2',
    target: 'topic-forerunner',
    type: 'topic',
  },
  {
    id: 'e-mark13-forerunner',
    source: 'v-mark-1-3',
    target: 'topic-forerunner',
    type: 'topic',
  },
  {
    id: 'e-mark12-fulfillment',
    source: 'v-mark-1-2',
    target: 'topic-fulfillment',
    type: 'topic',
  },
  {
    id: 'e-mark13-fulfillment',
    source: 'v-mark-1-3',
    target: 'topic-fulfillment',
    type: 'topic',
  },
  {
    id: 'e-mal31-fulfillment',
    source: 'v-mal-3-1',
    target: 'topic-fulfillment',
    type: 'topic',
  },
  {
    id: 'e-isa403-fulfillment',
    source: 'v-isa-40-3',
    target: 'topic-fulfillment',
    type: 'topic',
  },
];
