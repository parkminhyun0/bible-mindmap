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
// Editorial/theological observations are curated reading aids, not automatic
// conclusions, and should be checked against the text, syntax and apparatus.
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
      Matt: '회개와 임박한 하나님 나라를 전면에 두고, 바리새인·사두개인에게 회개에 합당한 열매를 요구한다.',
      Mark: '“복음의 시작”이라는 표제 아래 광야의 사자를 압축해 제시하고 곧바로 예수의 등장으로 진행한다.',
      Luke: '통치자·제사장 연대 표지를 제시하고 여러 청중의 질문과 구체적 실천을 덧붙여 회개의 사회적 열매를 확장한다.',
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
      Matt: '요한과의 대화와 “모든 의를 이루는 것”을 추가해 예수께서 세례를 받으시는 사건의 적합성을 설명한다.',
      Mark: '세례·하늘이 갈라짐·성령·하늘의 선언을 압축적으로 연결해 예수의 공적 사역 시작을 빠르게 제시한다.',
      Luke: '백성이 세례받는 문맥과 예수의 기도를 함께 기록해 성령과 기도라는 누가의 반복 주제를 부각한다.',
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
      Matt: '신명기 인용을 사용한 세 시험의 대화를 상세히 기록하고 마지막 장면을 높은 산에 두어 경배와 왕권의 문제를 정점으로 삼는다.',
      Mark: '성령의 이끄심, 사탄의 시험, 들짐승, 천사의 수종을 두 절에 압축해 광야의 충돌과 승리를 간결하게 제시한다.',
      Luke: '시험의 마지막을 예루살렘 성전에 배치하고 “기회가 있을 때까지” 떠나는 사탄을 언급해 이후 예루살렘 지향 서사와 연결한다.',
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
    emphasis: {
      Matt: '산에서 내려오신 예수의 권위 있는 치유를 간결하게 제시하고 모세가 명한 예물을 드려 증거하라는 명령에 초점을 둔다.',
      Mark: '치유 뒤 엄한 경고와 침묵 명령, 그러나 치유받은 사람이 널리 전함으로 예수의 공개적 이동이 제한되는 결과까지 자세히 보여 준다.',
      Luke: '환자를 “나병이 가득한 사람”으로 묘사하고 치유 소문 뒤 예수께서 한적한 곳에서 기도하셨다는 장면을 덧붙인다.',
    },
  },
  {
    id: 'healing-paralytic',
    title: '중풍병자 치유와 죄 사함',
    passages: [
      ref('Matt', 9, 1, 8),
      ref('Mark', 2, 1, 12),
      ref('Luke', 5, 17, 26),
    ],
    emphasis: {
      Matt: '사건을 압축하면서 죄를 사하는 인자의 권위와, 마지막에 그러한 권위를 주신 하나님을 찬양하는 무리의 반응을 강조한다.',
      Mark: '지붕을 뜯어 병자를 내리는 네 사람과 가득 찬 집을 자세히 묘사해 믿음의 행동과 논쟁 장면을 생생하게 구성한다.',
      Luke: '각 지역에서 온 바리새인과 율법교사를 배경에 배치하고 주의 능력, 놀람과 하나님께 영광 돌림을 강조한다.',
    },
  },
  {
    id: 'parable-sower',
    title: '씨 뿌리는 자의 비유',
    passages: [
      ref('Matt', 13, 1, 23),
      ref('Mark', 4, 1, 20),
      ref('Luke', 8, 4, 15),
    ],
    emphasis: {
      Matt: '비유를 천국의 비밀과 연결하고 이사야 6장의 인용을 길게 제시해 듣고 깨닫는 문제를 전면에 둔다.',
      Mark: '하나님 나라의 비밀과 “들을 귀 있는 자”의 요청을 중심에 두며 비유 이해가 제자도와 연결됨을 강조한다.',
      Luke: '씨를 “하나님의 말씀”이라고 명시하고 좋은 땅을 정직하고 선한 마음으로 말씀을 지켜 인내로 결실하는 사람으로 설명한다.',
    },
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
      Matt: '광야로 물러난 예수께서 무리를 불쌍히 여기시고 고치신 뒤 제자들에게 “너희가 먹을 것을 주라”고 하여 참여를 요청한다.',
      Mark: '무리를 “목자 없는 양”처럼 보시고 가르치신다는 설명과 푸른 잔디 위에 무리를 조직하는 세부를 통해 목자 이미지를 부각한다.',
      Luke: '하나님 나라를 말하고 병 고침을 베푸신 뒤 식사 사건을 배치해 선포·치유·공급을 하나의 사역 흐름으로 연결한다.',
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
    emphasis: {
      Matt: '예수의 얼굴이 해처럼 빛났다고 묘사하고 제자들이 두려워 엎드렸을 때 예수께서 만지며 “두려워하지 말라”고 하시는 장면을 담는다.',
      Mark: '눈부시게 희어진 옷과 베드로가 무슨 말을 해야 할지 몰랐다는 반응을 강조하고, 내려오며 부활 때까지 침묵하라는 명령을 제시한다.',
      Luke: '예수께서 기도하시는 중 모습이 변했다고 기록하고 모세와 엘리야가 예루살렘에서 이루실 “떠나가심”을 말한 내용을 독특하게 보존한다.',
    },
  },
  {
    id: 'triumphal-entry',
    title: '예루살렘 입성',
    passages: [
      ref('Matt', 21, 1, 11),
      ref('Mark', 11, 1, 11),
      ref('Luke', 19, 28, 40),
    ],
    emphasis: {
      Matt: '스가랴의 예언 성취를 명시하고 성 전체가 소동하며 “이이가 누구냐” 묻는 반응과 예수를 선지자로 부르는 무리의 고백을 기록한다.',
      Mark: '입성 뒤 예수께서 성전에 들어가 모든 것을 둘러보시고 베다니로 나가시는 장면으로 다음 성전 행동을 준비한다.',
      Luke: '제자 무리가 왕을 찬송하는 장면과 바리새인의 제지 요구, “돌들이 소리 지르리라”는 응답을 통해 공개적 왕권 선언의 긴장을 강조한다.',
    },
  },
  {
    id: 'last-supper',
    title: '마지막 만찬',
    passages: [
      ref('Matt', 26, 17, 30),
      ref('Mark', 14, 12, 26),
      ref('Luke', 22, 7, 23),
    ],
    emphasis: {
      Matt: '잔을 “죄 사함을 얻게 하려고 많은 사람을 위하여 흘리는 언약의 피”로 설명해 언약과 죄 사함의 의미를 명시한다.',
      Mark: '떡과 잔의 말씀을 간결하게 전하고 하나님 나라에서 새것으로 마실 날을 바라보는 종말론적 전망을 덧붙인다.',
      Luke: '유월절을 제자들과 먹기를 간절히 원하셨다는 말씀과 하나님 나라의 성취 전망, 떡과 잔을 통한 새 언약의 의미를 함께 제시한다.',
    },
  },
  {
    id: 'gethsemane',
    title: '겟세마네 기도',
    passages: [
      ref('Matt', 26, 36, 46),
      ref('Mark', 14, 32, 42),
      ref('Luke', 22, 39, 46),
    ],
    emphasis: {
      Matt: '예수의 깊은 슬픔과 세 차례의 기도, 반복해서 잠든 제자들을 대비시키며 “내 원대로 마시옵고 아버지의 원대로”라는 순종을 강조한다.',
      Mark: '“아바 아버지”라는 호칭과 예수의 심한 놀람·슬픔을 보존하며, 시험에 들지 않도록 깨어 기도하라는 요청을 반복한다.',
      Luke: '감람산에서의 기도와 제자들에게 시험에 들지 않도록 기도하라는 권면을 앞뒤에 배치한다. 22:43–44의 천사와 땀 장면은 중요한 본문비평 이문이므로 비평장치와 함께 확인해야 한다.',
    },
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
