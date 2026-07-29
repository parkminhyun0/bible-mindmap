const GENRE_RULES = {
  narrative: [
    { id:'x_setting', role:'장면·배경', icon:'🏕️', color:'#64748b', bg:'rgba(100,116,139,.12)', gr:'', tr:'', desc:'사건의 장소·시간·인물을 설정하는 서사 단위입니다.', match:null },
    { id:'x_turn', role:'서사 전환', icon:'↪', color:'#d97706', bg:'rgba(217,119,6,.12)', gr:'', tr:'', desc:'사건의 방향이 바뀌는 핵심 전환점입니다.', match:null },
    { id:'x_conflict', role:'갈등·위기', icon:'⚠️', color:'#dc2626', bg:'rgba(220,38,38,.12)', gr:'', tr:'', desc:'언약 백성·인물·공동체가 위기와 갈등에 놓이는 서사 지점입니다.', match:null },
    { id:'x_fulfill', role:'성취·결과', icon:'✅', color:'#059669', bg:'rgba(5,150,105,.12)', gr:'', tr:'', desc:'앞선 약속·명령·갈등이 결과로 나타나는 지점입니다.', match:null },
  ],
  law: [
    { id:'x_command', role:'명령·규례', icon:'📜', color:'#1d4ed8', bg:'rgba(29,78,216,.12)', gr:'', tr:'', desc:'언약 공동체에 주어진 명령·규례의 핵심 단위입니다.', match:null },
    { id:'x_ground', role:'명령의 근거', icon:'◆', color:'#7c3aed', bg:'rgba(124,58,237,.12)', gr:'', tr:'', desc:'명령이 하나님의 성품·구원·언약에 근거함을 보여주는 단위입니다.', match:null },
    { id:'x_consequence', role:'결과·경고', icon:'⚖️', color:'#b45309', bg:'rgba(180,83,9,.12)', gr:'', tr:'', desc:'순종·불순종의 결과 또는 언약적 경고를 보여줍니다.', match:null },
  ],
  wisdom: [
    { id:'x_wisdom', role:'지혜 핵심', icon:'💡', color:'#b45309', bg:'rgba(180,83,9,.12)', gr:'', tr:'', desc:'본문의 지혜·신앙 성찰이 응축된 핵심 지점입니다.', match:null },
    { id:'x_contrast', role:'대조·평행', icon:'↔', color:'#7c3aed', bg:'rgba(124,58,237,.12)', gr:'', tr:'', desc:'시적 평행이나 지혜의 두 길을 대조하는 구조입니다.', match:null },
    { id:'x_lament', role:'탄식·질문', icon:'💧', color:'#475569', bg:'rgba(71,85,105,.12)', gr:'', tr:'', desc:'고난·부재·불의 앞에서 하나님께 질문하고 호소하는 단위입니다.', match:null },
    { id:'x_praise', role:'찬양·신뢰', icon:'🎵', color:'#059669', bg:'rgba(5,150,105,.12)', gr:'', tr:'', desc:'탄식·성찰이 신뢰와 찬양으로 전환되는 지점입니다.', match:null },
  ],
  prophetic: [
    { id:'x_oracle', role:'예언 신탁', icon:'📣', color:'#dc2626', bg:'rgba(220,38,38,.12)', gr:'', tr:'', desc:'하나님의 심판·경고·구원 선언이 집중되는 신탁입니다.', match:null },
    { id:'x_charge', role:'고발·언약 소송', icon:'⚖️', color:'#b45309', bg:'rgba(180,83,9,.12)', gr:'', tr:'', desc:'언약 위반과 공동체의 죄를 드러내는 고발 단위입니다.', match:null },
    { id:'x_judgment', role:'심판 선언', icon:'🔥', color:'#991b1b', bg:'rgba(153,27,27,.12)', gr:'', tr:'', desc:'죄에 대한 하나님의 역사적·종말적 심판을 선언합니다.', match:null },
    { id:'x_restoration', role:'회복 약속', icon:'🌱', color:'#059669', bg:'rgba(5,150,105,.12)', gr:'', tr:'', desc:'심판 이후 언약 회복과 구원 소망을 여는 지점입니다.', match:null },
  ],
  gospel: [
    { id:'x_reveal', role:'정체 계시', icon:'👑', color:'#7c3aed', bg:'rgba(124,58,237,.12)', gr:'', tr:'', desc:'예수의 정체와 사역 의미가 드러나는 복음서 핵심 지점입니다.', match:null },
    { id:'x_sign', role:'표적·행동', icon:'✨', color:'#0891b2', bg:'rgba(8,145,178,.12)', gr:'', tr:'', desc:'가르침과 정체를 드러내는 표적·행동·사건 단위입니다.', match:null },
    { id:'x_teaching', role:'가르침·담론', icon:'📖', color:'#1d4ed8', bg:'rgba(29,78,216,.12)', gr:'', tr:'', desc:'하나님 나라와 제자도에 대한 가르침이 집중되는 단위입니다.', match:null },
    { id:'x_passion', role:'수난·성취', icon:'✝️', color:'#dc2626', bg:'rgba(220,38,38,.12)', gr:'', tr:'', desc:'십자가와 부활을 향해 서사가 수렴하는 전환·성취 단위입니다.', match:null },
  ],
  epistle: [
    { id:'x_thesis', role:'핵심 명제', icon:'📖', color:'#1d4ed8', bg:'rgba(29,78,216,.12)', gr:'', tr:'', desc:'서신의 주요 신학적 주장이나 권면을 여는 지점입니다.', match:null },
    { id:'x_ground', role:'근거·설명', icon:'◆', color:'#7c3aed', bg:'rgba(124,58,237,.12)', gr:'', tr:'', desc:'앞선 명제의 성경적·복음적 근거와 설명을 제공합니다.', match:null },
    { id:'x_conclusion', role:'결론·요약', icon:'∴', color:'#047857', bg:'rgba(4,120,87,.12)', gr:'', tr:'', desc:'앞선 논증을 요약하거나 결론으로 수렴시키는 지점입니다.', match:null },
    { id:'x_praxis', role:'실천 적용', icon:'🎯', color:'#d97706', bg:'rgba(217,119,6,.12)', gr:'', tr:'', desc:'교리·논증이 공동체의 삶과 실천으로 연결되는 지점입니다.', match:null },
  ],
  apocalyptic: [
    { id:'x_vision', role:'환상 전환', icon:'👁️', color:'#7c3aed', bg:'rgba(124,58,237,.12)', gr:'', tr:'', desc:'새로운 환상·묵시 장면이 열리는 구조적 전환점입니다.', match:null },
    { id:'x_conflict', role:'우주적 갈등', icon:'⚔️', color:'#dc2626', bg:'rgba(220,38,38,.12)', gr:'', tr:'', desc:'하나님의 통치와 악의 세력이 충돌하는 묵시적 갈등 단위입니다.', match:null },
    { id:'x_worship', role:'보좌·예배', icon:'🙌', color:'#0369a1', bg:'rgba(3,105,161,.12)', gr:'', tr:'', desc:'하나님의 주권과 어린양의 승리를 예배로 해석하는 단위입니다.', match:null },
    { id:'x_victory', role:'승리·완성', icon:'👑', color:'#059669', bg:'rgba(5,150,105,.12)', gr:'', tr:'', desc:'하나님의 통치와 구원 완성을 선언하는 지점입니다.', match:null },
  ],
};

const NT_TERMS = {
  G2316:{ko:'하나님',color:'#7c3aed'}, G2424:{ko:'예수',color:'#dc2626'},
  G5547:{ko:'그리스도',color:'#dc2626'}, G4102:{ko:'믿음',color:'#2563eb'},
  G5485:{ko:'은혜',color:'#06b6d4'}, G0026:{ko:'사랑',color:'#e11d48'},
  G4151:{ko:'성령',color:'#059669'}, G2222:{ko:'생명',color:'#10b981'},
  G1680:{ko:'소망',color:'#0ea5e9'}, G1343:{ko:'의',color:'#8b5cf6'},
};
const OT_TERMS = {
  H3068:{ko:'여호와',color:'#7c3aed'}, H0430:{ko:'하나님',color:'#7c3aed'},
  H1285:{ko:'언약',color:'#2563eb'}, H2617:{ko:'인자',color:'#e11d48'},
  H8451:{ko:'율법',color:'#d97706'}, H6666:{ko:'의',color:'#059669'},
  H0559:{ko:'말씀·말하다',color:'#0369a1'}, H7307:{ko:'영·바람',color:'#0891b2'},
};

const ARC_MODELS = {
  narrative: [
    { type:'서사 진행', criterion:'앞 사건이 다음 사건의 배경·갈등·전환을 형성하는지 따라갑니다.', meaning:'주요 사건과 선택이 다음 장면의 조건을 만들며 서사의 방향을 전진시킵니다.' },
    { type:'전환·결과', criterion:'갈등이나 하나님의 개입 이후 사건의 방향과 결과가 어떻게 달라지는지 비교합니다.', meaning:'전환점 전후를 함께 읽어 인간의 선택과 하나님의 섭리가 만들어 내는 결과를 확인합니다.' },
    { type:'약속·성취', criterion:'앞선 약속·명령·기대가 뒤 사건에서 성취·부분 성취·새 단계로 이어지는지 확인합니다.', meaning:'서사의 진행 속에서 하나님의 말씀과 약속이 역사적으로 어떻게 구체화되는지 보여줍니다.' },
  ],
  law: [
    { type:'명령·근거', criterion:'규례와 명령이 하나님의 구원 행위·성품·언약에 어떤 근거를 두는지 연결합니다.', meaning:'율법은 고립된 규정이 아니라 구원받은 언약 공동체의 삶을 형성하는 구조로 읽습니다.' },
    { type:'규례·결과', criterion:'명령과 순종·불순종의 결과, 정결·부정 또는 공동체 질서의 관계를 비교합니다.', meaning:'규례의 목적과 공동체적 결과를 함께 보아 율법의 기능을 구조적으로 이해합니다.' },
  ],
  wisdom: [
    { type:'시적 평행', criterion:'반복·대응·점층·대조되는 표현과 이미지가 서로를 해석하는지 살핍니다.', meaning:'평행과 반복은 시적 강조점을 드러내며 한 행을 다른 행과 함께 읽게 합니다.' },
    { type:'대조·성찰', criterion:'지혜와 어리석음, 의인과 악인, 탄식과 신뢰처럼 서로 다른 상태를 비교합니다.', meaning:'대조 구조는 본문이 제시하는 삶의 두 길과 신앙적 판단 기준을 선명하게 합니다.' },
    { type:'탄식→신뢰', criterion:'질문·탄식·혼란이 신뢰·찬양·지혜의 결론으로 이동하는 흐름을 확인합니다.', meaning:'감정의 변화 자체보다 하나님을 향한 시선과 신앙적 결론이 어떻게 형성되는지 보여줍니다.' },
  ],
  prophetic: [
    { type:'고발→심판', criterion:'언약 위반에 대한 고발이 어떤 심판 선언으로 이어지는지 추적합니다.', meaning:'심판은 임의적 사건이 아니라 언약적 책임과 죄에 대한 응답이라는 구조를 보여줍니다.' },
    { type:'심판→회복', criterion:'심판 신탁 이후 남은 자·새 언약·시온 회복·구원 약속이 어떻게 이어지는지 확인합니다.', meaning:'예언서의 심판과 소망을 분리하지 않고 하나님의 거룩과 언약적 신실하심 안에서 함께 읽게 합니다.' },
    { type:'예언 진행', criterion:'반복되는 신탁과 환상이 주제를 확장·심화하며 다음 단락으로 이어지는지 살핍니다.', meaning:'개별 신탁을 책 전체의 메시지와 연결해 심판과 구원의 발전을 볼 수 있습니다.' },
  ],
  gospel: [
    { type:'정체 계시', criterion:'말씀·표적·고백·사건을 통해 예수의 정체가 점진적으로 드러나는 흐름을 연결합니다.', meaning:'각 장면은 예수의 정체와 사역 목적을 서로 비추며 복음서 전체 기독론을 형성합니다.' },
    { type:'표적→가르침', criterion:'행동·표적과 이어지는 가르침 또는 제자들의 반응을 함께 비교합니다.', meaning:'행동과 말씀을 분리하지 않고 하나님 나라와 제자도의 의미를 통합해 읽게 합니다.' },
    { type:'수난·성취', criterion:'예고·갈등·예루살렘 진행이 십자가와 부활에서 어떻게 성취되는지 확인합니다.', meaning:'복음서의 사건들이 수난과 부활을 향해 수렴하는 구속사적 중심을 보여줍니다.' },
  ],
  epistle: [
    { type:'논증 진행', criterion:'앞선 주장과 다음 주장 사이의 근거·설명·결론 관계를 따라갑니다.', meaning:'서신의 문장을 고립시키지 않고 저자의 논증 순서 속에서 읽도록 돕습니다.' },
    { type:'근거→결론', criterion:'신학적 명제와 그 근거 또는 요약 결론이 어떻게 연결되는지 확인합니다.', meaning:'교리적 주장의 이유와 결론을 함께 보아 논증의 무게중심을 파악합니다.' },
    { type:'교리→적용', criterion:'복음·교리 설명이 공동체 윤리와 실천 권면으로 어떻게 전환되는지 살핍니다.', meaning:'신학과 삶을 분리하지 않고 저자가 의도한 적용의 방향을 확인하게 합니다.' },
  ],
  apocalyptic: [
    { type:'환상 진행', criterion:'연속되는 환상 장면이 심판·구원·예배의 주제를 어떻게 확장하는지 연결합니다.', meaning:'상징을 개별적으로 떼지 않고 환상 전체의 진행과 반복 패턴 속에서 읽게 합니다.' },
    { type:'갈등→승리', criterion:'악의 세력과 성도의 증언, 하나님의 심판과 승리 선언이 어떻게 대응하는지 확인합니다.', meaning:'현재의 갈등을 하나님의 최종 통치와 어린양의 승리라는 결말에서 해석합니다.' },
    { type:'예배→완성', criterion:'보좌·예배 장면과 새 창조·왕권 완성 장면의 대응을 살핍니다.', meaning:'묵시의 중심을 공포가 아니라 하나님의 주권·예배·새 창조의 완성에서 보도록 돕습니다.' },
  ],
};

const ARC_CAUTION = '이 Arc는 해당 권의 거시 문맥을 설명하기 위한 구조적·해석적 제안입니다. 새로운 교리의 단독 근거로 사용하지 말고 연결된 두 본문과 앞뒤 문맥을 함께 확인해야 합니다.';

function family(genre='') {
  if (genre.includes('묵시')) return 'apocalyptic';
  if (genre.includes('복음서')) return 'gospel';
  if (genre.includes('예언')) return 'prophetic';
  if (genre.includes('지혜') || genre.includes('시가') || genre.includes('애가')) return 'wisdom';
  if (genre.includes('율법')) return 'law';
  if (genre.includes('서신')) return 'epistle';
  return 'narrative';
}

function sections(profile) {
  const colors=['#e11d48','#0891b2','#059669','#7c3aed','#d97706','#0369a1'];
  return profile.sections.map(([fromCh,toCh,label],i)=>({ id:`s${i+1}`, fromCh, toCh, color:colors[i%colors.length], label }));
}

function agenda(book, profile) {
  const result={};
  for (const [fromCh,toCh,label] of profile.sections) {
    for (let ch=fromCh; ch<=toCh; ch++) result[ch]=`${label} · ${book.ko} ${ch}장`;
  }
  return result;
}

function pivots(profile) {
  const colors=['#7c3aed','#dc2626','#059669','#0369a1','#d97706','#0891b2'];
  return profile.pivots.map(([ch,verse,label],i)=>({ id:`p${i+1}`, ch, verse, color:colors[i%colors.length], label }));
}

function arcFromModel({ id, from, to, color, label, model, book, profile, whole=false }) {
  return {
    id,
    from:from.id,
    to:to.id,
    color,
    label,
    type: whole ? '권 전체 구조' : model.type,
    method:'역사·문법적 문맥 → 문학적 구조 → 정경적·구속사적 종합',
    criterion: whole
      ? `${book.ko}의 시작과 마지막 핵심 Pivot을 연결해 권 전체 주제와 구조적 진행을 확인합니다.`
      : model.criterion,
    evidence:`${book.ko} ${from.ch}:${from.verse} “${from.label}”과 ${book.ko} ${to.ch}:${to.verse} “${to.label}”을 1차 본문 근거로 비교합니다.`,
    meaning: whole
      ? `${book.ko}의 중심 주제 “${profile.theme}”가 책의 시작에서 결말까지 어떻게 전개되는지 보여주는 거시 Arc입니다.`
      : `${model.meaning} ${book.ko}의 중심 주제 “${profile.theme}” 안에서 이 연결의 위치를 확인합니다.`,
    caution:ARC_CAUTION,
  };
}

function arcs(points, genreFamily, book, profile) {
  if (points.length<2) return [];
  const models=ARC_MODELS[genreFamily]||ARC_MODELS.narrative;
  const result=[];
  for (let i=0;i<points.length-1;i++) {
    const model=models[i%models.length];
    result.push(arcFromModel({
      id:`a${i+1}`,
      from:points[i],
      to:points[i+1],
      color:points[i+1].color,
      label:`${points[i].label} → ${points[i+1].label} · ${model.type}`,
      model,
      book,
      profile,
    }));
  }
  if (points.length>2) {
    result.push(arcFromModel({
      id:`a${result.length+1}`,
      from:points[0],
      to:points.at(-1),
      color:'#94a3b8',
      label:`${points[0].label} → ${points.at(-1).label} · 권 전체 흐름`,
      model:models[0],
      book,
      profile,
      whole:true,
    }));
  }
  return result;
}

function manualDiscourse(points, rules) {
  const result={};
  points.forEach((point,index)=>{ result[`${point.ch}:${point.verse}`]=rules[index%rules.length].id; });
  return result;
}

export function buildExpandedContext(book,index,profile,baseRules=[]) {
  if (!profile) return null;
  const testament=index<39?'OT':'NT';
  const genreFamily=family(profile.genre);
  const extraRules=GENRE_RULES[genreFamily]||GENRE_RULES.narrative;
  const pointData=pivots(profile);
  const sectionData=sections(profile);

  return {
    id:book.id,
    book:{ ko:book.ko, bollsNum:index+1, lexId:book.id, lexCorpus:testament==='OT'?'hot':'gnt', en:book.en, testament },
    chapters:book.chapters,
    discourseRules:[...baseRules,...extraRules],
    manualDiscourse:manualDiscourse(pointData,extraRules),
    theoTerms:testament==='OT'?OT_TERMS:NT_TERMS,
    meta:{
      genre:profile.genre,
      genreNote:`권별 정식 구조 프로필 · ${genreFamily} 장르 규칙 적용`,
      year:profile.year||'', yearNote:profile.yearNote||'연대는 전통적 견해와 현대 학계의 논의가 있어 단정하지 않습니다.',
      place:profile.place||'', placeNote:profile.placeNote||'기록 장소가 확정되지 않은 경우 비워 두며 본문 해석에 필요한 범위만 사용합니다.',
      author:profile.author,
      authorNote:profile.authorNote||'전통적 저자 표기 또는 정경적 편집 전승 기준',
      audience:profile.audience,
      audienceNote:profile.audienceNote||'본문의 역사·문학적 독자 맥락',
      theme:profile.theme,
      themeNote:profile.themeNote||'권 전체 구조와 반복 모티프를 요약한 핵심 주제',
      chapterAgenda:agenda(book,profile),
    },
    macro:{ sections:sectionData, pivots:pointData, arcs:arcs(pointData,genreFamily,book,profile) },
    disputedRanges:profile.disputedRanges||[],
    contextTier:'structured',
    contextStatus:{ source:'book-profile', genreFamily, isSpecialized:false, hasManualPivots:pointData.length>0, hasMacro:sectionData.length>0, hasArcSemantics:true },
  };
}
