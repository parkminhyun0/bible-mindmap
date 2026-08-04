import { CANONICAL_CONCEPTS } from '../data/canonicalConcepts.js';
import { searchCanonicalConceptsStatic } from './canonicalConceptStaticSearch.js';

const CURATED_SUGGESTIONS = Object.freeze([
  { triggers: ['성전', '성막', '임재'], label: '하나님의 임재', searchText: '성전 하나님의 임재 백성 가운데 거하심' },
  { triggers: ['성전', '성막'], label: '성막에서 성전으로', searchText: '성막에서 성전으로 하나님의 거처' },
  { triggers: ['성전', '그리스도'], label: '그리스도와 성전', searchText: '그리스도의 몸 참 성전' },
  { triggers: ['성전', '교회'], label: '교회와 성령의 전', searchText: '교회 성령이 거하시는 성전' },
  { triggers: ['성전', '새 예루살렘'], label: '새 예루살렘', searchText: '새 예루살렘 하나님과 어린양의 임재' },
  { triggers: ['언약'], label: '아브라함 언약', searchText: '아브라함 언약 씨 땅 복의 약속' },
  { triggers: ['언약'], label: '시내 언약', searchText: '시내 언약 율법 백성 제사장 나라' },
  { triggers: ['언약', '왕'], label: '다윗 언약', searchText: '다윗 언약 영원한 왕위 메시아' },
  { triggers: ['언약', '새 언약'], label: '새 언약', searchText: '새 언약 마음에 기록된 율법 죄 사함' },
  { triggers: ['씨', '후손'], label: '여자의 후손', searchText: '여자의 후손 뱀의 머리를 상하게 함' },
  { triggers: ['씨', '아브라함'], label: '아브라함의 씨', searchText: '아브라함의 씨 모든 민족의 복' },
  { triggers: ['씨', '다윗'], label: '다윗의 자손', searchText: '다윗의 자손 메시아 왕' },
  { triggers: ['피', '희생', '속죄'], label: '죄를 씻는 희생', searchText: '피 희생 속죄 죄를 씻음' },
  { triggers: ['안식', '쉼'], label: '창조의 안식', searchText: '창조 후 하나님의 안식 쉼' },
  { triggers: ['안식', '쉼'], label: '그리스도 안의 안식', searchText: '그리스도 안에서 누리는 참 안식' },
  { triggers: ['영광'], label: '하나님의 영광과 임재', searchText: '하나님의 영광 임재 성막 성전' },
]);

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueBySearchText(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalize(item.searchText);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getCanonicalConceptSuggestions(query, { limit = 6 } = {}) {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) return [];

  const curated = CURATED_SUGGESTIONS.filter((suggestion) =>
    suggestion.triggers.some((trigger) => {
      const normalizedTrigger = normalize(trigger);
      return normalizedTrigger.includes(normalizedQuery)
        || normalizedQuery.includes(normalizedTrigger)
        || normalize(suggestion.label).includes(normalizedQuery);
    }),
  ).map((suggestion) => ({ ...suggestion, source: 'curated' }));

  const derived = searchCanonicalConceptsStatic(normalizedQuery, { limit: 4 })
    .flatMap((id) => {
      const concept = CANONICAL_CONCEPTS[id];
      if (!concept) return [];
      const conceptSuggestion = {
        label: concept.labelKo,
        searchText: `${normalizedQuery} ${concept.labelKo}`,
        source: 'concept',
      };
      const stageSuggestion = concept.canonicalArc?.[0]?.stage
        ? {
            label: `${concept.labelKo} · ${concept.canonicalArc[0].stage}`,
            searchText: `${concept.labelKo} ${concept.canonicalArc[0].stage} ${concept.canonicalArc[0].summary || ''}`,
            source: 'stage',
          }
        : null;
      return stageSuggestion ? [conceptSuggestion, stageSuggestion] : [conceptSuggestion];
    });

  return uniqueBySearchText([...curated, ...derived]).slice(0, limit);
}
