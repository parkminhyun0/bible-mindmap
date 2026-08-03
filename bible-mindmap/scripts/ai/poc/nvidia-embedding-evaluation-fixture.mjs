export const NVIDIA_POC_EVALUATION_REVISION = 'canonical-audit-v2';

export const POC_DOCUMENTS = Object.freeze([
  { id: 'canonical.seed', title: '아브라함의 씨와 열방의 복', text: '아브라함에게 주신 씨와 후손의 약속은 한 가문을 통해 모든 민족이 복을 얻고 그리스도 안에서 성취되는 정경 흐름을 이룬다.', sourceRefs: ['Gen 12:1-3', 'Gen 17:7', 'Gal 3:16'], metadata: { topic: 'seed', type: 'canonical-concept', approvedForPoc: true } },
  { id: 'canonical.king', title: '다윗 언약과 메시아 왕권', text: '다윗의 보좌와 영원한 왕의 통치는 시편의 기름부음 받은 왕을 거쳐 예수 그리스도의 왕권으로 완성된다.', sourceRefs: ['2Sam 7:12-16', 'Ps 2:6-12', 'Luke 1:32-33'], metadata: { topic: 'king', type: 'canonical-concept', approvedForPoc: true } },
  { id: 'canonical.temple', title: '성막과 성전에서 새 창조의 임재로', text: '구름이 성막과 성전을 채운 하나님의 임재가 말씀이 육신이 되어 장막을 치심과 교회와 새 예루살렘의 빛으로 발전한다.', sourceRefs: ['Exod 40:34-38', 'John 1:14', 'Rev 21:22-23'], metadata: { topic: 'temple', type: 'canonical-concept', approvedForPoc: true } },
  { id: 'canonical.exodus', title: '출애굽과 구속의 해방', text: '유월절과 바다를 통한 노예의 집으로부터의 구원이 그리스도의 십자가와 새 출애굽의 해방으로 발전한다.', sourceRefs: ['Exod 12:1-32', 'Luke 9:31', '1Cor 5:7'], metadata: { topic: 'exodus', type: 'canonical-concept', approvedForPoc: true } },
  { id: 'canonical.new-covenant', title: '새 언약과 마음에 기록된 말씀', text: '새 언약은 돌판이 아니라 마음에 하나님의 법을 기록하고 죄를 용서하며 하나님을 아는 백성을 세우는 약속이다.', sourceRefs: ['Jer 31:31-34', 'Luke 22:20', 'Heb 8:8-12'], metadata: { topic: 'new-covenant', type: 'canonical-concept', approvedForPoc: true } },
  { id: 'canonical.sacrifice', title: '제사와 단번 속죄의 대제사장', text: '제사와 속죄일의 피는 세상 죄를 지는 어린양과 단번에 자신을 드린 영원한 대제사장 그리스도에게서 완성된다.', sourceRefs: ['Lev 16:15-22', 'John 1:29', 'Heb 9:11-14'], metadata: { topic: 'sacrifice', type: 'canonical-concept', approvedForPoc: true } },
  { id: 'canonical.creation', title: '창조와 마지막 아담의 새 창조', text: '첫 창조와 첫 아담의 실패를 넘어 마지막 아담 그리스도 안에서 새 창조와 새 하늘과 새 땅이 시작된다.', sourceRefs: ['Gen 1:26-31', '1Cor 15:45-49', 'Rev 21:1-5'], metadata: { topic: 'creation', type: 'canonical-concept', approvedForPoc: true } },
  { id: 'canonical.exile-return', title: '포로와 남은 자의 귀환', text: '바벨론 포로와 심판 속에서도 남은 자를 보존하고 귀환과 회복을 약속하신 하나님이 자기 백성을 다시 모으신다.', sourceRefs: ['2Kgs 25:8-12', 'Isa 40:1-5', 'Ezra 1:1-4'], metadata: { topic: 'exile-return', type: 'canonical-concept', approvedForPoc: true } },
  { id: 'canonical.wisdom-word', title: '지혜와 태초의 말씀', text: '창조 전에 하나님과 함께한 지혜와 말씀의 주제가 태초부터 계신 로고스 예수 그리스도 안에서 인격적으로 드러난다.', sourceRefs: ['Prov 8:22-31', 'John 1:1-3', '1Cor 1:24'], metadata: { topic: 'wisdom-word', type: 'canonical-concept', approvedForPoc: true } },
  { id: 'canonical.spirit', title: '새 영과 성령의 부으심', text: '마른 뼈에 생기를 주고 새 마음과 새 영을 약속하신 하나님이 오순절에 성령을 부어 새 언약 공동체를 세우신다.', sourceRefs: ['Ezek 36:26-27', 'Ezek 37:9-14', 'Acts 2:1-18'], metadata: { topic: 'spirit', type: 'canonical-concept', approvedForPoc: true } },
  { id: 'canonical.resurrection', title: '부활과 죽음의 패배', text: '죽은 자 가운데서 살아나신 그리스도는 잠자는 자들의 첫 열매가 되시며 마지막 날 몸의 부활과 죽음의 패배를 보증하신다.', sourceRefs: ['Dan 12:2', '1Cor 15:20-26', 'John 11:25-26'], metadata: { topic: 'resurrection', type: 'canonical-concept', approvedForPoc: true } },
  { id: 'canonical.righteousness', title: '율법과 믿음으로 얻는 의', text: '율법은 죄를 드러내지만 사람은 율법의 행위가 아니라 예수 그리스도를 믿음으로 의롭다 하심을 받고 의의 열매를 맺는다.', sourceRefs: ['Hab 2:4', 'Rom 3:20-28', 'Gal 3:10-14'], metadata: { topic: 'righteousness', type: 'canonical-concept', approvedForPoc: true } },
].map((item) => Object.freeze({ ...item, metadata: Object.freeze(item.metadata), sourceRefs: Object.freeze(item.sourceRefs) })));

export const POC_CASES = Object.freeze([
  { id: 'seed-direct', query: '아브라함의 씨 약속이 그리스도 안에서 성취되는 정경 흐름', relevantIds: ['canonical.seed'], hardNegativeIds: ['canonical.creation'], metadata: { queryType: 'direct' } },
  { id: 'seed-paraphrase', query: '한 사람의 가문을 통해 모든 민족에게 복이 임한다는 약속', relevantIds: ['canonical.seed'], hardNegativeIds: ['canonical.king'], metadata: { queryType: 'semantic' } },
  { id: 'king-direct', query: '다윗의 보좌와 영원한 메시아 왕권', relevantIds: ['canonical.king'], hardNegativeIds: ['canonical.seed'], metadata: { queryType: 'direct' } },
  { id: 'temple-paraphrase', query: '구름이 장막을 채우고 말씀이 우리 가운데 거하며 마지막 도성을 비추는 흐름', relevantIds: ['canonical.temple'], hardNegativeIds: ['canonical.king'], metadata: { queryType: 'semantic' } },
  { id: 'exodus-paraphrase', query: '노예의 집에서 건져 바다를 지나게 한 구원이 십자가의 해방으로 이어지는가', relevantIds: ['canonical.exodus'], hardNegativeIds: ['canonical.exile-return'], metadata: { queryType: 'semantic' } },
  { id: 'new-covenant-direct', query: '돌판이 아니라 마음에 기록되는 언약과 죄 사함', relevantIds: ['canonical.new-covenant'], hardNegativeIds: ['canonical.king'], metadata: { queryType: 'direct' } },
  { id: 'sacrifice-paraphrase', query: '반복 제사가 아니라 단번에 자신을 드린 대제사장과 어린양', relevantIds: ['canonical.sacrifice'], hardNegativeIds: ['canonical.wisdom-word'], metadata: { queryType: 'semantic' } },
  { id: 'creation-paraphrase', query: '첫 아담의 실패를 넘어 마지막 아담 안에서 시작되는 새 창조', relevantIds: ['canonical.creation'], hardNegativeIds: ['canonical.seed'], metadata: { queryType: 'semantic' } },
  { id: 'exile-direct', query: '바벨론 포로와 남은 자의 귀환 및 회복', relevantIds: ['canonical.exile-return'], hardNegativeIds: ['canonical.exodus'], metadata: { queryType: 'direct' } },
  { id: 'wisdom-paraphrase', query: '태초부터 하나님과 함께한 말씀과 지혜가 사람 가운데 나타남', relevantIds: ['canonical.wisdom-word'], hardNegativeIds: ['canonical.king'], metadata: { queryType: 'semantic' } },
  { id: 'spirit-paraphrase', query: '마른 뼈에 생기가 들어가고 새 마음을 받은 백성에게 오순절이 임함', relevantIds: ['canonical.spirit'], hardNegativeIds: ['canonical.resurrection'], metadata: { queryType: 'semantic' } },
  { id: 'resurrection-direct', query: '죽은 자 가운데서 첫 열매가 되신 그리스도와 몸의 부활', relevantIds: ['canonical.resurrection'], hardNegativeIds: ['canonical.creation'], metadata: { queryType: 'direct' } },
  { id: 'righteousness-paraphrase', query: '율법의 행위가 아니라 믿음으로 의롭다 하심을 받는 길', relevantIds: ['canonical.righteousness'], hardNegativeIds: ['canonical.new-covenant'], metadata: { queryType: 'semantic' } },
  { id: 'royal-priest', query: '영원한 왕이 동시에 백성을 위한 대제사장으로 나타나는 흐름', relevantIds: ['canonical.king', 'canonical.sacrifice'], hardNegativeIds: ['canonical.temple'], metadata: { queryType: 'multi-hop' } },
  { id: 'new-heart-spirit', query: '새 언약에서 죄를 씻고 새 영을 주어 마음을 변화시키는 약속', relevantIds: ['canonical.new-covenant', 'canonical.spirit'], hardNegativeIds: ['canonical.righteousness'], metadata: { queryType: 'multi-hop' } },
  { id: 'new-creation-resurrection', query: '창조의 회복이 그리스도의 부활과 마지막 새 하늘과 새 땅으로 이어지는 흐름', relevantIds: ['canonical.creation', 'canonical.resurrection'], hardNegativeIds: ['canonical.exile-return'], metadata: { queryType: 'multi-hop' } },
].map((item) => Object.freeze({
  ...item,
  relevantIds: Object.freeze(item.relevantIds),
  hardNegativeIds: Object.freeze(item.hardNegativeIds),
  metadata: Object.freeze(item.metadata),
})));
