// 룻기 1장 절 구조 데이터 (ArcingNode + ArcingPanel 공유)
// role: main | temporal | circumstance | result | ground | identification | speech | contrast

export const STRUCTURE = [
  {
    preceding: [
      { verse: '1:1', ko: '사사들이 이스라엘을 치리하던 때에', role: 'temporal' },
      { verse: '1:1', ko: '이스라엘 땅에 흉년이 들었더라', role: 'circumstance' },
    ],
    main: { verse: '1:1', ko: '한 사람이 모압으로 가서 거류하였더라', heb: 'וַיֵּלֶךְ' },
    following: [
      { verse: '1:2', ko: '에브라다 사람: 엘리멜렉 · 나오미 · 말론 · 기룐', role: 'identification' },
    ],
  },
  {
    main: { verse: '1:2', ko: '그들이 모압 땅에 이르러 거기서 살았더라', heb: 'וַיָּבֹאוּ' },
  },
  { divider: '전환 1 — 죽음', style: 'danger' },
  {
    main: { verse: '1:3', ko: '나오미의 남편 엘리멜렉이 죽었더라', heb: 'וַיָּמָת' },
    following: [
      { verse: '1:3', ko: '나오미와 두 아들이 남았더라', role: 'result' },
    ],
  },
  {
    main: { verse: '1:4', ko: '두 아들이 모압 여자를 아내로 맞이하였더라', heb: 'וַיִּשְׂאוּ' },
    following: [
      { verse: '1:4', ko: '이름: 오르바와 룻', role: 'identification' },
    ],
  },
  {
    main: { verse: '1:4', ko: '거기서 십 년쯤 살았더라', heb: 'וַיֵּשְׁבוּ' },
  },
  { divider: '전환 2 — 죽음', style: 'danger' },
  {
    main: { verse: '1:5', ko: '말론과 기룐이 둘 다 죽었더라', heb: 'וַיָּמוּתוּ' },
    following: [
      { verse: '1:5', ko: '나오미만 두 아들과 남편 없이 남았더라', role: 'result' },
    ],
  },
  { divider: '반전 — 희망', style: 'hope' },
  {
    main: { verse: '1:6', ko: '나오미가 일어났더라', heb: 'וַתָּקָם' },
    following: [
      { verse: '1:6', ko: '(כִּי) 여호와께서 백성을 돌아보사 양식을 주셨다는 소식을 들었으므로', role: 'ground' },
    ],
  },
  {
    main: { verse: '1:6', ko: '살던 곳에서 돌아가려 하더라', heb: 'וַתָּשָׁב' },
  },
  {
    main: { verse: '1:7', ko: '두 며느리와 함께 있던 곳을 나섰더라', heb: 'וַתֵּצֵא' },
  },
  {
    main: { verse: '1:7', ko: '유다 땅으로 돌아오려고 길을 가더니', heb: 'וַתֵּלַכְנָה' },
  },
  { divider: '장면 2 — 나오미의 만류', style: 'neutral' },
  {
    main: { verse: '1:8', ko: '나오미가 두 며느리에게 말하였더라', heb: 'וַתֹּאמֶר' },
    following: [
      { verse: '1:8-9', ko: '"각각 어머니 집으로 돌아가라 … 여호와께서 은혜 베풀기를 원하노라"', role: 'speech' },
    ],
  },
  {
    main: { verse: '1:9', ko: '나오미가 그들에게 입맞추었더라', heb: 'וַתִּשַּׁק' },
    following: [
      { verse: '1:9', ko: '그들이 소리를 높여 울었더라', role: 'result' },
    ],
  },
  {
    main: { verse: '1:10', ko: '두 며느리가 말하였더라', heb: 'וַתֹּאמַרְנָה' },
    following: [
      { verse: '1:10', ko: '"우리는 어머니와 함께 어머니의 백성에게로 돌아가겠나이다"', role: 'speech' },
    ],
  },
  {
    main: { verse: '1:11', ko: '나오미가 말하였더라', heb: 'וַתֹּאמֶר' },
    following: [
      { verse: '1:11-13', ko: '"돌아가라 … 내게서 태어날 아들이 너희 남편이 되겠느냐 …"', role: 'speech' },
      { verse: '1:13', ko: '(이유) 여호와의 손이 나를 치셨으므로', role: 'ground' },
    ],
  },
  { divider: '전환 3 — 선택의 갈림길', style: 'warning' },
  {
    main: { verse: '1:14', ko: '그들이 또 소리를 높여 울었더라', heb: 'וַתִּשֶּׂאנָה' },
  },
  {
    main: { verse: '1:14', ko: '오르바는 시어머니에게 입맞추고 돌아갔더라', heb: 'וַתִּשַּׁק' },
    following: [
      { verse: '1:14', ko: '그러나 룻은 나오미를 붙좇았더라', role: 'contrast' },
    ],
  },
  {
    main: { verse: '1:15', ko: '나오미가 말하였더라', heb: 'וַתֹּאמֶר' },
    following: [
      { verse: '1:15', ko: '"보라 네 동서는 그의 백성과 신들에게로 돌아갔으니 너도 돌아가라"', role: 'speech' },
    ],
  },
  { divider: '클라이맥스 — 룻의 선언 (헤세드)', style: 'climax' },
  {
    main: { verse: '1:16', ko: '룻이 말하였더라', heb: 'וַתֹּאמֶר' },
    following: [
      { verse: '1:16', ko: '"당신이 가는 곳에 나도 가고 · 당신이 머무는 곳에 나도 머물겠습니다"', role: 'speech' },
      { verse: '1:16', ko: '"당신의 백성이 내 백성이고 · 당신의 하나님이 내 하나님입니다"', role: 'speech' },
      { verse: '1:17', ko: '"당신이 죽는 곳에서 나도 죽어 거기에 묻히리이다"', role: 'speech' },
      { verse: '1:17', ko: '"죽음 외에 우리를 갈라놓으면 여호와께서 내게 벌 내리시기를 원합니다"', role: 'speech' },
    ],
  },
  { divider: '결말 — 베들레헴 귀환', style: 'hope' },
  {
    main: { verse: '1:18', ko: '나오미가 룻의 뜻이 굳음을 보았더라', heb: 'וַתֵּרֶא' },
    following: [
      { verse: '1:18', ko: '더 말하기를 그쳤더라', role: 'result' },
    ],
  },
  {
    main: { verse: '1:19', ko: '두 사람이 길을 가서 베들레헴에 이르렀더라', heb: 'וַתֵּלַכְנָה' },
    following: [
      { verse: '1:19', ko: '온 성읍이 소동하며 "이이가 나오미냐?" 하였더라', role: 'result' },
    ],
  },
  {
    main: { verse: '1:20', ko: '나오미가 말하였더라', heb: 'וַתֹּאמֶר' },
    following: [
      { verse: '1:20', ko: '"나를 나오미(기쁨)라 부르지 말고 마라(쓴 것)라 부르소서"', role: 'speech' },
      { verse: '1:21', ko: '(이유) 전능자가 나를 심히 고통스럽게 하셨음이라', role: 'ground' },
    ],
  },
  {
    main: { verse: '1:22', ko: '나오미가 룻과 함께 돌아왔더라', heb: 'וַתָּשָׁב' },
    following: [
      { verse: '1:22', ko: '마침 보리 추수 시작 때였더라', role: 'circumstance' },
    ],
  },
];

export const ROLE_CFG = {
  temporal:       { label: '시간·배경', color: '#64748b', bg: '#f1f5f9' },
  circumstance:   { label: '상황·배경', color: '#64748b', bg: '#f1f5f9' },
  result:         { label: '결과',      color: '#0369a1', bg: '#eff6ff' },
  ground:         { label: '이유',      color: '#059669', bg: '#f0fdf4' },
  identification: { label: '인물·설명', color: '#94a3b8', bg: '#f8fafc' },
  speech:         { label: '발화',      color: '#7c3aed', bg: '#f5f3ff' },
  contrast:       { label: '대조',      color: '#dc2626', bg: '#fef2f2' },
};

export const DIVIDER_STYLES = {
  danger:  { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  hope:    { color: '#059669', bg: '#f0fdf4', border: '#6ee7b7' },
  warning: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  climax:  { color: '#be123c', bg: '#fff1f2', border: '#fda4af' },
  neutral: { color: '#0369a1', bg: '#eff6ff', border: '#bae6fd' },
};

// '1:3', '1:8-9', '1:1a' → { chapter, verseStart, verseEnd }
export function parseVerseRef(ref) {
  const clean = String(ref).replace(/[a-z]/gi, '').replace('–', '-').replace('—', '-');
  const m = clean.match(/(\d+):(\d+)(?:-(\d+))?/);
  if (!m) return null;
  return { chapter: parseInt(m[1]), verseStart: parseInt(m[2]), verseEnd: parseInt(m[3] ?? m[2]) };
}
