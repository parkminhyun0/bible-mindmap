// 마가복음 4-8장 구조 마인드맵
// 주제: 비유 · 기적 · 제자 훈련 · 하나님 나라의 점진적 계시

export const mark4to8Nodes = [
  // ═══════════════════════════════════
  // 중심 주제
  // ═══════════════════════════════════
  {
    id: 'topic-center',
    type: 'topic',
    position: { x: 580, y: 20 },
    data: {
      title: '마가복음 4-8장 — 누가 예수인가?',
      keywords: ['비유', '기적', '제자훈련', '하나님나라', '메시아'],
    },
  },

  // ═══════════════════════════════════
  // 4장: 비유와 자연 기적
  // ═══════════════════════════════════
  {
    id: 'v-mk4-3',
    type: 'verse',
    position: { x: 40, y: 140 },
    data: {
      reference: '막 4:3-9',
      text: '들으라 씨를 뿌리는 자가 뿌리러 나가서... 좋은 땅에 떨어진 것은 말씀을 듣고 받아 삼십 배와 육십 배와 백 배의 결실을 하느니라',
      color: '#3b82f6',
    },
  },
  {
    id: 'v-mk4-26',
    type: 'verse',
    position: { x: 40, y: 340 },
    data: {
      reference: '막 4:26-29',
      text: '하나님의 나라는 사람이 씨를 땅에 뿌림과 같으니... 땅이 스스로 열매를 맺되 처음에는 싹이요 다음에는 이삭이요 그 다음에는 이삭에 충실한 곡식이라',
      color: '#3b82f6',
    },
  },
  {
    id: 'v-mk4-30',
    type: 'verse',
    position: { x: 40, y: 520 },
    data: {
      reference: '막 4:30-32',
      text: '겨자씨 한 알과 같으니... 자란 후에는 모든 풀보다 커서 큰 가지를 내니 공중의 새들이 그 그늘에 깃들일 만큼 되느니라',
      color: '#3b82f6',
    },
  },
  {
    id: 'v-mk4-39',
    type: 'verse',
    position: { x: 340, y: 340 },
    data: {
      reference: '막 4:39-41',
      text: '예수께서 깨어 바람을 꾸짖으시며 바다더러 잠잠하라 고요하라 하시니 바람이 그치고 아주 잔잔하여지더라. "이 사람이 누구이기에 바람과 바다도 순종하는가"',
      color: '#ef4444',
    },
  },

  {
    id: 'topic-parable',
    type: 'topic',
    position: { x: 40, y: 700 },
    data: {
      title: '비유 — 하나님 나라의 성장',
      keywords: ['씨', '땅', '성장', '겨자씨', '하나님나라'],
    },
  },
  {
    id: 'note-4-secret',
    type: 'note',
    position: { x: 340, y: 140 },
    data: {
      title: '비유의 목적 (4:11-12)',
      text: '예수께서 비유로 가르치신 이유: "하나님 나라의 비밀"은 안에 있는 자들에게만 주어진다. 바깥 사람들에게는 비유로 하시니 — 이사야 6:9-10 인용. 마가의 "메시아 비밀" 주제와 연결.',
    },
  },

  // ═══════════════════════════════════
  // 5장: 세 기적 — 귀신·혈루·죽음을 이기심
  // ═══════════════════════════════════
  {
    id: 'v-mk5-9',
    type: 'verse',
    position: { x: 640, y: 180 },
    data: {
      reference: '막 5:1-20',
      text: '거라사인의 귀신 들린 자. "네 이름이 무엇이냐" "내 이름은 군대니 우리가 많음이니이다." 예수께서 귀신을 돼지 떼로 보내시다.',
      color: '#3b82f6',
    },
  },
  {
    id: 'v-mk5-34',
    type: 'verse',
    position: { x: 640, y: 380 },
    data: {
      reference: '막 5:25-34',
      text: '열두 해를 혈루증으로 앓는 여인. 예수의 옷에 손을 대니 즉시 나음. "딸아 네 믿음이 너를 구원하였으니 평안히 가라 네 병에서 놓여 건강할지어다"',
      color: '#3b82f6',
    },
  },
  {
    id: 'v-mk5-41',
    type: 'verse',
    position: { x: 640, y: 560 },
    data: {
      reference: '막 5:35-43',
      text: '야이로의 딸 살리심. "달리다굼" (소녀야 내가 네게 말하노니 일어나라). 소녀가 곧 일어나서 걸으니라. 그의 나이 열두 살이더라.',
      color: '#3b82f6',
    },
  },

  {
    id: 'topic-power',
    type: 'topic',
    position: { x: 920, y: 380 },
    data: {
      title: '예수의 권능 — 자연·귀신·질병·죽음',
      keywords: ['권능', '기적', '믿음', '치유', '부활'],
    },
  },
  {
    id: 'note-5-sandwich',
    type: 'note',
    position: { x: 920, y: 180 },
    data: {
      title: '샌드위치 구조 (5:21-43)',
      text: '야이로의 간구(A) → 혈루증 여인 치유(B) → 야이로의 딸 살리심(A\'). 마가 특유의 삽입 서술(intercalation). B에서 "12년"과 A\'에서 "12살"이 대응. 중간 이야기가 신앙의 교훈을 강화한다.',
    },
  },

  // ═══════════════════════════════════
  // 6장: 파송·오병이어·물 위를 걸으심
  // ═══════════════════════════════════
  {
    id: 'v-mk6-7',
    type: 'verse',
    position: { x: 40, y: 900 },
    data: {
      reference: '막 6:7-13',
      text: '열둘을 부르사 둘씩 둘씩 보내시며 더러운 귀신을 제어하는 권능을 주시고... 전대에 돈을 넣지 말며 두 벌 옷도 가지지 말라',
      color: '#3b82f6',
    },
  },
  {
    id: 'v-mk6-41',
    type: 'verse',
    position: { x: 340, y: 900 },
    data: {
      reference: '막 6:35-44',
      text: '오병이어 — 떡 다섯 개와 물고기 두 마리로 오천 명을 먹이시다. 남은 조각 열두 바구니에 가득 차더라.',
      color: '#ef4444',
    },
  },
  {
    id: 'v-mk6-49',
    type: 'verse',
    position: { x: 640, y: 900 },
    data: {
      reference: '막 6:47-52',
      text: '밤 사경에 바다 위로 걸어오심. 제자들이 유령인 줄 알고 소리 지르다. "안심하라 내니 두려워하지 말라." 그들의 마음이 둔하여졌음이라.',
      color: '#ef4444',
    },
  },

  {
    id: 'note-6-shepherd',
    type: 'note',
    position: { x: 340, y: 1080 },
    data: {
      title: '"목자 없는 양" 모티프',
      text: '6:34 "무리를 보시고 불쌍히 여기시니 이는 그들이 목자 없는 양 같음이라." 민수기 27:17, 에스겔 34장의 반향. 오병이어는 예수가 참된 목자임을 보여주는 표적이다.',
    },
  },

  // ═══════════════════════════════════
  // 7장: 전통 vs 마음 · 이방인 사역
  // ═══════════════════════════════════
  {
    id: 'v-mk7-6',
    type: 'verse',
    position: { x: 40, y: 1250 },
    data: {
      reference: '막 7:6-8',
      text: '"이 백성이 입술로는 나를 공경하되 마음은 내게서 멀도다. 사람의 계명으로 교훈을 삼아 나를 헛되이 경배하는도다." 하나님의 계명을 버리고 사람의 전통을 지키는도다.',
      color: '#3b82f6',
    },
  },
  {
    id: 'v-mk7-27',
    type: 'verse',
    position: { x: 340, y: 1250 },
    data: {
      reference: '막 7:24-30',
      text: '수로보니게 여인의 믿음. "주여 상 아래 개들도 아이들이 먹던 부스러기를 먹나이다." 이 말을 하였으니 가라 귀신이 네 딸에게서 나갔느니라.',
      color: '#10b981',
    },
  },
  {
    id: 'v-mk7-34',
    type: 'verse',
    position: { x: 640, y: 1250 },
    data: {
      reference: '막 7:31-37',
      text: '데가볼리에서 귀먹고 말 더듬는 자 치유. "에바다" (열리라). "그가 다 잘하였도다. 못 듣는 사람도 듣게 하고 말 못하는 사람도 말하게 한다"',
      color: '#10b981',
    },
  },

  {
    id: 'topic-gentile',
    type: 'topic',
    position: { x: 500, y: 1420 },
    data: {
      title: '이방인에게 열리는 복음',
      keywords: ['이방인', '수로보니게', '데가볼리', '정결', '열림'],
    },
  },
  {
    id: 'note-7-clean',
    type: 'note',
    position: { x: 40, y: 1420 },
    data: {
      title: '정결 논쟁의 의미 (7:14-23)',
      text: '음식이 사람을 더럽히지 않고 마음에서 나오는 것이 더럽힌다 — "이로써 모든 음식물을 깨끗하다 하시니라"(7:19). 유대 정결법의 폐지 → 이방인 선교의 신학적 기초가 된다.',
    },
  },

  // ═══════════════════════════════════
  // 8장: 둘째 오병이어 · 눈 뜸 · 베드로 고백
  // ═══════════════════════════════════
  {
    id: 'v-mk8-6',
    type: 'verse',
    position: { x: 40, y: 1600 },
    data: {
      reference: '막 8:1-10',
      text: '사천 명을 먹이심 — 떡 일곱 개로 사천 명을 먹이시다. 남은 조각 일곱 광주리에 가득 차더라.',
      color: '#ef4444',
    },
  },
  {
    id: 'v-mk8-25',
    type: 'verse',
    position: { x: 340, y: 1600 },
    data: {
      reference: '막 8:22-26',
      text: '벳새다에서 맹인 치유. 두 번에 걸쳐 눈을 뜨게 하심 — 처음에는 "사람들이 보이나이다 나무 같이 걸어가는 것을 보나이다." 다시 안수하시니 밝히 모든 것을 보게 되다.',
      color: '#8b5cf6',
    },
  },
  {
    id: 'v-mk8-29',
    type: 'verse',
    position: { x: 640, y: 1600 },
    data: {
      reference: '막 8:27-30',
      text: '"너희는 나를 누구라 하느냐?" 베드로가 대답하여 이르되 "주는 그리스도시니이다." 아무에게도 말하지 말라 경고하시다.',
      color: '#ef4444',
    },
  },
  {
    id: 'v-mk8-34',
    type: 'verse',
    position: { x: 640, y: 1780 },
    data: {
      reference: '막 8:34-35',
      text: '"아무든지 나를 따라오려거든 자기를 부인하고 자기 십자가를 지고 나를 따를 것이니라. 누구든지 자기 목숨을 구원하고자 하면 잃을 것이요 나와 복음을 위하여 잃는 자는 구원하리라"',
      color: '#ef4444',
    },
  },

  {
    id: 'note-8-blind',
    type: 'note',
    position: { x: 340, y: 1780 },
    data: {
      title: '두 단계 치유 = 제자들의 영적 눈 뜸',
      text: '벳새다 맹인의 두 단계 치유(8:22-26)는 제자들의 상태를 상징한다. 처음에 흐릿하게(오병이어의 의미를 모름 8:17-21), 베드로의 고백(8:29)에서 부분적으로, 부활 후에 완전히 눈이 열린다.',
    },
  },
  {
    id: 'topic-messiah',
    type: 'topic',
    position: { x: 900, y: 1700 },
    data: {
      title: '메시아 고백과 십자가의 길',
      keywords: ['그리스도', '베드로', '십자가', '자기부인', '제자도'],
    },
  },

  // ═══════════════════════════════════
  // 구약 배경 구절
  // ═══════════════════════════════════
  {
    id: 'v-isa-6-9',
    type: 'verse',
    position: { x: 340, y: 520 },
    data: {
      reference: '이사야 6:9-10',
      text: '너희가 듣기는 들어도 깨닫지 못할 것이요 보기는 보아도 알지 못하리라',
      color: '#f59e0b',
    },
  },
  {
    id: 'v-ezek-34',
    type: 'verse',
    position: { x: 640, y: 1080 },
    data: {
      reference: '에스겔 34:5,23',
      text: '목자가 없으므로 흩어지고... 내가 한 목자를 그들 위에 세우리니 그가 그들을 먹이리라 그는 내 종 다윗이라',
      color: '#f59e0b',
    },
  },
  {
    id: 'v-isa-29-18',
    type: 'verse',
    position: { x: 900, y: 1250 },
    data: {
      reference: '이사야 29:18; 35:5-6',
      text: '그 날에 못 듣는 사람이 책의 말을 들을 것이며 어둡고 캄캄한 데서 눈 먼 사람의 눈이 볼 것이며... 벙어리의 혀가 노래하리라',
      color: '#f59e0b',
    },
  },
];

export const mark4to8Edges = [
  // ═══ 4장 비유 → 중심 주제 ═══
  { id: 'e-4-3-center', source: 'v-mk4-3', target: 'topic-center', type: 'topic' },
  { id: 'e-4-39-center', source: 'v-mk4-39', target: 'topic-center', type: 'topic' },

  // 비유들 → 비유 주제
  { id: 'e-4-3-parable', source: 'v-mk4-3', target: 'topic-parable', type: 'topic' },
  { id: 'e-4-26-parable', source: 'v-mk4-26', target: 'topic-parable', type: 'topic' },
  { id: 'e-4-30-parable', source: 'v-mk4-30', target: 'topic-parable', type: 'topic' },

  // 비유의 목적 → 이사야 인용
  { id: 'e-note4-isa', source: 'note-4-secret', target: 'v-isa-6-9', type: 'citation', label: '인용' },

  // 폭풍 잠재움 → 권능 주제
  { id: 'e-4-39-power', source: 'v-mk4-39', target: 'topic-power', type: 'topic' },

  // ═══ 5장 기적 → 권능 ═══
  { id: 'e-5-9-power', source: 'v-mk5-9', target: 'topic-power', type: 'topic' },
  { id: 'e-5-34-power', source: 'v-mk5-34', target: 'topic-power', type: 'topic' },
  { id: 'e-5-41-power', source: 'v-mk5-41', target: 'topic-power', type: 'topic' },

  // 샌드위치 구조 연결
  { id: 'e-note5-34', source: 'note-5-sandwich', target: 'v-mk5-34', type: 'relation', label: '관계' },
  { id: 'e-note5-41', source: 'note-5-sandwich', target: 'v-mk5-41', type: 'relation', label: '관계' },

  // ═══ 6장 ═══
  // 오병이어 → 권능
  { id: 'e-6-41-power', source: 'v-mk6-41', target: 'topic-power', type: 'topic' },
  // 물 위 걸으심 → 권능
  { id: 'e-6-49-power', source: 'v-mk6-49', target: 'topic-power', type: 'topic' },
  // 목자 모티프 → 에스겔
  { id: 'e-note6-ezek', source: 'note-6-shepherd', target: 'v-ezek-34', type: 'echo', label: '반향' },
  { id: 'e-6-41-shepherd', source: 'v-mk6-41', target: 'note-6-shepherd', type: 'relation', label: '관계' },

  // ═══ 7장 ═══
  // 정결 논쟁 → 이방인 주제
  { id: 'e-7-6-gentile', source: 'v-mk7-6', target: 'topic-gentile', type: 'topic' },
  { id: 'e-note7-gentile', source: 'note-7-clean', target: 'topic-gentile', type: 'relation', label: '관계' },
  // 수로보니게 + 데가볼리 → 이방인
  { id: 'e-7-27-gentile', source: 'v-mk7-27', target: 'topic-gentile', type: 'topic' },
  { id: 'e-7-34-gentile', source: 'v-mk7-34', target: 'topic-gentile', type: 'topic' },
  // 에바다 → 이사야 예언 반향
  { id: 'e-7-34-isa', source: 'v-mk7-34', target: 'v-isa-29-18', type: 'echo', label: '반향' },

  // ═══ 8장 ═══
  // 사천 명 → 오병이어 평행
  { id: 'e-8-6-parallel', source: 'v-mk8-6', target: 'v-mk6-41', type: 'parallel', label: '평행' },
  // 맹인 치유 → 베드로 고백 연결
  { id: 'e-8-25-note', source: 'v-mk8-25', target: 'note-8-blind', type: 'relation', label: '관계' },
  { id: 'e-note8-29', source: 'note-8-blind', target: 'v-mk8-29', type: 'relation', label: '관계' },
  // 베드로 고백 → 메시아 주제
  { id: 'e-8-29-messiah', source: 'v-mk8-29', target: 'topic-messiah', type: 'topic' },
  { id: 'e-8-34-messiah', source: 'v-mk8-34', target: 'topic-messiah', type: 'topic' },
  // 메시아 → 중심 주제
  { id: 'e-messiah-center', source: 'topic-messiah', target: 'topic-center', type: 'topic' },

  // ═══ 장 간 흐름 (관계선) ═══
  { id: 'e-flow-4-5', source: 'v-mk4-39', target: 'v-mk5-9', type: 'relation', label: '관계', data: { note: '폭풍 잠재움 직후 거라사 도착' } },
  { id: 'e-flow-6-7', source: 'v-mk6-49', target: 'v-mk7-6', type: 'relation', label: '관계', data: { note: '제자들의 둔함 → 바리새인 논쟁으로 전환' } },
  { id: 'e-flow-7-8', source: 'v-mk7-34', target: 'v-mk8-6', type: 'relation', label: '관계', data: { note: '이방 지역 사역 계속' } },
];
