// 역사서 장별 관찰 카드 248장. 성경 본문 전문 포함 금지.
// 기존 curated 장별 의제를 읽어 문맥 성경 UI 관찰 스캐폴딩으로 확장한다.
import { CURATED_CHAPTER_DETAILS } from './curatedChapterDetails.js';

const C = (coverEmoji, genre, observeThis, discourseMarkers, theologicalImplications, nextChapterPreview) => ({
  coverEmoji,
  genre,
  observeThis,
  discourseMarkers,
  theologicalImplications,
  nextChapterPreview,
});

const BOOK_META = {
  Josh: { label: '수', emoji: '🗺️', genre: '역사 · 정복과 언약' },
  Judg: { label: '삿', emoji: '⚖️', genre: '역사 · 사사와 언약 위기' },
  Ruth: { label: '룻', emoji: '🌾', genre: '서사 · 헤세드와 섭리' },
  '1Sam': { label: '삼상', emoji: '🫗', genre: '역사 · 선지자와 왕정 전환' },
  '2Sam': { label: '삼하', emoji: '👑', genre: '역사 · 다윗 왕권과 언약' },
  '1Kgs': { label: '왕상', emoji: '🏛️', genre: '역사 · 왕권·성전·예언' },
  '2Kgs': { label: '왕하', emoji: '📜', genre: '역사 · 예언·심판·포로' },
  '1Chr': { label: '대상', emoji: '🎼', genre: '역사·계보 · 다윗 왕권과 성전' },
  '2Chr': { label: '대하', emoji: '🕍', genre: '역사 · 성전과 유다 왕국' },
  Ezra: { label: '스', emoji: '🧱', genre: '귀환 역사 · 성전과 말씀' },
  Neh: { label: '느', emoji: '🧱', genre: '귀환 역사 · 성벽·말씀·공동체' },
  Esth: { label: '에', emoji: '👑', genre: '궁정 서사 · 섭리와 보존' },
};

const BOOK_ORDER = ['Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth'];
const NEXT_BOOK = {
  Josh: 'Judg',
  Judg: 'Ruth',
  Ruth: '1Sam',
  '1Sam': '2Sam',
  '2Sam': '1Kgs',
  '1Kgs': '2Kgs',
  '2Kgs': '1Chr',
  '1Chr': '2Chr',
  '2Chr': 'Ezra',
  Ezra: 'Neh',
  Neh: 'Esth',
  Esth: 'Job',
};

const TARGETS = {
  Josh: Array.from({ length: 24 }, (_, i) => i + 1),
  Judg: Array.from({ length: 21 }, (_, i) => i + 1),
  Ruth: [2, 3, 4],
  '1Sam': Array.from({ length: 31 }, (_, i) => i + 1),
  '2Sam': Array.from({ length: 24 }, (_, i) => i + 1),
  '1Kgs': Array.from({ length: 22 }, (_, i) => i + 1),
  '2Kgs': Array.from({ length: 25 }, (_, i) => i + 1),
  '1Chr': Array.from({ length: 29 }, (_, i) => i + 1),
  '2Chr': Array.from({ length: 36 }, (_, i) => i + 1),
  Ezra: Array.from({ length: 10 }, (_, i) => i + 1),
  Neh: Array.from({ length: 13 }, (_, i) => i + 1),
  Esth: Array.from({ length: 10 }, (_, i) => i + 1),
};

const THEOLOGY = {
  Josh: [
    '하나님의 언약 신실하심과 백성의 실제 순종 책임이 약속의 성취 과정에서 함께 드러남을 보여 준다.',
    '가나안 정복은 구속사 안의 특별한 언약 심판 문맥으로 읽으며 현대 폭력의 일반 명령으로 확장하지 않는다.',
    '땅의 선물과 안식은 은혜로 주어지지만, 언약 백성에게는 말씀을 기억하고 거룩하게 살아갈 책임이 따른다.',
  ],
  Judg: [
    '언약 불순종이 공동체의 삶을 무너뜨리고, 심판과 긍휼이 반복되는 시대의 영적 상태를 드러낸다.',
    '사사들은 하나님이 사용하시는 도구이지만 결함 없는 구원자가 아니며, 인간 지도자의 한계를 함께 보여 준다.',
    '왕 없는 혼란의 심화는 인간 자율성보다 하나님의 의로운 통치와 언약 충성이 필요함을 부각한다.',
  ],
  Ruth: [
    '일상의 충성과 인애가 하나님의 섭리 안에서 언약 가문의 보존과 연결되는 모습을 보여 준다.',
    '기업 무를 자의 책임은 가족과 기업을 회복하는 언약 공동체의 돌봄 질서를 드러내며 구속 주제의 정경적 발전을 준비한다.',
    '다윗 계보로 이어지는 결말은 평범한 순종과 섭리가 왕권의 구속사적 흐름 안에 놓여 있음을 보여 준다.',
  ],
  '1Sam': [
    '여호와께서 이스라엘의 참 왕이시며 선지자와 왕 모두 그의 말씀 아래 평가받는다는 왕정 신학을 드러낸다.',
    '왕의 선택과 폐기는 외적 성공보다 언약 순종과 하나님의 주권적 부르심이 우선함을 보여 준다.',
    '다윗의 선택은 인간의 완전성을 선언하기보다 하나님이 은혜로 세우시는 왕권의 방향을 제시한다.',
  ],
  '2Sam': [
    '다윗 왕권의 성취와 균열이 함께 나타나며 왕도 하나님의 말씀과 언약 아래 있는 종임을 보여 준다.',
    '다윗 언약은 왕의 실패를 정당화하지 않으면서도 하나님의 약속이 인간의 죄보다 궁극적으로 견고함을 드러낸다.',
    '왕가의 죄와 공동체의 상처는 구속사적 왕권이 단순한 인간 영웅주의로 완성될 수 없음을 보여 준다.',
  ],
  '1Kgs': [
    '왕권·성전·예언의 관계를 통해 이스라엘의 번영도 언약 순종과 하나님의 말씀 아래 있음을 보여 준다.',
    '성전은 하나님을 인간이 소유하는 공간이 아니라 은혜로 임재하시며 말씀으로 예배를 규정하시는 처소로 제시된다.',
    '선지자의 말씀은 왕의 권력과 번영을 심판하는 기준으로 기능하며 우상숭배의 결과를 드러낸다.',
  ],
  '2Kgs': [
    '예언의 성취와 왕들의 평가를 통해 언약의 말씀과 하나님의 주권적 심판이 역사 안에서 신실하게 진행됨을 보여 준다.',
    '개혁의 순간들이 있어도 지속적인 우상숭배와 불의가 누적될 때 언약 심판이 실제 역사적 결과로 나타난다.',
    '포로와 왕조 붕괴 속에서도 하나님이 남은 자와 다윗 계열을 보존하시는 장면은 심판 너머의 소망을 남긴다.',
  ],
  '1Chr': [
    '계보와 다윗 왕권을 창조·언약 역사 속에 다시 배치하여 귀환 공동체의 정체성을 예배 중심으로 재확인한다.',
    '성전 준비와 예배 직무는 인간의 과시보다 하나님이 정하신 거룩한 질서와 공동체적 섬김을 강조한다.',
    '다윗 왕권은 하나님의 주권 아래 세워지며, 왕과 예배 공동체 모두 말씀에 따른 충성을 요구받는다.',
  ],
  '2Chr': [
    '유다 왕들의 역사를 성전·말씀·회개라는 축에서 읽으며 왕권의 흥망이 언약 충성과 연결됨을 보여 준다.',
    '겸비와 회개에 대한 긍휼은 행위 공로가 아니라 언약 백성을 돌이키시는 하나님의 은혜와 함께 제시된다.',
    '성전 파괴와 포로는 죄의 심각성을 드러내지만, 귀환을 여는 섭리는 심판이 하나님의 약속을 폐기하지 못함을 보여 준다.',
  ],
  Ezra: [
    '귀환과 성전 회복은 페르시아 왕권까지 사용하시는 하나님의 섭리와 언약 신실하심 아래 진행됨을 보여 준다.',
    '말씀·예배·공동체 정결은 민족적 우월성이 아니라 언약 백성의 거룩한 소명과 책임이라는 틀에서 읽어야 한다.',
    '회복 공동체의 불완전함은 외적 귀환만으로 구속이 완성되지 않으며 더 깊은 마음의 갱신이 필요함을 보여 준다.',
  ],
  Neh: [
    '기도·계획·노동이 하나님의 섭리 아래 함께 사용되며 신앙과 책임 있는 실천이 분리되지 않음을 보여 준다.',
    '성벽 재건은 목적 자체가 아니라 말씀·예배·정의가 회복되는 언약 공동체를 섬기는 수단으로 제시된다.',
    '반복되는 개혁의 필요는 외적 제도 정비만으로 인간의 마음 문제가 완전히 해결되지 않음을 보여 준다.',
  ],
  Esth: [
    '하나님의 이름이 직접 언급되지 않는 궁정 서사에서도 우연처럼 보이는 사건들이 언약 백성의 보존으로 모이는 섭리를 관찰하게 한다.',
    '에스더와 모르드개의 책임 있는 행동은 하나님의 섭리가 인간의 용기와 지혜로운 판단을 배제하지 않음을 보여 준다.',
    '유다인의 생존과 반전은 제국 안에서의 방어와 보존 문맥으로 읽으며 폭력을 보편적 신앙 규범으로 일반화하지 않는다.',
  ],
};

const MARKERS = [
  { re: /여호와/, marker: 'יְהוָה (아도나이)', role: '언약의 주권자와 신적 행위의 중심' },
  { re: /하나님/, marker: 'אֱלֹהִים (엘로힘)', role: '하나님의 주권적 행위·평가를 가리키는 핵심 호칭' },
  { re: /이스라엘/, marker: 'יִשְׂרָאֵל (이스라엘)', role: '언약 공동체 또는 왕국의 정체성을 가리키는 이름' },
  { re: /유다/, marker: 'יְהוּדָה (예후다)', role: '유다 지파·왕국의 정체성과 계보를 가리키는 이름' },
  { re: /여호수아/, marker: 'יְהוֹשֻׁעַ (예호슈아)', role: '정복·분배 시대를 이끄는 지도자 이름' },
  { re: /갈렙/, marker: 'כָּלֵב (칼레브)', role: '약속을 오래 붙드는 신실함의 인물 표지' },
  { re: /라합/, marker: 'רָחָב (라하브)', role: '여리고 서사에서 보호받는 인물 표지' },
  { re: /기드온/, marker: 'גִּדְעוֹן (기드온)', role: '미디안 구원 서사의 중심 사사' },
  { re: /삼손/, marker: 'שִׁמְשׁוֹן (쉼숀)', role: '블레셋 갈등 서사의 중심 사사' },
  { re: /드보라/, marker: 'דְּבוֹרָה (데보라)', role: '야빈 시대 구원 서사의 사사·선지자' },
  { re: /바락/, marker: 'בָּרָק (바락)', role: '드보라와 함께 전투를 이끄는 인물' },
  { re: /입다/, marker: 'יִפְתָּח (이프타흐)', role: '암몬 전쟁 서사의 중심 사사' },
  { re: /아비멜렉/, marker: 'אֲבִימֶלֶךְ (아비멜렉)', role: '사사 시대 권력 찬탈의 중심 인물' },
  { re: /룻/, marker: 'רוּת (룻)', role: '헤세드와 기업 회복 서사의 중심 인물' },
  { re: /보아스/, marker: 'בֹּעַז (보아스)', role: '기업 무름과 언약적 인애를 실천하는 인물' },
  { re: /나오미/, marker: 'נָעֳמִי (나오미)', role: '상실에서 회복으로 이동하는 가정 서사의 중심 인물' },
  { re: /사무엘/, marker: 'שְׁמוּאֵל (쉐무엘)', role: '왕정 전환을 말씀으로 섬기는 선지자' },
  { re: /사울/, marker: 'שָׁאוּל (샤울)', role: '첫 왕의 선택과 실패를 보여 주는 인물' },
  { re: /요나단/, marker: 'יְהוֹנָתָן (예호나탄)', role: '다윗과 언약적 우정을 지키는 왕자' },
  { re: /다윗/, marker: 'דָּוִד (다비드)', role: '다윗 왕권과 언약 서사의 중심 인물' },
  { re: /솔로몬/, marker: 'שְׁלֹמֹה (쉘로모)', role: '지혜·성전·왕권 서사의 중심 왕' },
  { re: /아합/, marker: 'אַחְאָב (아흐아브)', role: '북왕국 우상숭배와 예언 대결의 중심 왕' },
  { re: /엘리야/, marker: 'אֵלִיָּהוּ (엘리야후)', role: '왕권을 말씀으로 심판하는 선지자' },
  { re: /엘리사/, marker: 'אֱלִישָׁע (엘리샤)', role: '북왕국에서 말씀과 이적을 수행하는 선지자' },
  { re: /예후/, marker: 'יֵהוּא (예후)', role: '아합 왕조 심판을 수행하는 왕' },
  { re: /히스기야/, marker: 'חִזְקִיָּהוּ (히즈키야후)', role: '앗수르 위기와 개혁 서사의 유다 왕' },
  { re: /요시야/, marker: 'יֹאשִׁיָּהוּ (요시야후)', role: '율법책 발견과 언약 갱신의 왕' },
  { re: /여호사밧/, marker: 'יְהוֹשָׁפָט (예호샤팟)', role: '말씀 교육·기도·재판 개혁의 유다 왕' },
  { re: /르호보암/, marker: 'רְחַבְעָם (레하브암)', role: '왕국 분열기의 유다 왕' },
  { re: /여로보암/, marker: 'יָרָבְעָם (야로브암)', role: '분열 왕국 북이스라엘의 초대 왕' },
  { re: /에스라/, marker: 'עֶזְרָא (에즈라)', role: '율법 연구·교육과 공동체 개혁의 지도자' },
  { re: /느헤미야/, marker: 'נְחֶמְיָה (네헤미야)', role: '성벽 재건과 공동체 개혁의 지도자' },
  { re: /에스더/, marker: 'אֶסְתֵּר (에스테르)', role: '궁정 안에서 백성 보존을 위해 행동하는 왕후' },
  { re: /모르드개/, marker: 'מָרְדֳּכַי (모르드카이)', role: '유다인 보존 서사의 핵심 인물' },
  { re: /하만/, marker: 'הָמָן (하만)', role: '유다인을 멸하려는 제국 권력의 대적' },
  { re: /왕/, marker: 'מֶלֶךְ (멜레크)', role: '왕권과 통치 판단을 드러내는 핵심 명사' },
  { re: /성전/, marker: 'בַּיִת (바이트)', role: '성전·왕궁·집의 공간을 조직하는 핵심 명사' },
  { re: /예루살렘/, marker: 'יְרוּשָׁלַיִם (예루샬라임)', role: '왕권·성전·귀환 공동체의 중심 도시' },
  { re: /언약/, marker: 'בְּרִית (베리트)', role: '하나님과 백성의 언약 관계를 가리키는 핵심어' },
  { re: /율법/, marker: 'תּוֹרָה (토라)', role: '왕과 공동체를 판단하고 가르치는 말씀 표지' },
  { re: /성벽/, marker: 'חוֹמָה (호마)', role: '예루살렘 재건과 공동체 경계를 가리키는 핵심어' },
  { re: /제사장/, marker: 'כֹּהֵן (코헨)', role: '성소·예배 직무를 맡은 제사장 표지' },
  { re: /제단/, marker: 'מִזְבֵּחַ (미즈베아흐)', role: '예배와 언약 갱신이 구체화되는 제단 표지' },
  { re: /선지자/, marker: 'נָבִיא (나비)', role: '왕과 백성에게 말씀을 전하는 선지자 표지' },
  { re: /말씀/, marker: 'דָּבָר (다바르)', role: '하나님의 말씀·명령·예언 성취를 추적하는 핵심어' },
  { re: /백성/, marker: 'עָם (암)', role: '언약 공동체와 통치 대상의 집합 명사' },
  { re: /땅|기업/, marker: 'אֶרֶץ (에레츠)', role: '약속·기업·정복·귀환의 공간을 가리키는 핵심어' },
  { re: /레위/, marker: 'לֵוִי (레위)', role: '성전 봉사와 예배 질서의 지파 표지' },
  { re: /베냐민/, marker: 'בִּנְיָמִן (빈야민)', role: '베냐민 지파와 왕정·내전 서사의 표지' },
];

const DEFAULT_MARKERS = {
  Josh: [
    { marker: 'יִשְׂרָאֵל (이스라엘)', role: '언약 백성의 공동체 정체성', example: '장 내 반복' },
    { marker: 'יְהוָה (아도나이)', role: '정복·분배를 주권적으로 이끄시는 언약의 하나님', example: '장 내 반복' },
  ],
  Judg: [
    { marker: 'יִשְׂרָאֵל (이스라엘)', role: '배교·압제·구원의 순환을 겪는 공동체', example: '장 내 반복' },
    { marker: 'יְהוָה (아도나이)', role: '심판과 긍휼로 언약을 다스리시는 하나님', example: '장 내 반복' },
  ],
  Ruth: [
    { marker: 'רוּת (룻)', role: '언약적 인애를 실천하는 중심 인물', example: '장 내 반복' },
    { marker: 'בֹּעַז (보아스)', role: '기업과 가정 회복을 섬기는 중심 인물', example: '장 내 반복' },
  ],
  '1Sam': [
    { marker: 'יְהוָה (아도나이)', role: '선지자와 왕을 세우고 판단하시는 참 왕', example: '장 내 반복' },
    { marker: 'יִשְׂרָאֵל (이스라엘)', role: '왕정 전환을 겪는 언약 공동체', example: '장 내 반복' },
  ],
  '2Sam': [
    { marker: 'דָּוִד (다비드)', role: '왕권의 성취와 위기를 함께 보여 주는 중심 왕', example: '장 내 반복' },
    { marker: 'יְהוָה (아도나이)', role: '다윗 왕권을 언약과 말씀 아래 다스리시는 하나님', example: '장 내 반복' },
  ],
  '1Kgs': [
    { marker: 'מֶלֶךְ (멜레크)', role: '왕권의 선택과 평가를 추적하는 핵심 명사', example: '장 내 반복' },
    { marker: 'יְהוָה (아도나이)', role: '성전·예언·왕권을 판단하시는 언약의 하나님', example: '장 내 반복' },
  ],
  '2Kgs': [
    { marker: 'מֶלֶךְ (멜레크)', role: '왕조 교체와 언약 평가를 추적하는 핵심 명사', example: '장 내 반복' },
    { marker: 'יִשְׂרָאֵל (이스라엘)', role: '심판과 포로의 역사 속 언약 공동체', example: '장 내 반복' },
  ],
  '1Chr': [
    { marker: 'בְּנֵי (베네이)', role: '계보·지파·직무를 연결하는 후손 표지', example: '장 내 반복' },
    { marker: 'יִשְׂרָאֵל (이스라엘)', role: '귀환 공동체가 회복하는 정경적 정체성', example: '장 내 반복' },
  ],
  '2Chr': [
    { marker: 'יְהוָה (아도나이)', role: '성전과 왕들을 평가하시는 언약의 하나님', example: '장 내 반복' },
    { marker: 'יְהוּדָה (예후다)', role: '다윗 왕조와 성전 역사가 전개되는 유다 왕국', example: '장 내 반복' },
  ],
  Ezra: [
    { marker: 'יְרוּשָׁלַיִם (예루샬라임)', role: '성전과 귀환 공동체가 회복되는 중심 도시', example: '장 내 반복' },
    { marker: 'יְהוָה (아도나이)', role: '귀환과 성전 회복을 섭리하시는 하나님', example: '장 내 반복' },
  ],
  Neh: [
    { marker: 'יְרוּשָׁלַיִם (예루샬라임)', role: '성벽·예배·공동체 재건의 중심 도시', example: '장 내 반복' },
    { marker: 'יִשְׂרָאֵל (이스라엘)', role: '말씀과 개혁 아래 다시 세워지는 언약 공동체', example: '장 내 반복' },
  ],
  Esth: [
    { marker: 'הַמֶּלֶךְ (함멜레크)', role: '제국의 명령과 반전이 통과하는 왕권 표지', example: '장 내 반복' },
    { marker: 'הַיְּהוּדִים (하예후딤)', role: '제국 안에서 보존되는 유다인 공동체', example: '장 내 반복' },
  ],
};

const SPECIAL_DEFAULTS = {
  '1Chr:1': ['בְּנֵי (베네이)', 'אָדָם (아담)'],
  '1Chr:2': ['בְּנֵי (베네이)', 'יְהוּדָה (예후다)'],
  '1Chr:3': ['בְּנֵי (베네이)', 'דָּוִד (다비드)'],
  '1Chr:4': ['בְּנֵי (베네이)', 'יְהוּדָה (예후다)'],
  '1Chr:5': ['רְאוּבֵן (레우벤)', 'יִשְׂרָאֵל (이스라엘)'],
  '1Chr:6': ['לֵוִי (레위)', 'בְּנֵי (베네이)'],
  '1Chr:7': ['בְּנֵי (베네이)', 'יִשְׂרָאֵל (이스라엘)'],
  '1Chr:8': ['בִּנְיָמִן (빈야민)', 'בְּנֵי (베네이)'],
  '1Chr:9': ['יִשְׂרָאֵל (이스라엘)', 'יְרוּשָׁלַיִם (예루샬라임)'],
  'Esth:1': ['הַמֶּלֶךְ (함멜레크)', 'וַשְׁתִּי (와쉬티)'],
  'Esth:2': ['אֶסְתֵּר (에스테르)', 'מָרְדֳּכַי (모르드카이)'],
  'Esth:3': ['הָמָן (하만)', 'הַיְּהוּדִים (하예후딤)'],
  'Esth:4': ['אֶסְתֵּר (에스테르)', 'מָרְדֳּכַי (모르드카이)'],
  'Esth:5': ['אֶסְתֵּר (에스테르)', 'הָמָן (하만)'],
  'Esth:6': ['הַמֶּלֶךְ (함멜레크)', 'מָרְדֳּכַי (모르드카이)'],
  'Esth:7': ['אֶסְתֵּר (에스테르)', 'הָמָן (하만)'],
  'Esth:8': ['מָרְדֳּכַי (모르드카이)', 'הַיְּהוּדִים (하예후딤)'],
  'Esth:9': ['הַיְּהוּדִים (하예후딤)', 'מָרְדֳּכַי (모르드카이)'],
  'Esth:10': ['מָרְדֳּכַי (모르드카이)', 'הַמֶּלֶךְ (함멜레크)'],
};

const markerRole = (marker) => {
  const found = MARKERS.find((item) => item.marker === marker);
  if (found) return found.role;
  if (marker.includes('בְּנֵי')) return '계보와 가문 연결을 보여 주는 후손 표지';
  if (marker.includes('אָדָם')) return '정경적 계보의 출발점인 아담 이름';
  if (marker.includes('רְאוּבֵן')) return '르우벤 지파 계보를 여는 이름';
  if (marker.includes('וַשְׁתִּי')) return '궁정 위기의 시작을 만드는 와스디 왕후';
  return '해당 장의 인물·공동체 흐름을 확인하는 원어 표지';
};

function pickMarkers(book, chapter, detail) {
  const key = `${book}:${chapter}`;
  const keyVerse = detail?.keyVerses?.[0]?.verse ?? 1;
  const label = detail?.keyVerses?.[0]?.label ?? '';
  const agenda = detail?.agenda ?? '';
  const picked = [];

  const add = (marker, role, example) => {
    if (!marker || picked.some((item) => item.marker === marker)) return;
    picked.push({ marker, role, example });
  };

  for (const rule of MARKERS) {
    if (rule.re.test(label)) add(rule.marker, rule.role, `${keyVerse}절`);
    if (picked.length >= 2) break;
  }
  if (picked.length < 2) {
    for (const rule of MARKERS) {
      if (rule.re.test(agenda)) add(rule.marker, rule.role, `${chapter}장 내 반복`);
      if (picked.length >= 2) break;
    }
  }

  const special = SPECIAL_DEFAULTS[key];
  if (picked.length < 2 && special) {
    for (const marker of special) add(marker, markerRole(marker), `${chapter}장 내 반복`);
  }

  if (picked.length < 2) {
    for (const fallback of DEFAULT_MARKERS[book] ?? []) {
      add(fallback.marker, fallback.role, fallback.example);
      if (picked.length >= 2) break;
    }
  }

  return picked.slice(0, 2);
}

function nextPreview(book, chapter) {
  const chapters = CURATED_CHAPTER_DETAILS[book] ?? {};
  if (chapters[chapter + 1]?.agenda) {
    return `${BOOK_META[book]?.label ?? book} ${chapter + 1}장 · ${chapters[chapter + 1].agenda}`;
  }
  const nextBook = NEXT_BOOK[book];
  const next = CURATED_CHAPTER_DETAILS[nextBook]?.[1];
  if (next?.agenda) {
    const label = BOOK_META[nextBook]?.label ?? (nextBook === 'Job' ? '욥' : nextBook);
    return `${label} 1장 · ${next.agenda}`;
  }
  return '다음 정경 단락에서 언약 역사의 후속 흐름을 이어서 관찰한다.';
}

function makeCard(book, chapter) {
  const detail = CURATED_CHAPTER_DETAILS[book]?.[chapter];
  const meta = BOOK_META[book];
  const agenda = detail?.agenda ?? `${meta?.label ?? book} ${chapter}장의 역사적 흐름`;
  const topic = agenda.split(':')[0].trim();
  const theology = THEOLOGY[book];

  return C(
    meta.emoji,
    meta.genre,
    [
      `${meta.label} ${chapter}장을 열고 좌측 Arc와 우측 담화 카드에서 '${topic}'이 장의 시작·전환·결말을 어떻게 조직하는지 먼저 확인한다.`,
      `신학 핵심어 칩을 클릭해 '${topic}'과 연결되는 언약·왕권·성전·심판·회개·회복 어휘가 이 장과 권 전체에서 어떻게 분포하는지 종단 추적한다.`,
      `관주 🔗와 [배경] 패널을 함께 열어 인물·장소·시대 연결을 확인하되, 교차 참조보다 현재 장의 사건 순서와 문맥을 먼저 자기 언어로 요약한다.`,
    ],
    pickMarkers(book, chapter, detail),
    [
      `'${topic}'이라는 장면은 ${theology[0]}`,
      theology[1],
      theology[2],
    ],
    nextPreview(book, chapter),
  );
}

export const CONTEXT_CHAPTER_CARDS_HISTORY = Object.fromEntries(
  BOOK_ORDER.flatMap((book) => TARGETS[book].map((chapter) => [`${book}:${chapter}`, makeCard(book, chapter)])),
);
