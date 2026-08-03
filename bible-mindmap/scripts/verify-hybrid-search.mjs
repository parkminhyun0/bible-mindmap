import {
  buildHybridIndex,
  cosineSimilarity,
  createHybridIndex,
  searchHybridIndex,
  tokenizeSearchText,
} from './ai/retrieval/hybrid-search.mjs';

const errors = [];
const assert = (condition, message) => {
  if (!condition) errors.push(message);
};
const expectThrow = (fn, pattern, message) => {
  try {
    fn();
    errors.push(message);
  } catch (error) {
    if (pattern && !pattern.test(String(error?.message))) errors.push(`${message}: unexpected error ${error?.message}`);
  }
};

const documents = [
  {
    id: 'canonical.seed',
    title: '아브라함의 씨',
    text: '언약의 약속과 후손을 따라 그리스도에게 이어지는 정경적 발전',
    sourceRefs: ['Gen 12:1-3', 'Gal 3:16'],
    metadata: { type: 'canonical-concept' },
  },
  {
    id: 'canonical.king',
    title: '메시아 왕권',
    text: '다윗의 보좌와 기름부음 받은 왕의 통치가 그리스도 안에서 성취된다',
    sourceRefs: ['2Sam 7:12-16', 'Luke 1:32-33'],
    metadata: { type: 'canonical-concept' },
  },
  {
    id: 'canonical.temple',
    title: '하나님의 임재',
    text: '성막과 성전에서 새 창조의 임재로 발전하는 주제',
    sourceRefs: ['Exod 40:34-38', 'Rev 21:22-23'],
    metadata: { type: 'canonical-concept' },
  },
];

const index = buildHybridIndex({
  documents,
  embeddingResult: {
    provider: 'fixture',
    model: 'fixture-v1',
    task: 'document',
    dimension: 8,
    vectors: [
      [0.6, 0.4, 0, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0, 0, 0],
    ],
  },
});

const results = searchHybridIndex({
  query: '메시아 왕권',
  index,
  queryEmbedding: {
    provider: 'fixture',
    model: 'fixture-v1',
    task: 'query',
    dimension: 8,
    vectors: [[1, 0, 0, 0, 0, 0, 0, 0]],
  },
  topK: 3,
});

assert(results.length === 3, 'hybrid search must return requested results');
assert(results[0]?.id === 'canonical.king', 'keyword and vector agreement must rank the messianic kingship document first');
assert(results[0]?.sourceRefs?.includes('Luke 1:32-33'), 'search results must preserve source references');
assert(results[0]?.score?.keywordRank === 1, 'keyword component rank must be exposed');
assert(results[0]?.score?.vectorRank === 1, 'vector component rank must be exposed');
assert(results.every((result, indexPosition) => result.rank === indexPosition + 1), 'final ranks must be stable and sequential');
assert(tokenizeSearchText('메시아 왕권').includes('메시'), 'Korean tokenization must include bigrams');
assert(Math.abs(cosineSimilarity([1, 0], [1, 0]) - 1) < 1e-12, 'cosine identity must equal 1');

expectThrow(
  () => searchHybridIndex({
    query: '메시아',
    index,
    queryEmbedding: {
      provider: 'fixture',
      model: 'fixture-v1',
      task: 'query',
      dimension: 9,
      vectors: [[1, 0, 0, 0, 0, 0, 0, 0, 0]],
    },
  }),
  /match the index/,
  'dimension mismatch must fail',
);
expectThrow(
  () => buildHybridIndex({
    documents: [documents[0], { ...documents[0] }],
    embeddingResult: {
      provider: 'fixture', model: 'fixture-v1', task: 'document', dimension: 8,
      vectors: [[1, 0, 0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0, 0]],
    },
  }),
  /duplicate document id/,
  'duplicate document ids must fail',
);

let batchCalls = 0;
const batchDocuments = Array.from({ length: 129 }, (_, indexPosition) => ({
  id: `batch-${indexPosition}`,
  text: `문서 ${indexPosition}`,
  sourceRefs: [`Fixture ${indexPosition}`],
}));
const batchedIndex = await createHybridIndex({
  documents: batchDocuments,
  embed: async ({ texts, task }) => {
    batchCalls += 1;
    return {
      provider: 'fixture',
      model: 'fixture-v1',
      task,
      dimension: 8,
      vectors: texts.map(() => [1, 0, 0, 0, 0, 0, 0, 0]),
    };
  },
});
assert(batchCalls === 2, '129 documents must be embedded in two bounded batches');
assert(batchedIndex.count === 129, 'batched index must preserve all documents');

if (errors.length) {
  console.error(`✗ hybrid search verifier failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`✓ hybrid search pipeline verified · documents ${documents.length} · results ${results.length} · batch calls ${batchCalls}`);
