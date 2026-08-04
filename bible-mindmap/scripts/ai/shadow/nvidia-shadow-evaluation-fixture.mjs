export const NVIDIA_SHADOW_EVALUATION_REVISION = 'canonical-shadow-eval-v1';

const freezeCase = (item) => Object.freeze({
  ...item,
  relevantIds: Object.freeze(item.relevantIds),
  hardNegativeIds: Object.freeze(item.hardNegativeIds),
  metadata: Object.freeze(item.metadata),
});

export const SHADOW_EVALUATION_CASES = Object.freeze([
  freezeCase({ id: 'covenant-direct', query: '노아와 아브라함과 시내산과 새 언약을 잇는 언약의 정경 흐름', relevantIds: ['canonical.covenant'], hardNegativeIds: ['canonical.seal'], metadata: { queryType: 'direct' } }),
  freezeCase({ id: 'priest-direct', query: '아론의 제사장직에서 영원한 대제사장으로 이어지는 흐름', relevantIds: ['canonical.priest'], hardNegativeIds: ['canonical.king'], metadata: { queryType: 'direct' } }),
  freezeCase({ id: 'shepherd-direct', query: '목자이신 하나님과 다윗 목자와 선한 목자의 정경 발전', relevantIds: ['canonical.shepherd'], hardNegativeIds: ['canonical.king'], metadata: { queryType: 'direct' } }),
  freezeCase({ id: 'light-direct', query: '창조의 빛에서 세상의 빛과 새 예루살렘의 빛으로 이어지는 흐름', relevantIds: ['canonical.light'], hardNegativeIds: ['canonical.luminary'], metadata: { queryType: 'direct' } }),
  freezeCase({ id: 'bride-direct', query: '언약 백성과 어린양의 신부로 완성되는 혼인 주제', relevantIds: ['canonical.bride'], hardNegativeIds: ['canonical.adoption'], metadata: { queryType: 'direct' } }),
  freezeCase({ id: 'throne-direct', query: '하나님의 보좌와 다윗의 왕좌와 어린양의 보좌', relevantIds: ['canonical.throne'], hardNegativeIds: ['canonical.crown'], metadata: { queryType: 'direct' } }),
  freezeCase({ id: 'witness-direct', query: '두 증인과 순교적 증언과 충성된 증인의 흐름', relevantIds: ['canonical.witness'], hardNegativeIds: ['canonical.seal'], metadata: { queryType: 'direct' } }),
  freezeCase({ id: 'veil-direct', query: '성막의 휘장과 그리스도의 육체를 통한 새롭고 산 길', relevantIds: ['canonical.veil'], hardNegativeIds: ['canonical.temple'], metadata: { queryType: 'direct' } }),

  freezeCase({ id: 'rock-water-semantic', query: '광야에서 맞은 돌에서 물이 솟고 그 반석이 백성을 살리는 구원 표지가 됨', relevantIds: ['canonical.rock'], hardNegativeIds: ['canonical.fountain'], metadata: { queryType: 'semantic' } }),
  freezeCase({ id: 'incense-semantic', query: '향기로운 연기가 성소에서 올라가며 성도의 기도와 함께 하나님 앞에 드려짐', relevantIds: ['canonical.incense'], hardNegativeIds: ['canonical.cloud'], metadata: { queryType: 'semantic' } }),
  freezeCase({ id: 'firstfruits-semantic', query: '처음 익은 열매가 뒤따를 전체 수확과 부활을 보증하는 표지', relevantIds: ['canonical.firstfruits'], hardNegativeIds: ['canonical.harvest'], metadata: { queryType: 'semantic' } }),
  freezeCase({ id: 'wings-semantic', query: '어미 새의 깃 아래 피하듯 하나님의 보호와 임재의 그늘에 숨음', relevantIds: ['canonical.wings'], hardNegativeIds: ['canonical.cloud'], metadata: { queryType: 'semantic' } }),
  freezeCase({ id: 'leaven-semantic', query: '아주 작은 발효 요소가 반죽 전체에 조용히 퍼져 영향을 미침', relevantIds: ['canonical.leaven'], hardNegativeIds: ['canonical.bread'], metadata: { queryType: 'semantic' } }),
  freezeCase({ id: 'root-semantic', query: '베인 그루터기에서 새 싹이 나고 다윗의 뿌리가 열방의 소망이 됨', relevantIds: ['canonical.root'], hardNegativeIds: ['canonical.vine'], metadata: { queryType: 'semantic' } }),
  freezeCase({ id: 'redeemer-semantic', query: '가까운 친족이 잃어버린 기업과 가족의 권리를 값을 치르고 되찾음', relevantIds: ['canonical.redeemer'], hardNegativeIds: ['canonical.covenant'], metadata: { queryType: 'semantic' } }),
  freezeCase({ id: 'lampstand-semantic', query: '기름을 공급받아 성소와 세상 가운데 지속적으로 빛을 비추는 등대', relevantIds: ['canonical.lampstand'], hardNegativeIds: ['canonical.light'], metadata: { queryType: 'semantic' } }),

  freezeCase({ id: 'royal-priest-multihop', query: '영원한 왕이면서 동시에 백성을 위해 중보하는 제사장으로 나타나는 흐름', relevantIds: ['canonical.king', 'canonical.priest'], hardNegativeIds: ['canonical.throne'], metadata: { queryType: 'multi-hop' } }),
  freezeCase({ id: 'lamb-blood-multihop', query: '유월절 어린양의 피가 심판을 넘어가게 하고 새 언약의 속죄로 성취되는 흐름', relevantIds: ['canonical.lamb', 'canonical.blood'], hardNegativeIds: ['canonical.firstborn'], metadata: { queryType: 'multi-hop' } }),
  freezeCase({ id: 'word-light-multihop', query: '태초의 말씀이 생명과 빛으로 어둠 속에 비추는 계시의 흐름', relevantIds: ['canonical.word', 'canonical.light'], hardNegativeIds: ['canonical.luminary'], metadata: { queryType: 'multi-hop' } }),
  freezeCase({ id: 'seed-serpent-multihop', query: '여자의 후손이 뱀의 머리를 상하게 하며 오래된 원수를 이기는 약속', relevantIds: ['canonical.seed', 'canonical.serpent'], hardNegativeIds: ['canonical.thorns'], metadata: { queryType: 'multi-hop' } }),
  freezeCase({ id: 'river-tree-multihop', query: '성전에서 흐르는 생명수가 마지막 도성의 생명나무를 살리는 장면', relevantIds: ['canonical.river', 'canonical.tree_of_life'], hardNegativeIds: ['canonical.fountain'], metadata: { queryType: 'multi-hop' } }),
  freezeCase({ id: 'adoption-firstborn-multihop', query: '맏아들의 권리 안에서 종이 아니라 자녀와 상속자로 받아들여지는 구원', relevantIds: ['canonical.adoption', 'canonical.firstborn'], hardNegativeIds: ['canonical.seed'], metadata: { queryType: 'multi-hop' } }),
  freezeCase({ id: 'temple-veil-multihop', query: '하나님의 처소로 나아가는 길이 찢어진 휘장을 통해 열리는 흐름', relevantIds: ['canonical.temple', 'canonical.veil'], hardNegativeIds: ['canonical.gate'], metadata: { queryType: 'multi-hop' } }),
  freezeCase({ id: 'throne-crown-multihop', query: '승리한 왕이 보좌에 앉고 영광의 관을 받아 통치하는 정경적 장면', relevantIds: ['canonical.throne', 'canonical.crown'], hardNegativeIds: ['canonical.king'], metadata: { queryType: 'multi-hop' } }),
]);
