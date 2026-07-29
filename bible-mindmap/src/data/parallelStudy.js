import { CITATIONS } from './citations.js';
import { ALL_BOOKS } from './bibleBooks.js';
import { fetchCrossRefs } from '../api/crossrefApi.js';

const KO_NAME = Object.fromEntries(ALL_BOOKS.map((book) => [book.id, book.ko]));

function ref(book, chapter, verseStart, verseEnd = verseStart) {
  return { book, chapter, verseStart, verseEnd };
}

function overlaps(a, b) {
  return Boolean(
    a && b
    && a.book === b.book
    && a.chapter === b.chapter
    && a.verseStart <= b.verseEnd
    && b.verseStart <= a.verseEnd,
  );
}

function refKey(value) {
  return `${value.book}:${value.chapter}:${value.verseStart}-${value.verseEnd}`;
}

function formatParallelReference(value) {
  const bookName = KO_NAME[value.book] || value.book;
  const verses = value.verseStart === value.verseEnd
    ? `${value.verseStart}`
    : `${value.verseStart}-${value.verseEnd}`;
  return `${bookName} ${value.chapter}:${verses}`;
}

export const PARALLEL_KIND = {
  synoptic: { label: '공관 평행', tone: 'gospel' },
  quotation: { label: '직접 인용', tone: 'quotation' },
  allusion: { label: '암시·인유', tone: 'allusion' },
  echo: { label: '반향', tone: 'echo' },
  crossref: { label: '관주 연관', tone: 'crossref' },
};

// v1 curated Synoptic pericope registry (Matthew/Mark/Luke only).
// Passage alignment is not itself a claim about literary dependence.
// Editorial/theological observations are curated and never produced by
// the deterministic word-diff engine.
export const SYNOPTIC_PARALLELS = [
  {
    id: 'john-baptist-ministry',
    title: '세례 요한의 사역',
    passages: [
      ref('Matt', 3, 1, 12),
      ref('Mark', 1, 1, 8),
      ref('Luke', 3, 1, 18),
    ],
    emphasis: {
      Matt: '회개와 임박한 하나님 나라, 바리새인·사두개인 논쟁을 상세하게 제시한다.',
      Mark: '복음의 시작과 광야의 사자를 압축해 예수의 등장으로 빠르게 연결한다.',
      Luke: '역사적 통치자 표지와 여러 청중의 질문을 포함해 회개의 사회적 열매를 확장한다.',
    },
  },
  {
    id: 'baptism-of-jesus',
    title: '예수의 세례',
    passages: [
      ref('Matt', 3, 13, 17),
      ref('Mark', 1, 9, 11),
      ref('Luke', 3, 21, 22),
    ],
    emphasis: {
      Matt: '요한과의 대화와 “모든 의를 이루는 것”을 추가해 사건의 적합성을 설명한다.',
      Mark: '세례와 하늘의 선언을 가장 압축적으로 연결한다.',
      Luke: '백성이 세례받는 문맥과 예수의 기도를 함께 제시한다.',
    },
  },
  {
    id: 'temptation',
    title: '광야 시험',
    passages: [
      ref('Matt', 4, 1, 11),
      ref('Mark', 1, 12, 13),
      ref('Luke', 4, 1, 13),
    ],
    emphasis: {
      Matt: '세 시험의 대화를 상세히 기록하고 마지막 장면을 높은 산에 둔다.',
      Mark: '성령의 이끄심, 사탄, 들짐승, 천사를 매우 짧게 압축한다.',
      Luke: '세 시험의 마지막을 예루살렘 성전으로 배치해 이후 예루살렘 지향 서사와 연결한다.',
    },
  },
  {
    id: 'healing-leper',
    title: '나병환자 치유',
    passages: [
      ref('Matt', 8, 1, 4),
      ref('Mark', 1, 40, 45),
      ref('Luke', 5, 12, 16),
    ],
  },
  {
    id: 'healing-paralytic',
    title: '중풍병자 치유와 죄 사함',
    passages: [
      ref('Matt', 9, 1, 8),
      ref('Mark', 2, 1, 12),
      ref('Luke', 5, 17, 26),
    ],
  },
  {
    id: 'parable-sower',
    title: '씨 뿌리는 자의 비유',
    passages: [
      ref('Matt', 13, 1, 23),
      ref('Mark', 4, 1, 20),
      ref('Luke', 8, 4, 15),
    ],
  },
  {
    id: 'feeding-five-thousand',
    title: '오천 명을 먹이심',
    passages: [
      ref('Matt', 14, 13, 21),
      ref('Mark', 6, 30, 44),
      ref('Luke', 9, 10, 17),
    ],
    emphasis: {
      Matt: '광야로 물러남과 무리를 불쌍히 여기심 속에서 제자들이 먹이는 일에 참여한다.',
      Mark: '목자 없는 양 같은 무리와 푸른 잔디의 무리 조직을 자세히 묘사한다.',
      Luke: '하나님 나라를 말하고 병자를 고치신 뒤 식사 사건으로 이어 간다.',
    },
  },
  {
    id: 'transfiguration',
    title: '변화산 사건',
    passages: [
      ref('Matt', 17, 1, 9),
      ref('Mark', 9, 2, 10),
      ref('Luke', 9, 28, 36),
    ],
  },
  {
    id: 'triumphal-entry',
    title: '예루살렘 입성',
    passages: [
      ref('Matt', 21, 1, 11),
      ref('Mark', 11, 1, 11),
      ref('Luke', 19, 28, 40),
    ],
  },
  {
    id: 'last-supper',
    title: '마지막 만찬',
    passages: [
      ref('Matt', 26, 17, 30),
      ref('Mark', 14, 12, 26),
      ref('Luke', 22, 7, 23),
    ],
  },
  {
    id: 'gethsemane',
    title: '겟세마네 기도',
    passages: [
      ref('Matt', 26, 36, 46),
      ref('Mark', 14, 32, 42),
      ref('Luke', 22, 39, 46),
    ],
  },
];

export function findSynopticSet(anchor) {
  if (!anchor) return null;
  return SYNOPTIC_PARALLELS.find((set) => set.passages.some((passage) => overlaps(passage, anchor))) || null;
}

export function findCanonicalParallels(anchor) {
  if (!anchor) return [];
  const results = [];

  for (const citation of CITATIONS) {
    if (overlaps(citation.citing, anchor)) {
      for (const source of citation.sources) {
        results.push({
          ref: source,
          kind: source.kind || 'quotation',
          note: citation.note,
          citationId: citation.id,
          direction: 'nt-to-ot',
        });
      }
    }

    for (const source of citation.sources) {
      if (!overlaps(source, anchor)) continue;
      results.push({
        ref: citation.citing,
        kind: source.kind || 'quotation',
        note: citation.note,
        citationId: citation.id,
        direction: 'ot-to-nt',
      });
    }
  }

  return results;
}

export async function buildParallelSuggestions(anchor, limit = 12) {
  if (!anchor) return { set: null, suggestions: [] };

  const seen = new Set([refKey(anchor)]);
  const suggestions = [];
  const set = findSynopticSet(anchor);

  const add = (item) => {
    const key = refKey(item.ref);
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push({
      ...item,
      key,
      reference: formatParallelReference(item.ref),
    });
  };

  if (set) {
    for (const passage of set.passages) {
      add({
        ref: passage,
        kind: 'synoptic',
        note: set.title,
        emphasis: set.emphasis?.[passage.book] || null,
        setId: set.id,
      });
    }
  }

  for (const item of findCanonicalParallels(anchor)) add(item);

  try {
    const crossrefs = await fetchCrossRefs(
      anchor.book,
      anchor.chapter,
      anchor.verseStart,
      Math.max(limit, 12),
    );
    for (const item of crossrefs) {
      add({
        ref: ref(item.bookId, item.chapter, item.verseStart, item.verseEnd),
        kind: 'crossref',
        note: `OpenBible 관주 · votes ${item.votes}`,
        votes: item.votes,
      });
    }
  } catch {
    // Curated synoptic/canonical suggestions remain usable offline even when
    // the cross-reference artifact is unavailable.
  }

  return { set, suggestions: suggestions.slice(0, limit) };
}

export function getParallelEmphasis(set, passageRef) {
  if (!set || !passageRef) return null;
  return set.emphasis?.[passageRef.book] || null;
}

export function parallelRefKey(value) {
  return refKey(value);
}
