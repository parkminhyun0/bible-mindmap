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

function arcs(points) {
  if (points.length<2) return [];
  const result=[];
  for (let i=0;i<points.length-1;i++) {
    result.push({ id:`a${i+1}`, from:points[i].id, to:points[i+1].id, color:points[i+1].color, label:`${points[i].label} → ${points[i+1].label}` });
  }
  if (points.length>2) {
    result.push({ id:`a${result.length+1}`, from:points[0].id, to:points.at(-1).id, color:'#94a3b8', label:`${points[0].label} → ${points.at(-1).label} (권 전체 흐름)` });
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
    macro:{ sections:sectionData, pivots:pointData, arcs:arcs(pointData) },
    disputedRanges:profile.disputedRanges||[],
    contextTier:'structured',
    contextStatus:{ source:'book-profile', genreFamily, isSpecialized:false, hasManualPivots:pointData.length>0, hasMacro:sectionData.length>0 },
  };
}
