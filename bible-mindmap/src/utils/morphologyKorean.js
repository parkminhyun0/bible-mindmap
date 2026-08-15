const GREEK = {
  pos: { V:'동사', N:'명사', A:'형용사', T:'관사', P:'대명사', D:'부사', C:'접속사', I:'감탄사', R:'전치사', X:'불변사' },
  tense: { P:'현재', I:'미완료', F:'미래', A:'부정과거', X:'완료', Y:'과거완료' },
  voice: { A:'능동태', M:'중간태', P:'수동태', E:'중간·수동태' },
  mood: { I:'직설법', S:'가정법', O:'희구법', M:'명령법', N:'부정사', P:'분사' },
  case: { N:'주격', G:'속격', D:'여격', A:'대격', V:'호격' },
  gender: { M:'남성', F:'여성', N:'중성' },
  number: { S:'단수', P:'복수', D:'쌍수' },
  person: { '1':'1인칭', '2':'2인칭', '3':'3인칭' },
};

const HEBREW = {
  pos: { V:'동사', N:'명사', A:'형용사', P:'대명사', T:'불변사', R:'전치사', C:'접속사', D:'부사', S:'접미대명사', X:'불변사', I:'감탄사' },
  stem: { q:'칼(Qal)', N:'니팔(Niphal)', p:'피엘(Piel)', P:'푸알(Pual)', h:'히필(Hiphil)', H:'호팔(Hophal)', t:'히트파엘(Hithpael)' },
  aspect: { p:'완료형', i:'미완료형', v:'연속형', q:'연속완료형', a:'능동분사', c:'수동분사', r:'분사', s:'부정사', j:'지시형' },
  gender: { m:'남성', f:'여성', c:'공성' },
  number: { s:'단수', p:'복수', d:'쌍수' },
  person: { '1':'1인칭', '2':'2인칭', '3':'3인칭' },
  state: { a:'독립형', c:'연계형' },
};

const NOTES = {
  '부정과거':'동작을 하나의 전체 사건으로 바라보는 형태입니다.',
  '완료':'완료된 사건과 그 결과 상태를 함께 강조할 수 있습니다.',
  '능동태':'문법적 주어가 동작을 수행합니다.',
  '중간태':'주어가 동작에 직접 관여하거나 그 결과와 관련됩니다.',
  '수동태':'문법적 주어가 동작을 받습니다.',
  '직설법':'화자가 사실이나 실제 상황으로 제시하는 기본 서술 방식입니다.',
  '가정법':'가능성·목적·조건 등 문맥 의존적 상황을 나타낼 수 있습니다.',
  '명령법':'명령·권면·요청을 나타냅니다.',
  '분사':'동사의 성격을 가지면서 형용사·부사처럼 문장을 수식합니다.',
  '주격':'주로 문장의 주어 또는 서술 관계에 사용됩니다.',
  '속격':'소유·근원·관계 등을 나타내며 문맥에 따라 기능이 달라집니다.',
  '여격':'간접 목적·수단·위치·관계 등을 나타낼 수 있습니다.',
  '대격':'주로 직접 목적어나 방향·범위를 나타냅니다.',
  '칼(Qal)':'가장 기본적인 어간으로 어휘의 기본 용법이 자주 나타납니다. 다만 Qal을 항상 “단순·능동” 의미로 고정하지 않습니다.',
  '니팔(Niphal)':'수동·중간·재귀·상태 의미가 자주 나타나지만, 실제 기능은 해당 어휘의 사전 분기와 문맥에서 확인해야 합니다.',
  '피엘(Piel)':'강화·상태화·사역·반복·명명 등 여러 파생 기능이 나타날 수 있어 “강조형” 하나로 고정하지 않습니다.',
  '푸알(Pual)':'Piel 계열의 수동·결과적 기능이 자주 나타나지만, 실제 의미는 어휘별 사전 분기를 확인해야 합니다.',
  '히필(Hiphil)':'사역·원인 유발 의미가 자주 나타나지만 모든 Hiphil을 단순히 “~하게 하다”로 환원하지 않습니다.',
  '호팔(Hophal)':'Hiphil 계열의 수동·사역 결과 의미가 자주 나타나며 실제 뜻은 어휘별 사전 분기를 확인해야 합니다.',
  '히트파엘(Hithpael)':'재귀·상호·자기 관련·반복 의미가 자주 나타나지만, 정확한 기능은 어휘별 사전 분기와 문맥을 함께 봅니다.',
  '완료형':'행동을 완결된 전체로 바라보며 실제 시간은 문맥에서 판단합니다.',
  '미완료형':'아직 완결되지 않은 동작, 반복·진행·미래 가능성을 문맥에 따라 나타냅니다.',
  '연계형':'뒤따르는 명사와 결합해 소유·관계 구조를 형성합니다.',
  '독립형':'다른 명사에 문법적으로 종속되지 않은 기본 형태입니다.',
};

function parseGreek(code) {
  const [head, ...rest] = code.split('-');
  const values = [GREEK.pos[head] || head];
  const detail = rest.join('-');
  if (head === 'V') {
    const [tvm='', pn=''] = detail.split('-');
    values.push(GREEK.tense[tvm[0]], GREEK.voice[tvm[1]], GREEK.mood[tvm[2]], GREEK.person[pn[0]], GREEK.number[pn[1]]);
  } else {
    const nominal = detail.split('-')[0] || '';
    values.push(GREEK.case[nominal[0]], GREEK.number[nominal[1]], GREEK.gender[nominal[2]]);
  }
  return values.filter(Boolean);
}

function parseHebrewSegment(segment) {
  const head = segment[0];
  const values = [HEBREW.pos[head] || head];
  if (head === 'V') {
    values.push(HEBREW.stem[segment[1]], HEBREW.aspect[segment[2]], HEBREW.person[segment[3]], HEBREW.gender[segment[4]], HEBREW.number[segment[5]]);
  } else if (head === 'N' || head === 'A') {
    values.push(HEBREW.gender[segment[2]], HEBREW.number[segment[3]], HEBREW.state[segment[4]]);
  }
  return values.filter(Boolean);
}

function parseHebrew(code) {
  return code.slice(1).split('/').filter(Boolean).flatMap(parseHebrewSegment);
}

export function explainMorphologyKorean(code) {
  if (!code) return null;
  const values = code.startsWith('H') ? parseHebrew(code) : parseGreek(code);
  const notes = [...new Set(values.map((value) => NOTES[value]).filter(Boolean))];
  return {
    code,
    language: code.startsWith('H') ? 'hebrew' : 'greek',
    values,
    summary: values.join(' · ') || code,
    explanation: notes.join(' ') || '이 형태는 문장 안에서의 실제 기능과 앞뒤 문맥을 함께 확인해야 합니다.',
    caution: code.startsWith('H')
      ? '히브리어 어간과 형태론은 의미 해석의 단서입니다. 최종 어휘 의미는 BDB의 해당 stem/sense 구조와 문장 문맥을 함께 확인해야 합니다.'
      : '형태론은 가능한 문법 기능을 보여 줍니다. 최종 의미는 문장 구조와 문맥을 함께 확인해야 합니다.',
  };
}

export function morphologySummaryKorean(code) {
  return explainMorphologyKorean(code)?.summary || '';
}
