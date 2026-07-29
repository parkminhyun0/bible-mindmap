const ARC_PATTERNS = [
  {
    id: 'inclusio',
    label: '문학적 수미상관·반복',
    test: /Inclusio|수미|처음.*마지막|시작.*마감|표제.*고백|재확인|반복|다시|이어짐/,
    criterion: '같거나 대응하는 어휘·선언·장면이 책의 앞뒤에서 반복되어 하나의 문학적 단위를 이루는지 살핍니다.',
    meaning: '두 본문은 서로를 해석하는 문학적 테두리로 읽을 수 있습니다. 뒤 본문은 앞의 선언을 재확인하거나 완성하고, 앞 본문은 뒤 결론을 읽는 기준을 제공합니다.',
  },
  {
    id: 'promise-fulfillment',
    label: '약속·예고와 성취',
    test: /약속|예고|성취|완성|응답|결실|결론|이루|채우|도착|나타남.*재림/,
    criterion: '앞 본문의 약속·예고·문제 제기가 뒤 본문에서 어떻게 응답되거나 성취되는지 문맥의 진행을 따라 확인합니다.',
    meaning: '이 연결은 하나님의 약속과 구원 행위가 선언에 머물지 않고 역사와 서사 안에서 성취되는 흐름을 보여줍니다.',
  },
  {
    id: 'contrast',
    label: '대조·반전',
    test: /대조|반전|아이러니|vs|전후|죽음.*생명|죄악.*언약|저주.*대속|압제.*임재|환난.*평강|비움.*높이|못함.*열심/,
    criterion: '두 본문 사이의 인물·상태·행동·결과가 의도적으로 대조되는지 확인합니다.',
    meaning: '대조는 인간의 실패와 하나님의 구원, 옛 상태와 새 상태, 심판과 은혜의 차이를 선명하게 드러냅니다. 한쪽만 떼어 읽지 않고 두 극을 함께 보도록 돕습니다.',
  },
  {
    id: 'typology',
    label: '모형·실체와 정경적 대응',
    test: /아담.*그리스도|모형|실체|그림자|아브라함.*그리스도|구약 성취|창조.*새|유월절.*심판|장자/,
    criterion: '본문이 직접 제시하는 인물·사건·제도 사이의 대응과 후대 본문의 해석을 우선하여 살핍니다.',
    meaning: '앞선 인물·사건·제도는 뒤의 구원 사건을 준비하거나 대조적으로 비춥니다. 단순한 유사성보다 본문과 정경 안의 실제 연결 근거를 우선합니다.',
  },
  {
    id: 'covenant-redemption',
    label: '언약·구속사적 진행',
    test: /언약|구속|대속|속죄|피|고엘|기업|양자|칭의|의롭|은혜|중보|화해|십자가|섭리/,
    criterion: '하나님의 언약 선언, 구속 행위, 중보와 그 결과가 본문 안에서 어떻게 발전하는지 추적합니다.',
    meaning: '두 본문은 하나님이 자기 백성을 부르시고 구속하시며 언약 관계 안에 보존하시는 흐름을 보여줍니다. 교리는 각 본문의 역사적·문학적 의미에서 출발해 정경 전체와 조화되게 읽습니다.',
  },
  {
    id: 'argument',
    label: '논증·원인과 결과',
    test: /문제.*해답|주제.*응답|근거|결과|목적|이유|그러므로|실천|교리|논증|해답|신분.*해방|신분.*무장|자격.*임무/,
    criterion: '저자가 제시한 주장, 근거, 결론과 적용의 순서를 따라 두 본문의 논리적 의존 관계를 확인합니다.',
    meaning: '뒤 본문은 앞 본문의 결론·결과·적용으로 기능하거나, 앞 본문이 뒤 주장을 뒷받침하는 근거가 됩니다. 연결 방향은 저자의 논증 순서를 따릅니다.',
  },
  {
    id: 'motif',
    label: '핵심 어휘·주제 모티프',
    test: /축|대주제|신학|모티프|주제|사랑|믿음|소망|성령|거룩|생명|영광|나라|인자|교회|말씀|기도|기쁨|평강/,
    criterion: '같은 핵심 어휘·이미지·신학 주제가 여러 문맥에서 반복되고 발전하는지 살핍니다.',
    meaning: '반복되는 주제는 해당 성경 권의 메시지를 묶는 중심축입니다. 각 위치의 차이를 보존하면서 주제가 어떻게 확장·심화되는지 비교합니다.',
  },
  {
    id: 'narrative',
    label: '서사·구조적 진행',
    test: /시작|진행|전환|소명|부르심|파송|여행|입성|추수|결혼|계보|죽음|부활|박해|흩어짐|도상|서사/,
    criterion: '인물의 선택, 사건의 전환점, 장소 이동과 결과가 서사의 인과 흐름을 이루는지 확인합니다.',
    meaning: '이 연결은 떨어진 두 장면을 하나의 서사 진행으로 읽게 합니다. 앞 사건이 뒤 사건의 조건·전환점이 되며, 뒤 사건은 앞 장면의 의미를 밝혀 줍니다.',
  },
];

const DEFAULT_PATTERN = {
  id: 'structural',
  label: '본문 거시구조',
  criterion: '해당 성경 권 안에서 두 핵심 본문의 어휘, 주제, 인물, 사건과 논리 흐름이 서로 대응하는지 확인합니다.',
  meaning: '두 본문을 함께 읽으면 한 본문만 볼 때 놓치기 쉬운 책 전체의 진행과 강조점을 확인할 수 있습니다.',
};

function referenceFor(bookName, pivot) {
  if (!pivot) return '';
  return `${bookName} ${pivot.ch}:${pivot.verse}`;
}

export function getArcExplanation({ arc, macro, book }) {
  if (!arc) return null;

  const pivots = macro?.pivots || [];
  const from = pivots.find((pivot) => pivot.id === arc.from);
  const to = pivots.find((pivot) => pivot.id === arc.to);
  const bookName = book?.ko || '';
  const pattern = ARC_PATTERNS.find((item) => item.test.test(arc.label || '')) || DEFAULT_PATTERN;
  const fromRef = referenceFor(bookName, from);
  const toRef = referenceFor(bookName, to);
  const theme = book?.theme || '';
  const themeNote = book?.themeNote || '';

  return {
    type: arc.type || pattern.label,
    method: arc.method || '역사·문법적 문맥 → 문학적 구조 → 정경적·구속사적 종합',
    criterion: arc.criterion || pattern.criterion,
    evidence: arc.evidence || (
      from && to
        ? `${fromRef}의 “${from.label}”과 ${toRef}의 “${to.label}”을 1차 본문 근거로 비교합니다.`
        : '표시된 두 본문과 해당 성경 권의 앞뒤 문맥을 1차 근거로 비교합니다.'
    ),
    meaning: arc.meaning || `${pattern.meaning}${theme ? ` 이 책의 중심 주제인 “${theme}”${themeNote ? `(${themeNote})` : ''} 안에서 연결 의미를 확인합니다.` : ''}`,
    caution: arc.caution || '이 Arc는 본문 자체에 그어진 연결선이 아니라, 해당 권의 문맥을 설명하기 위한 해석적 제안입니다. 새로운 교리의 근거로 단독 사용하지 말고 연결된 두 본문과 앞뒤 문맥을 함께 확인해야 합니다.',
    from,
    to,
    fromRef,
    toRef,
  };
}

export function validateArcExplanations(bookContexts) {
  const issues = [];
  let arcCount = 0;

  Object.values(bookContexts || {}).forEach((context) => {
    const macro = context?.macro;
    (macro?.arcs || []).forEach((arc) => {
      arcCount += 1;
      const explanation = getArcExplanation({
        arc,
        macro,
        book: {
          ko: context.book?.ko,
          theme: context.meta?.theme,
          themeNote: context.meta?.themeNote,
        },
      });
      if (!explanation?.from || !explanation?.to) {
        issues.push(`${context.id}:${arc.id}: endpoint`);
      }
      ['type', 'method', 'criterion', 'evidence', 'meaning', 'caution'].forEach((field) => {
        if (!explanation?.[field]) issues.push(`${context.id}:${arc.id}:${field}`);
      });
    });
  });

  return { arcCount, issues };
}
