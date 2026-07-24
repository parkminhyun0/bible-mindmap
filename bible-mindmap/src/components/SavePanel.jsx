import { useState, useEffect, useRef, useMemo } from 'react';
import {
  DOC_ROOT_ID, ensureDocRoot,
  loadTree as loadTreeCore, saveTree, findNode, findParent, generateFileId as generateId,
} from '../utils/storageTree';
import { collectDocTags } from '../utils/sermonTags';

const APP_NS       = 'parkminhyun0-bible-mindmap';
const COUNTED_KEY  = 'bmm-counted-v1';   // 영구: 이 디바이스에서 카운터 증가 완료 여부
const TODAY_LS     = 'bmm-today-v2';     // 일별: 오늘 방문 여부
const TOTAL_CACHE  = 'bmm-total-v2';     // 총 카운트 표시용 캐시

function useAppVisitorCount() {
  const [todayCount, setTodayCount] = useState(1);
  const [totalCount, setTotalCount] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    // 오늘 방문: 하루 1회 플래그 (새로고침 무관)
    let todayData = null;
    try { todayData = JSON.parse(localStorage.getItem(TODAY_LS)); } catch (e) {}
    if (!todayData || todayData.date !== today) {
      try { localStorage.setItem(TODAY_LS, JSON.stringify({ date: today })); } catch (e) {}
    }
    setTodayCount(1);

    // 전체 누적: 캐시 즉시 표시
    let cache = null;
    try { cache = JSON.parse(localStorage.getItem(TOTAL_CACHE)); } catch (e) {}
    if (cache && cache.count != null) setTotalCount(cache.count);

    // 이미 카운트된 디바이스 → API 호출 없음
    if (localStorage.getItem(COUNTED_KEY) === '1') return;

    // 첫 방문: /up 호출 후 플래그 저장
    fetch(`https://api.counterapi.dev/v1/${APP_NS}/visits/up`)
      .then((r) => r.json())
      .then((d) => {
        const n = d.count ?? d.value;
        if (n != null) {
          setTotalCount(n);
          try {
            localStorage.setItem(TOTAL_CACHE, JSON.stringify({ count: n }));
            localStorage.setItem(COUNTED_KEY, '1');
          } catch (e) {}
        }
      })
      .catch(() => { if (!cache) setTotalCount('?'); });
  }, []);

  return { todayCount, totalCount };
}


const OBSIDIAN_DIR_KEY = 'bible-mindmap-obsidian-dir';
const SEED_KEY = 'bible-mindmap-seeded';

const SEED_FILES = [
  {
    id: 'seed-mark1-4to8',
    name: '마가복음 1:4-8 — 세례 요한과 메시아 예비',
    type: 'file',
    savedAt: new Date().toISOString(),
    data: {
      nodes: [
        // ── 중심 주제 ──
        { id: 'topic-center', type: 'topic', position: { x: 480, y: 20 }, data: { title: '막 1:4-8 — 세례 요한과 메시아 예비', keywords: ['세례요한', '회개', '메시아', '성령세례', '엘리야'] } },

        // ── 본문 구절 ──
        { id: 'v-mk1-4', type: 'verse', position: { x: 40, y: 160 }, data: { reference: '마가복음 1:4', text: '세례 요한이 광야에 이르러 죄 사함을 받게 하는 회개의 세례를 전파하니', color: '#3b82f6' } },
        { id: 'v-mk1-5', type: 'verse', position: { x: 40, y: 340 }, data: { reference: '마가복음 1:5', text: '온 유대 지방과 예루살렘 사람이 다 나아가 자기 죄를 자복하고 요단 강에서 그에게 세례를 받더라', color: '#3b82f6' } },
        { id: 'v-mk1-6', type: 'verse', position: { x: 40, y: 520 }, data: { reference: '마가복음 1:6', text: '요한이 낙타 털옷을 입고 허리에 가죽 띠를 띠고 메뚜기와 석청을 먹더라', color: '#3b82f6' } },
        { id: 'v-mk1-7', type: 'verse', position: { x: 480, y: 340 }, data: { reference: '마가복음 1:7', text: '그가 전파하여 이르되 나보다 능력이 많으신 이가 내 뒤에 오시나니 나는 굽혀 그의 신발끈을 풀기도 감당하지 못하겠노라', color: '#ef4444' } },
        { id: 'v-mk1-8', type: 'verse', position: { x: 480, y: 520 }, data: { reference: '마가복음 1:8', text: '나는 너희에게 물로 세례를 베풀었거니와 그는 성령으로 너희에게 세례를 베푸시리라', color: '#ef4444' } },

        // ── 구약 배경 ──
        { id: 'v-2ki-1-8', type: 'verse', position: { x: 40, y: 720 }, data: { reference: '열왕기하 1:8', text: '그는 털옷을 입고 허리에 가죽 띠를 띤 자니이다. 왕이 이르되 그는 디셉 사람 엘리야이니라', color: '#f59e0b' } },
        { id: 'v-mal-4-5', type: 'verse', position: { x: 320, y: 720 }, data: { reference: '말라기 4:5', text: '보라 여호와의 크고 두려운 날이 이르기 전에 내가 선지자 엘리야를 너희에게 보내리니', color: '#f59e0b' } },
        { id: 'v-isa-44-3', type: 'verse', position: { x: 700, y: 720 }, data: { reference: '이사야 44:3', text: '내가 목마른 자에게 물을 주며 마른 땅에 시내를 흐르게 하며 나의 영을 네 자손에게, 나의 복을 네 후손에게 내리리니', color: '#f59e0b' } },
        { id: 'v-joel-2-28', type: 'verse', position: { x: 700, y: 900 }, data: { reference: '요엘 2:28', text: '그 후에 내가 내 영을 만민에게 부어 주리니 너희 자녀들이 장래 일을 말할 것이며', color: '#f59e0b' } },

        // ── 평행 본문 ──
        { id: 'v-mt3-11', type: 'verse', position: { x: 820, y: 340 }, data: { reference: '마태복음 3:11-12', text: '나는 너희를 회개하게 하기 위하여 물로 세례를 베풀거니와 내 뒤에 오시는 이는... 성령과 불로 세례를 베푸실 것이요. 손에 키를 들고 타작 마당을 정하게 하사', color: '#10b981' } },
        { id: 'v-lk3-16', type: 'verse', position: { x: 820, y: 520 }, data: { reference: '누가복음 3:16', text: '요한이 모든 사람에게 대답하여 이르되 나는 물로 너희에게 세례를 베풀거니와 나보다 능력이 많으신 이가 오시나니... 그는 성령과 불로 너희에게 세례를 베푸실 것이요', color: '#10b981' } },
        { id: 'v-jn1-26', type: 'verse', position: { x: 820, y: 160 }, data: { reference: '요한복음 1:26-27', text: '요한이 대답하되 나는 물로 세례를 베풀거니와 너희 가운데 너희가 알지 못하는 한 사람이 섰으니 곧 내 뒤에 오시는 그이라 나는 그의 신발끈을 풀기도 감당하지 못하겠노라', color: '#10b981' } },

        // ── 주제 노드 ──
        { id: 'topic-repent', type: 'topic', position: { x: 200, y: 160 }, data: { title: '회개와 세례', keywords: ['회개', '세례', '죄사함', '요단강'] } },
        { id: 'topic-elijah', type: 'topic', position: { x: 180, y: 720 }, data: { title: '엘리야 모티프', keywords: ['엘리야', '털옷', '가죽띠', '선구자'] } },
        { id: 'topic-spirit', type: 'topic', position: { x: 600, y: 620 }, data: { title: '물세례 → 성령세례', keywords: ['물', '성령', '세례', '대조', '성취'] } },

        // ── 노트 ──
        { id: 'note-elijah', type: 'note', position: { x: 40, y: 900 }, data: { title: '엘리야 재림 모티프', text: '요한의 외양(낙타 털옷, 가죽띠)은 왕하 1:8의 엘리야 묘사와 정확히 일치한다. 말라기 4:5의 "엘리야를 보내리니" 예언의 성취. 예수님도 막 9:13에서 "엘리야가 왔으되"라고 확인하신다.' } },
        { id: 'note-contrast', type: 'note', position: { x: 480, y: 160 }, data: { title: '요한의 겸손 — 극단적 대조', text: '신발끈을 푸는 것은 이방 노예의 일. 요한은 자신을 노예보다도 낮추어 메시아의 위대함을 증언한다. 물(인간의 행위) vs 성령(하나님의 능력)의 대비는 구약→신약 전환의 핵심이다.' } },
        { id: 'note-wilderness', type: 'note', position: { x: 260, y: 480 }, data: { title: '광야의 신학적 의미', text: '광야(에레모스)는 이스라엘의 출애굽·방황·정화의 장소. 요한이 광야에서 사역을 시작한 것은 새로운 출애굽, 새 시대의 시작을 상징한다. 이사야 40:3의 "광야에서 외치는 자의 소리"와 직결.' } },
      ],
      edges: [
        // 본문 → 중심 주제
        { id: 'e-4-center', source: 'v-mk1-4', target: 'topic-center', type: 'topic' },
        { id: 'e-7-center', source: 'v-mk1-7', target: 'topic-center', type: 'topic' },
        { id: 'e-8-center', source: 'v-mk1-8', target: 'topic-center', type: 'topic' },

        // 회개와 세례 주제
        { id: 'e-4-repent', source: 'v-mk1-4', target: 'topic-repent', type: 'topic' },
        { id: 'e-5-repent', source: 'v-mk1-5', target: 'topic-repent', type: 'topic' },

        // 엘리야 모티프
        { id: 'e-6-elijah', source: 'v-mk1-6', target: 'topic-elijah', type: 'topic' },
        { id: 'e-6-2ki', source: 'v-mk1-6', target: 'v-2ki-1-8', type: 'echo', label: '반향', data: { note: '복장 묘사가 거의 동일 — 의도적 엘리야 암시' } },
        { id: 'e-elijah-mal', source: 'topic-elijah', target: 'v-mal-4-5', type: 'citation', label: '인용', data: { note: '말라기의 엘리야 재림 예언' } },
        { id: 'e-note-elijah-topic', source: 'note-elijah', target: 'topic-elijah', type: 'relation', label: '관계' },
        { id: 'e-note-elijah-2ki', source: 'note-elijah', target: 'v-2ki-1-8', type: 'relation', label: '관계' },

        // 물세례 vs 성령세례
        { id: 'e-8-spirit', source: 'v-mk1-8', target: 'topic-spirit', type: 'topic' },
        { id: 'e-spirit-isa', source: 'topic-spirit', target: 'v-isa-44-3', type: 'echo', label: '반향', data: { note: '영을 부어주심의 구약 배경' } },
        { id: 'e-spirit-joel', source: 'topic-spirit', target: 'v-joel-2-28', type: 'echo', label: '반향', data: { note: '오순절 성취 — 행 2:16-17' } },
        { id: 'e-isa-joel', source: 'v-isa-44-3', target: 'v-joel-2-28', type: 'relation', label: '관계' },

        // 평행 본문 연결
        { id: 'e-7-jn', source: 'v-mk1-7', target: 'v-jn1-26', type: 'parallel', label: '평행' },
        { id: 'e-8-mt', source: 'v-mk1-8', target: 'v-mt3-11', type: 'parallel', label: '평행', data: { note: '마태는 "성령과 불로" — 심판 강조' } },
        { id: 'e-8-lk', source: 'v-mk1-8', target: 'v-lk3-16', type: 'parallel', label: '평행' },

        // 겸손 노트 연결
        { id: 'e-7-contrast', source: 'v-mk1-7', target: 'note-contrast', type: 'relation', label: '관계' },
        { id: 'e-8-contrast', source: 'v-mk1-8', target: 'note-contrast', type: 'relation', label: '관계' },

        // 광야 노트 연결
        { id: 'e-4-wilderness', source: 'v-mk1-4', target: 'note-wilderness', type: 'relation', label: '관계' },
        { id: 'e-5-wilderness', source: 'v-mk1-5', target: 'note-wilderness', type: 'relation', label: '관계' },

        // 4절→5절 흐름, 7절→8절 흐름
        { id: 'e-flow-4-5', source: 'v-mk1-4', target: 'v-mk1-5', type: 'relation', label: '관계', data: { note: '전파의 결과 — 사람들이 나아옴' } },
        { id: 'e-flow-7-8', source: 'v-mk1-7', target: 'v-mk1-8', type: 'relation', label: '관계', data: { note: '인물 대조 → 사역 대조로 전환' } },
      ],
    },
  },
  {
    id: 'seed-ruth2-1to7',
    name: '룻기 2:1-7 — 보아스의 밭에서 이삭을 줍다',
    type: 'file',
    savedAt: new Date().toISOString(),
    data: {
      nodes: [
        // ── 중심 주제 ──
        { id: 'rt-topic-center', type: 'topic', position: { x: 440, y: 20 }, data: { title: '룻 2:1-7 — 섭리 안에서의 만남', keywords: ['섭리', '이삭줍기', '보아스', '룻', '기업무를자'] } },

        // ── 본문 구절 ──
        { id: 'rt-v1', type: 'verse', position: { x: 40, y: 160 }, data: { reference: '룻기 2:1', text: '나오미의 남편 엘리멜렉의 친족으로 유력한 자가 있으니 그의 이름은 보아스더라', color: '#3b82f6' } },
        { id: 'rt-v2', type: 'verse', position: { x: 40, y: 340 }, data: { reference: '룻기 2:2', text: '모압 여인 룻이 나오미에게 이르되 원하건대 내가 밭으로 가서 내가 누구에게든지 은혜를 입으면 그를 따라서 이삭을 줍겠나이다', color: '#3b82f6' } },
        { id: 'rt-v3', type: 'verse', position: { x: 40, y: 520 }, data: { reference: '룻기 2:3', text: '룻이 가서 베는 자를 따라 밭에서 이삭을 줍는데 우연히 엘리멜렉의 친족 보아스에게 속한 밭에 이르렀더라', color: '#ef4444' } },
        { id: 'rt-v4', type: 'verse', position: { x: 440, y: 340 }, data: { reference: '룻기 2:4', text: '마침 보아스가 베들레헴에서부터 와서 베는 자들에게 이르되 여호와께서 너희와 함께 하시기를 원하노라. 그들이 대답하되 여호와께서 당신에게 복 주시기를 원하나이다', color: '#3b82f6' } },
        { id: 'rt-v5', type: 'verse', position: { x: 440, y: 520 }, data: { reference: '룻기 2:5', text: '보아스가 베는 자들을 거느린 사환에게 이르되 이는 누구의 소녀냐', color: '#3b82f6' } },
        { id: 'rt-v6', type: 'verse', position: { x: 440, y: 680 }, data: { reference: '룻기 2:6', text: '베는 자를 거느린 사환이 대답하여 이르되 이는 나오미와 함께 모압 지방에서 돌아온 모압 소녀인데', color: '#3b82f6' } },
        { id: 'rt-v7', type: 'verse', position: { x: 40, y: 680 }, data: { reference: '룻기 2:7', text: '그가 말하기를 베는 자를 따라서 단 사이에서 이삭을 줍게 하소서 하고 아침부터 지금까지 쉬지 않고 잠깐 집에서 쉬었을 뿐이니이다', color: '#3b82f6' } },

        // ── 구약 배경 (이삭줍기 율법) ──
        { id: 'rt-v-lev19', type: 'verse', position: { x: 40, y: 880 }, data: { reference: '레위기 19:9-10', text: '너희가 너희의 땅에서 곡식을 거둘 때에 밭 모퉁이까지 다 거두지 말고 거둔 후에 이삭을 줍지 말며... 가난한 사람과 거류민을 위하여 버려두라', color: '#f59e0b' } },
        { id: 'rt-v-deut24', type: 'verse', position: { x: 320, y: 880 }, data: { reference: '신명기 24:19-21', text: '밭에서 곡식을 벨 때에 그 한 뭇을 밭에 잊었거든 다시 가서 가져오지 말고 나그네와 고아와 과부를 위하여 남겨두라... 네 하나님 여호와께서 네 손으로 하는 모든 일에 복을 내리시리라', color: '#f59e0b' } },
        { id: 'rt-v-deut25', type: 'verse', position: { x: 640, y: 880 }, data: { reference: '신명기 25:5-6', text: '형제가 함께 사는데 그 중 하나가 아들 없이 죽거든 그 죽은 자의 아내는... 그 남편의 형제가 그에게로 들어가서 그를 아내로 삼아 그 형제의 의무를 이행할 것이요', color: '#f59e0b' } },

        // ── 신약 연결 ──
        { id: 'rt-v-mt1', type: 'verse', position: { x: 780, y: 160 }, data: { reference: '마태복음 1:5', text: '살몬은 라합에게서 보아스를 낳고 보아스는 룻에게서 오벳을 낳고 오벳은 이새를 낳고', color: '#10b981' } },

        // ── 주제 노드 ──
        { id: 'rt-topic-gleaning', type: 'topic', position: { x: 180, y: 880 }, data: { title: '이삭줍기 율법 — 가난한 자를 위한 제도', keywords: ['이삭줍기', '레위기', '신명기', '사회정의', '과부'] } },
        { id: 'rt-topic-goel', type: 'topic', position: { x: 700, y: 520 }, data: { title: '고엘(기업 무를 자)', keywords: ['고엘', '친족', '기업무를자', '속량', '의무'] } },
        { id: 'rt-topic-providence', type: 'topic', position: { x: 260, y: 520 }, data: { title: '하나님의 섭리', keywords: ['우연히', '섭리', '인도', '만남', '계획'] } },

        // ── 노트 ──
        { id: 'rt-note-chance', type: 'note', position: { x: 220, y: 160 }, data: { title: '"우연히" — 섭리의 역설 (2:3)', text: '히브리어 "미크레후"(מִקְרֶהָ)는 "그녀의 우연"이라는 뜻. 저자는 의도적으로 "우연"이라는 단어를 사용하여, 인간의 눈에는 우연이지만 하나님의 관점에서는 섭리적 인도임을 역설적으로 드러낸다.' } },
        { id: 'rt-note-boaz', type: 'note', position: { x: 700, y: 340 }, data: { title: '보아스의 인물 소개 (2:1)', text: '"유력한 자"(이쉬 기보르 하일, אִישׁ גִּבּוֹר חַיִל)는 부·지위·덕을 겸비한 인물. 엘리멜렉의 "친족"(모다)이라는 정보가 고엘 제도의 복선. 이름 "보아스"는 "그 안에 힘이 있다"는 뜻.' } },
        { id: 'rt-note-ruth-character', type: 'note', position: { x: 40, y: 40 }, data: { title: '룻의 성품 — 주도성과 근면', text: '룻이 먼저 나오미에게 "가겠나이다"라고 말한다(2:2). 시어머니에게 허락을 구하지만 주도적이다. 7절에서 사환은 룻이 "아침부터 지금까지 쉬지 않고" 일했다고 보고한다. 모압 여인이라는 약자의 위치에서도 수동적이지 않다.' } },
        { id: 'rt-note-greeting', type: 'note', position: { x: 660, y: 680 }, data: { title: '보아스의 인사 — 신앙 공동체의 모습 (2:4)', text: '"여호와께서 너희와 함께 하시기를" — 주인과 일꾼 사이의 인사에 여호와의 이름이 자연스럽게 등장한다. 이 밭은 단순한 작업장이 아닌, 하나님을 경외하는 공동체의 현장이다.' } },
      ],
      edges: [
        // 본문 → 중심 주제
        { id: 'rt-e-1-center', source: 'rt-v1', target: 'rt-topic-center', type: 'topic' },
        { id: 'rt-e-3-center', source: 'rt-v3', target: 'rt-topic-center', type: 'topic' },

        // 본문 흐름
        { id: 'rt-e-flow-1-2', source: 'rt-v1', target: 'rt-v2', type: 'relation', label: '관계', data: { note: '배경 소개 → 룻의 결심' } },
        { id: 'rt-e-flow-2-3', source: 'rt-v2', target: 'rt-v3', type: 'relation', label: '관계', data: { note: '결심 → 실행' } },
        { id: 'rt-e-flow-4-5', source: 'rt-v4', target: 'rt-v5', type: 'relation', label: '관계', data: { note: '보아스 도착 → 룻을 발견' } },
        { id: 'rt-e-flow-5-6', source: 'rt-v5', target: 'rt-v6', type: 'relation', label: '관계' },
        { id: 'rt-e-flow-6-7', source: 'rt-v6', target: 'rt-v7', type: 'relation', label: '관계', data: { note: '사환의 증언 — 룻의 근면함' } },

        // 섭리 주제
        { id: 'rt-e-3-prov', source: 'rt-v3', target: 'rt-topic-providence', type: 'topic' },
        { id: 'rt-e-note-chance-prov', source: 'rt-note-chance', target: 'rt-topic-providence', type: 'relation', label: '관계' },
        { id: 'rt-e-note-chance-v3', source: 'rt-note-chance', target: 'rt-v3', type: 'relation', label: '관계' },

        // 고엘 주제
        { id: 'rt-e-1-goel', source: 'rt-v1', target: 'rt-topic-goel', type: 'topic' },
        { id: 'rt-e-goel-deut25', source: 'rt-topic-goel', target: 'rt-v-deut25', type: 'citation', label: '인용', data: { note: '수혼법(嫂婚法) — 형사취수 제도' } },
        { id: 'rt-e-note-boaz-goel', source: 'rt-note-boaz', target: 'rt-topic-goel', type: 'relation', label: '관계' },
        { id: 'rt-e-note-boaz-v1', source: 'rt-note-boaz', target: 'rt-v1', type: 'relation', label: '관계' },

        // 이삭줍기 율법
        { id: 'rt-e-2-gleaning', source: 'rt-v2', target: 'rt-topic-gleaning', type: 'topic' },
        { id: 'rt-e-7-gleaning', source: 'rt-v7', target: 'rt-topic-gleaning', type: 'topic' },
        { id: 'rt-e-gleaning-lev', source: 'rt-topic-gleaning', target: 'rt-v-lev19', type: 'citation', label: '인용' },
        { id: 'rt-e-gleaning-deut', source: 'rt-topic-gleaning', target: 'rt-v-deut24', type: 'citation', label: '인용' },
        { id: 'rt-e-lev-deut', source: 'rt-v-lev19', target: 'rt-v-deut24', type: 'parallel', label: '평행', data: { note: '동일 율법의 레위기/신명기 판' } },

        // 룻 성품 노트
        { id: 'rt-e-ruth-char-v2', source: 'rt-note-ruth-character', target: 'rt-v2', type: 'relation', label: '관계' },
        { id: 'rt-e-ruth-char-v7', source: 'rt-note-ruth-character', target: 'rt-v7', type: 'relation', label: '관계' },

        // 보아스 인사 노트
        { id: 'rt-e-greeting-v4', source: 'rt-note-greeting', target: 'rt-v4', type: 'relation', label: '관계' },

        // 신약 연결 — 메시아 족보
        { id: 'rt-e-center-mt', source: 'rt-topic-center', target: 'rt-v-mt1', type: 'echo', label: '반향', data: { note: '보아스와 룻의 만남 → 다윗 → 예수 그리스도 족보로 이어짐' } },
        { id: 'rt-e-goel-mt', source: 'rt-topic-goel', target: 'rt-v-mt1', type: 'echo', label: '반향', data: { note: '고엘의 속량이 궁극적으로 그리스도의 구속을 예표' } },
      ],
    },
  },
  // ── 룻기 1장 — 절 관계 다이어그램 (Arcing) ──────────────────────────────
  {
    id: 'seed-ruth1-arcing',
    name: '룻기 1장 — 절 관계 다이어그램 (Arcing)',
    type: 'file',
    savedAt: new Date().toISOString(),
    data: {
      nodes: [
        // 단일 Arcing 노드로 전체 장 표시
        { id: 'rt1-arc', type: 'arcing', position: { x: 60, y: 40 },
          data: {
            title: '룻기 1장 — 나오미의 귀환',
            color: '#6d28d9',
            bookId: 'Ruth',
            chapter: 1,
            verseStart: 1,
            verseEnd: 22,
          } },
      ],
      edges: [],
    },
  },
  // ── (구버전) 룻기 1장 — 구문 분석 테스트 캔버스 (숨김) ─────────────────
  {
    id: 'seed-ruth1-syntax-hidden',
    name: '(숨김) 룻기 1장 — 절별 구문 분석',
    type: 'file',
    savedAt: new Date().toISOString(),
    data: {
      nodes: [
        // ── 제목 ──
        { id: 'rt1-title', type: 'topic', position: { x: 400, y: 20 },
          data: { title: '룻기 1장 — 나오미의 귀환', keywords: ['룻', '나오미', '헤세드', '귀환', '고엘'] } },

        // ── 장면 레이블 ──
        { id: 'rt1-sc1', type: 'topic', position: { x: 50, y: 120 },
          data: { title: '▶ 장면 1 — 시련 (1-7절)', keywords: ['기근', '이주', '모압', '죽음'] } },
        { id: 'rt1-sc2', type: 'topic', position: { x: 400, y: 120 },
          data: { title: '▶ 장면 2 — 나오미의 만류 (8-15절)', keywords: ['나오미', '오르바', '룻', '귀향 권고'] } },
        { id: 'rt1-sc3', type: 'topic', position: { x: 750, y: 120 },
          data: { title: '▶ 장면 3 — 룻의 선언과 귀환 (16-22절)', keywords: ['룻의 선언', '헤세드', '마라', '보리 추수'] } },

        // ── 구문 안내 노트 ──
        { id: 'rt1-guide', type: 'note', position: { x: -290, y: 200 },
          data: { title: '📌 구문 탭 사용법', text: '각 절 노드 클릭 → "구문" 탭 선택\n원어 문법 구조가 색상으로 표시됩니다.\n\n동사(보라) — 이야기의 주동사\n접속사(회색) — 절 연결\n\n히브리어는 격 표시가 없으므로\n주어·목적어는 문맥으로 판단합니다.' } },

        // ── 장면 1: 1-7절 (x=50) ──
        { id: 'rt1-v1',  type: 'verse', position: { x: 50, y: 200  }, data: { reference: '룻기 1:1',  text: '', color: '#94a3b8', bookId: 'Ruth', chapter: 1, verseStart: 1,  verseEnd: 1,  translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v2',  type: 'verse', position: { x: 50, y: 360  }, data: { reference: '룻기 1:2',  text: '', color: '#94a3b8', bookId: 'Ruth', chapter: 1, verseStart: 2,  verseEnd: 2,  translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v3',  type: 'verse', position: { x: 50, y: 520  }, data: { reference: '룻기 1:3',  text: '', color: '#94a3b8', bookId: 'Ruth', chapter: 1, verseStart: 3,  verseEnd: 3,  translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v4',  type: 'verse', position: { x: 50, y: 680  }, data: { reference: '룻기 1:4',  text: '', color: '#94a3b8', bookId: 'Ruth', chapter: 1, verseStart: 4,  verseEnd: 4,  translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v5',  type: 'verse', position: { x: 50, y: 840  }, data: { reference: '룻기 1:5',  text: '', color: '#94a3b8', bookId: 'Ruth', chapter: 1, verseStart: 5,  verseEnd: 5,  translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v6',  type: 'verse', position: { x: 50, y: 1000 }, data: { reference: '룻기 1:6',  text: '', color: '#0ea5e9', bookId: 'Ruth', chapter: 1, verseStart: 6,  verseEnd: 6,  translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v7',  type: 'verse', position: { x: 50, y: 1160 }, data: { reference: '룻기 1:7',  text: '', color: '#0ea5e9', bookId: 'Ruth', chapter: 1, verseStart: 7,  verseEnd: 7,  translations: {}, activeTab: 'krv' } },

        // ── 장면 2: 8-15절 (x=400) ──
        { id: 'rt1-v8',  type: 'verse', position: { x: 400, y: 200  }, data: { reference: '룻기 1:8',  text: '', color: '#0ea5e9', bookId: 'Ruth', chapter: 1, verseStart: 8,  verseEnd: 8,  translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v9',  type: 'verse', position: { x: 400, y: 360  }, data: { reference: '룻기 1:9',  text: '', color: '#0ea5e9', bookId: 'Ruth', chapter: 1, verseStart: 9,  verseEnd: 9,  translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v10', type: 'verse', position: { x: 400, y: 520  }, data: { reference: '룻기 1:10', text: '', color: '#0ea5e9', bookId: 'Ruth', chapter: 1, verseStart: 10, verseEnd: 10, translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v11', type: 'verse', position: { x: 400, y: 680  }, data: { reference: '룻기 1:11', text: '', color: '#0ea5e9', bookId: 'Ruth', chapter: 1, verseStart: 11, verseEnd: 11, translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v12', type: 'verse', position: { x: 400, y: 840  }, data: { reference: '룻기 1:12', text: '', color: '#0ea5e9', bookId: 'Ruth', chapter: 1, verseStart: 12, verseEnd: 12, translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v13', type: 'verse', position: { x: 400, y: 1000 }, data: { reference: '룻기 1:13', text: '', color: '#0ea5e9', bookId: 'Ruth', chapter: 1, verseStart: 13, verseEnd: 13, translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v14', type: 'verse', position: { x: 400, y: 1160 }, data: { reference: '룻기 1:14', text: '', color: '#0ea5e9', bookId: 'Ruth', chapter: 1, verseStart: 14, verseEnd: 14, translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v15', type: 'verse', position: { x: 400, y: 1320 }, data: { reference: '룻기 1:15', text: '', color: '#0ea5e9', bookId: 'Ruth', chapter: 1, verseStart: 15, verseEnd: 15, translations: {}, activeTab: 'krv' } },

        // ── 장면 3: 16-22절 (x=750) ──
        { id: 'rt1-v16', type: 'verse', position: { x: 750, y: 200  }, data: { reference: '룻기 1:16', text: '', color: '#ef4444', bookId: 'Ruth', chapter: 1, verseStart: 16, verseEnd: 16, translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v17', type: 'verse', position: { x: 750, y: 360  }, data: { reference: '룻기 1:17', text: '', color: '#ef4444', bookId: 'Ruth', chapter: 1, verseStart: 17, verseEnd: 17, translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v18', type: 'verse', position: { x: 750, y: 520  }, data: { reference: '룻기 1:18', text: '', color: '#10b981', bookId: 'Ruth', chapter: 1, verseStart: 18, verseEnd: 18, translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v19', type: 'verse', position: { x: 750, y: 680  }, data: { reference: '룻기 1:19', text: '', color: '#10b981', bookId: 'Ruth', chapter: 1, verseStart: 19, verseEnd: 19, translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v20', type: 'verse', position: { x: 750, y: 840  }, data: { reference: '룻기 1:20', text: '', color: '#10b981', bookId: 'Ruth', chapter: 1, verseStart: 20, verseEnd: 20, translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v21', type: 'verse', position: { x: 750, y: 1000 }, data: { reference: '룻기 1:21', text: '', color: '#10b981', bookId: 'Ruth', chapter: 1, verseStart: 21, verseEnd: 21, translations: {}, activeTab: 'krv' } },
        { id: 'rt1-v22', type: 'verse', position: { x: 750, y: 1160 }, data: { reference: '룻기 1:22', text: '', color: '#10b981', bookId: 'Ruth', chapter: 1, verseStart: 22, verseEnd: 22, translations: {}, activeTab: 'krv' } },

        // ── 핵심 노트 ──
        { id: 'rt1-note-decl', type: 'note', position: { x: 1110, y: 200 },
          data: { title: '❤️ 룻의 선언 — 헤세드의 언어 (1:16-17)', text: '당신이 가는 곳에 나도 가고\n당신이 머무는 곳에 나도 머물겠습니다\n당신의 백성이 내 백성이고\n당신의 하나님이 내 하나님입니다\n\n히브리어 원문은 점층적 병행 구조(ABA\').\n이방인 룻의 언약 편입을 선언하는 장면으로\n헤세드(חֶסֶד, 언약적 사랑)의 핵심 표현입니다.' } },
        { id: 'rt1-note-mara', type: 'note', position: { x: 1110, y: 840 },
          data: { title: '나오미 → 마라 (쓴 것)', text: '나오미(נָעֳמִי) = "기쁨·달콤함"\n마라(מָרָא) = "쓴 것"\n\n이름 변경은 정체성의 재정의.\n그러나 서술자는 계속 "나오미"라 부름 —\n저자는 독자에게 그녀의 이야기가\n아직 끝나지 않았음을 암시합니다.' } },
      ],
      edges: [
        // ── 서사 흐름 (내러티브 순서) ──
        { id: 'rt1-e-1-2',   source: 'rt1-v1',  target: 'rt1-v2',  type: 'relation', label: '↓' },
        { id: 'rt1-e-2-3',   source: 'rt1-v2',  target: 'rt1-v3',  type: 'relation', label: '↓' },
        { id: 'rt1-e-3-4',   source: 'rt1-v3',  target: 'rt1-v4',  type: 'relation', label: '↓' },
        { id: 'rt1-e-4-5',   source: 'rt1-v4',  target: 'rt1-v5',  type: 'relation', label: '↓' },
        { id: 'rt1-e-5-6',   source: 'rt1-v5',  target: 'rt1-v6',  type: 'relation', label: '↓' },
        { id: 'rt1-e-6-7',   source: 'rt1-v6',  target: 'rt1-v7',  type: 'relation', label: '↓' },
        { id: 'rt1-e-7-8',   source: 'rt1-v7',  target: 'rt1-v8',  type: 'relation', label: '장면 2→' },
        { id: 'rt1-e-8-9',   source: 'rt1-v8',  target: 'rt1-v9',  type: 'relation', label: '↓' },
        { id: 'rt1-e-9-10',  source: 'rt1-v9',  target: 'rt1-v10', type: 'relation', label: '↓' },
        { id: 'rt1-e-10-11', source: 'rt1-v10', target: 'rt1-v11', type: 'relation', label: '↓' },
        { id: 'rt1-e-11-12', source: 'rt1-v11', target: 'rt1-v12', type: 'relation', label: '↓' },
        { id: 'rt1-e-12-13', source: 'rt1-v12', target: 'rt1-v13', type: 'relation', label: '↓' },
        { id: 'rt1-e-13-14', source: 'rt1-v13', target: 'rt1-v14', type: 'relation', label: '↓' },
        { id: 'rt1-e-14-15', source: 'rt1-v14', target: 'rt1-v15', type: 'relation', label: '↓' },
        { id: 'rt1-e-15-16', source: 'rt1-v15', target: 'rt1-v16', type: 'relation', label: '장면 3→' },
        { id: 'rt1-e-16-17', source: 'rt1-v16', target: 'rt1-v17', type: 'relation', label: '↓' },
        { id: 'rt1-e-17-18', source: 'rt1-v17', target: 'rt1-v18', type: 'relation', label: '↓' },
        { id: 'rt1-e-18-19', source: 'rt1-v18', target: 'rt1-v19', type: 'relation', label: '↓' },
        { id: 'rt1-e-19-20', source: 'rt1-v19', target: 'rt1-v20', type: 'relation', label: '↓' },
        { id: 'rt1-e-20-21', source: 'rt1-v20', target: 'rt1-v21', type: 'relation', label: '↓' },
        { id: 'rt1-e-21-22', source: 'rt1-v21', target: 'rt1-v22', type: 'relation', label: '↓' },
        // ── 핵심 노트 연결 ──
        { id: 'rt1-e-decl-16',  source: 'rt1-v16', target: 'rt1-note-decl', type: 'topic' },
        { id: 'rt1-e-decl-17',  source: 'rt1-v17', target: 'rt1-note-decl', type: 'topic' },
        { id: 'rt1-e-mara-20',  source: 'rt1-v20', target: 'rt1-note-mara', type: 'topic' },
        { id: 'rt1-e-mara-21',  source: 'rt1-v21', target: 'rt1-note-mara', type: 'topic' },
        // ── 장면 제목 연결 ──
        { id: 'rt1-e-sc1-v1',  source: 'rt1-sc1', target: 'rt1-v1',  type: 'topic' },
        { id: 'rt1-e-sc2-v8',  source: 'rt1-sc2', target: 'rt1-v8',  type: 'topic' },
        { id: 'rt1-e-sc3-v16', source: 'rt1-sc3', target: 'rt1-v16', type: 'topic' },
      ],
    },
  },
];

// 시드 파일을 포함한 초기 트리 로드 — 시드 로직은 SavePanel 전용
function loadTree() {
  const tree = loadTreeCore();
  const seeded = JSON.parse(localStorage.getItem(SEED_KEY) || '[]');
  let mutated = false;
  for (const file of SEED_FILES) {
    if (!seeded.includes(file.id)) {
      if (!tree.children) tree.children = [];
      tree.children.push(JSON.parse(JSON.stringify(file)));
      seeded.push(file.id);
      mutated = true;
    }
  }
  if (mutated) {
    localStorage.setItem(SEED_KEY, JSON.stringify(seeded));
    saveTree(tree);
  }
  return tree;
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function writeToDirectory(dirHandle, filename, data) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

async function readFromDirectory(dirHandle, filename) {
  try {
    const fileHandle = await dirHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function SavePanel({ nodes, edges, onLoad, onNewMap, open, onToggle, mobileInline, docSaveKey, onOpenDoc }) {
  const { todayCount, totalCount } = useAppVisitorCount();
  const [tree, setTree] = useState(loadTree);
  const [selectedId, setSelectedId] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');  // 태그·이름 검색어
  const fileInputRef = useRef(null);
  const importAllRef = useRef(null);

  // ─── 옵시디언 자동 저장 ───
  const [obsidianDir, setObsidianDir] = useState(null);
  const [obsidianDirName, setObsidianDirName] = useState(
    localStorage.getItem(OBSIDIAN_DIR_KEY) || ''
  );
  const [obsidianStatus, setObsidianStatus] = useState('');
  const [obsidianAutoSync, setObsidianAutoSync] = useState(true);

  useEffect(() => { saveTree(tree); }, [tree]);

  // DocPanel에서 문서 저장 시 트리 새로고침
  useEffect(() => {
    if (docSaveKey) setTree(loadTree());
  }, [docSaveKey]);

  // 페이지 로드 시 이전 연결이 있었으면 재연결 안내 표시
  useEffect(() => {
    if (obsidianDirName && !obsidianDir) {
      setObsidianStatus('새로고침으로 연결이 해제됨 — 아래 버튼으로 재연결하세요');
    }
  }, []);

  // 옵시디언 자동 동기화: 트리가 변경될 때마다 자동 저장
  useEffect(() => {
    if (!obsidianDir || !obsidianAutoSync) return;
    const timer = setTimeout(() => {
      syncToObsidian(obsidianDir, tree, nodes, edges);
    }, 1500);
    return () => clearTimeout(timer);
  }, [tree, nodes, edges, obsidianDir, obsidianAutoSync]);

  const syncToObsidian = async (dirHandle, currentTree, currentNodes, currentEdges) => {
    try {
      setObsidianStatus('저장 중...');
      // 현재 캔버스 저장
      await writeToDirectory(dirHandle, 'current-mindmap.json', {
        nodes: currentNodes,
        edges: currentEdges,
        savedAt: new Date().toISOString(),
      });
      // 저장소 트리 전체 백업
      await writeToDirectory(dirHandle, 'mindmap-saves.json', currentTree);
      // 저장소의 개별 파일들도 각각 저장 (saves 하위 폴더에)
      const files = collectFiles(currentTree);
      if (files.length > 0) {
        const savesDir = await dirHandle.getDirectoryHandle('saves', { create: true });
        for (const f of files) {
          const safeName = f.name.replace(/[/\\:*?"<>|.]/g, '_').replace(/\s+/g, '_');
          await writeToDirectory(savesDir, `${safeName}.json`, {
            name: f.name,
            nodes: f.data.nodes,
            edges: f.data.edges,
            savedAt: f.savedAt,
          });
        }
      }
      setObsidianStatus(`동기화 완료 (${new Date().toLocaleTimeString('ko')})`);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setObsidianStatus('권한 만료 — 폴더를 다시 연결해주세요');
        setObsidianDir(null);
      } else {
        setObsidianStatus(`오류: ${err.message}`);
      }
    }
  };

  const handleConnectObsidian = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      // bible-mindmap 하위 폴더 생성
      const mindmapDir = await dirHandle.getDirectoryHandle('bible-mindmap', { create: true });
      // saves 하위 폴더도 생성
      await mindmapDir.getDirectoryHandle('saves', { create: true });

      setObsidianDir(mindmapDir);
      const fullName = `${dirHandle.name}/bible-mindmap`;
      setObsidianDirName(fullName);
      localStorage.setItem(OBSIDIAN_DIR_KEY, fullName);

      // 즉시 동기화
      await syncToObsidian(mindmapDir, tree, nodes, edges);
      setObsidianStatus(`연결 완료! (${fullName})`);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setObsidianStatus(`연결 실패: ${err.message}`);
      }
    }
  };

  const handleLoadFromObsidian = async () => {
    if (!obsidianDir) return;
    try {
      const data = await readFromDirectory(obsidianDir, 'current-mindmap.json');
      if (data?.nodes && data?.edges) {
        if (confirm('옵시디언에서 마지막 저장된 마인드맵을 불러오시겠습니까?')) {
          onLoad(data.nodes, data.edges);
          setObsidianStatus('불러오기 완료');
        }
      } else {
        alert('옵시디언 폴더에 저장된 마인드맵이 없습니다.');
      }
    } catch {
      setObsidianStatus('불러오기 실패');
    }
  };

  const handleRestoreTreeFromObsidian = async () => {
    if (!obsidianDir) return;
    try {
      const data = await readFromDirectory(obsidianDir, 'mindmap-saves.json');
      if (data?.id === 'root' && data?.children) {
        if (confirm('옵시디언 백업에서 저장소 전체를 복원하시겠습니까?\n기존 저장소 데이터가 대체됩니다.')) {
          ensureDocRoot(data);
          setTree(data);
          setObsidianStatus('저장소 복원 완료');
        }
      } else {
        alert('옵시디언 폴더에 저장소 백업이 없습니다.');
      }
    } catch {
      setObsidianStatus('복원 실패');
    }
  };

  const handleDisconnectObsidian = () => {
    setObsidianDir(null);
    setObsidianDirName('');
    localStorage.removeItem(OBSIDIAN_DIR_KEY);
    setObsidianStatus('');
  };

  const updateTree = (fn) => {
    setTree((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      fn(copy);
      return copy;
    });
  };

  const [dragId, setDragId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'inside' | 'before' | 'after'

  // 검색어 → 태그·이름 매칭으로 트리 필터링. 검색어 없으면 원본 트리 그대로.
  const filteredTree = useMemo(() => {
    const q = searchQuery.trim().replace(/^#+/, '').toLowerCase();
    if (!q) return tree;
    const matches = (node) => {
      if (node.name?.toLowerCase().includes(q)) return true;
      if (node.type === 'doc' && node.data?.docType === 'sermon') {
        const t = collectDocTags(node.data.sermon);
        if (t.some((tag) => tag.toLowerCase().includes(q))) return true;
      }
      return false;
    };
    const walk = (node) => {
      if (!node.children) return matches(node) ? { ...node } : null;
      const kept = node.children.map(walk).filter(Boolean);
      if (kept.length || matches(node)) {
        return { ...node, children: kept, open: true };
      }
      return null;
    };
    return walk(tree) || { ...tree, children: [] };
  }, [tree, searchQuery]);

  function isDescendant(tree, ancestorId, nodeId) {
    const ancestor = findNode(tree, ancestorId);
    if (!ancestor || !ancestor.children) return false;
    for (const child of ancestor.children) {
      if (child.id === nodeId) return true;
      if (isDescendant(child, child.id, nodeId)) return true;
    }
    return false;
  }

  const handleMoveNode = (sourceId, targetId, position) => {
    if (sourceId === targetId || sourceId === 'root') return;
    updateTree((t) => {
      if (isDescendant(t, sourceId, targetId)) return;
      const sourceParent = findParent(t, sourceId);
      if (!sourceParent) return;
      const sourceIdx = sourceParent.children.findIndex((c) => c.id === sourceId);
      const [moved] = sourceParent.children.splice(sourceIdx, 1);

      if (position === 'inside') {
        const target = findNode(t, targetId);
        if (!target) return;
        if (target.type !== 'folder') {
          const tParent = findParent(t, targetId);
          if (!tParent) return;
          const tIdx = tParent.children.findIndex((c) => c.id === targetId);
          tParent.children.splice(tIdx + 1, 0, moved);
          return;
        }
        if (!target.children) target.children = [];
        target.children.push(moved);
        target.open = true;
      } else {
        const tParent = findParent(t, targetId);
        if (!tParent) return;
        const tIdx = tParent.children.findIndex((c) => c.id === targetId);
        const insertIdx = position === 'before' ? tIdx : tIdx + 1;
        tParent.children.splice(insertIdx, 0, moved);
      }
    });
    setDragId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  const handleNewFolder = () => {
    const parentId = selectedId || 'root';
    updateTree((t) => {
      const parent = findNode(t, parentId);
      const target = parent?.type === 'folder' ? parent : findParent(t, parentId) || t;
      if (!target.children) target.children = [];
      target.children.push({
        id: generateId(),
        name: '새 폴더',
        type: 'folder',
        children: [],
        open: true,
      });
    });
  };

  const handleSave = () => {
    const name = prompt('저장할 이름을 입력하세요:', `마인드맵 ${new Date().toLocaleDateString('ko')}`);
    if (!name) return;
    // doc-root는 설교 문서 전용 폴더이므로 마인드맵 저장 대상에서 제외
    const rawId = selectedId || 'root';
    const parentId = rawId === DOC_ROOT_ID ? 'root' : rawId;
    const data = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
    updateTree((t) => {
      const parent = findNode(t, parentId);
      const target = parent?.type === 'folder' ? parent : findParent(t, parentId) || t;
      if (!target.children) target.children = [];
      target.children.push({
        id: generateId(),
        name,
        type: 'file',
        data,
        savedAt: new Date().toISOString(),
      });
    });
  };

  const handleLoad = (item) => {
    if (item.type === 'doc') {
      if (onOpenDoc) onOpenDoc(item);
      return;
    }
    if (item.type !== 'file' || !item.data) return;
    if (!confirm(`"${item.name}"을(를) 불러오시겠습니까?\n현재 작업은 저장하지 않으면 사라집니다.`)) return;
    onLoad(item.data.nodes, item.data.edges);
  };

  const handleDelete = (id) => {
    const node = findNode(tree, id);
    if (!node) return;
    const label = node.type === 'folder' ? '폴더와 하위 항목 모두' : `"${node.name}"`;
    if (!confirm(`${label}을(를) 삭제하시겠습니까?`)) return;
    updateTree((t) => {
      const parent = findParent(t, id);
      if (parent) parent.children = parent.children.filter((c) => c.id !== id);
    });
    if (selectedId === id) setSelectedId(null);
  };

  const handleOverwrite = (id) => {
    const node = findNode(tree, id);
    if (!node || node.type !== 'file') return;
    if (!confirm(`"${node.name}"에 현재 작업을 덮어쓰시겠습니까?`)) return;
    updateTree((t) => {
      const target = findNode(t, id);
      target.data = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
      target.savedAt = new Date().toISOString();
    });
  };

  const startRename = (item) => {
    setRenaming(item.id);
    setRenameValue(item.name);
  };

  const commitRename = () => {
    if (!renaming || !renameValue.trim()) { setRenaming(null); return; }
    updateTree((t) => {
      const node = findNode(t, renaming);
      if (node) node.name = renameValue.trim();
    });
    setRenaming(null);
  };

  const toggleFolder = (id) => {
    updateTree((t) => {
      const node = findNode(t, id);
      if (node) node.open = !node.open;
    });
  };

  const handleExportCurrent = () => {
    const ts = new Date().toISOString().slice(0, 10);
    downloadJSON({ nodes, edges }, `마인드맵_${ts}.json`);
  };

  const handleExportAll = () => {
    const ts = new Date().toISOString().slice(0, 10);
    downloadJSON(tree, `마인드맵_저장소_${ts}.json`);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.nodes && data.edges) {
          if (confirm(`"${file.name}" 파일을 캔버스에 불러오시겠습니까?`)) {
            onLoad(data.nodes, data.edges);
          }
        } else {
          alert('올바른 마인드맵 파일이 아닙니다.\n(nodes, edges 필드가 필요합니다)');
        }
      } catch {
        alert('파일을 읽을 수 없습니다. JSON 형식을 확인해주세요.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportAll = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.id === 'root' && data.children) {
          if (confirm(`저장소 전체를 "${file.name}" 파일로 복원하시겠습니까?\n기존 저장소 데이터가 대체됩니다.`)) {
            ensureDocRoot(data);
            setTree(data);
          }
        } else {
          alert('올바른 저장소 백업 파일이 아닙니다.');
        }
      } catch {
        alert('파일을 읽을 수 없습니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const hasFileSystemAccess = typeof window.showDirectoryPicker === 'function';

  if (!open) {
    return (
      <div
        onClick={onToggle}
        title="저장소 열기"
        style={{
          width: 30,
          background: 'linear-gradient(180deg, #d1fae5, #ecfdf5)',
          borderLeft: '1px solid #86efac',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          writingMode: 'vertical-lr',
          fontSize: 11,
          color: '#065f46',
          fontWeight: 700,
          letterSpacing: '.05em',
          userSelect: 'none',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(180deg, #a7f3d0, #d1fae5)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'linear-gradient(180deg, #d1fae5, #ecfdf5)')}
      >
        ◀ 📂 저장소 열기
      </div>
    );
  }

  return (
    <div
      style={{
        width: mobileInline ? '100%' : 280,
        background: '#f8fafc',
        borderLeft: mobileInline ? 'none' : '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        fontSize: mobileInline ? 14 : 12,
      }}
    >
      {/* Header */}
      <div style={{ padding: mobileInline ? '12px 14px' : '10px 12px',
        borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 700, fontSize: mobileInline ? 16 : 14, color: '#1e293b', flex: 1 }}>📂 저장소</span>
        <button onClick={onToggle}
          style={mobileInline
            ? { ...iconBtnTop, minWidth: 44, minHeight: 44, fontSize: 18 }
            : iconBtnTop}
          title="패널 닫기">✕</button>
      </div>

      {/* Actions: new map, save, folder */}
      <div style={{ padding: mobileInline ? '10px 14px' : '8px 12px',
        display: 'flex', flexDirection: 'column', gap: mobileInline ? 6 : 4,
        borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => {
            if (nodes.length === 0 || confirm('현재 작업을 초기화하고 새 마인드맵을 시작하시겠습니까?\n저장하지 않은 작업은 사라집니다.')) {
              onNewMap();
            }
          }}
          style={mobileInline
            ? { ...newMapBtn, minHeight: 44, fontSize: 14, padding: '12px' }
            : newMapBtn}
        >
          ✨ 새 마인드맵
        </button>
        <div style={{ display: 'flex', gap: mobileInline ? 6 : 4 }}>
          <button onClick={handleSave}
            style={mobileInline ? { ...actionBtn, minHeight: 44, fontSize: 14, padding: '12px' } : actionBtn}>💾 저장</button>
          <button onClick={handleNewFolder}
            style={{ ...actionBtn, ...(mobileInline ? { minHeight: 44, fontSize: 14, padding: '12px' } : {}),
              background: '#e2e8f0', color: '#475569' }}>📁 새 폴더</button>
        </div>
      </div>

      {/* 옵시디언 자동 저장 섹션 */}
      {hasFileSystemAccess && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>📋 옵시디언 자동 저장</span>
            {obsidianDir && (
              <span
                style={{
                  fontSize: 9,
                  background: '#dcfce7',
                  color: '#166534',
                  padding: '1px 5px',
                  borderRadius: 8,
                  fontWeight: 600,
                }}
              >
                연결됨
              </span>
            )}
          </div>

          {!obsidianDir ? (
            <>
              {obsidianDirName ? (
                <>
                  <div style={{
                    fontSize: 10, color: '#b45309', background: '#fef3c7',
                    padding: '4px 8px', borderRadius: 6, lineHeight: 1.4,
                  }}>
                    ⚠️ 새로고침으로 연결 해제됨
                    <br />📁 {obsidianDirName}
                  </div>
                  <button onClick={handleConnectObsidian} style={{
                    ...obsidianBtn,
                    background: '#f59e0b',
                    animation: 'pulse 2s infinite',
                  }}>
                    🔗 한 클릭 재연결 (같은 폴더 선택)
                  </button>
                </>
              ) : (
                <button onClick={handleConnectObsidian} style={obsidianBtn}>
                  🔗 옵시디언 볼트 폴더 연결
                </button>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.4 }}>
                📁 {obsidianDirName}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <label style={{ fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={obsidianAutoSync}
                    onChange={(e) => setObsidianAutoSync(e.target.checked)}
                    style={{ width: 12, height: 12 }}
                  />
                  자동 동기화
                </label>
                <button
                  onClick={() => syncToObsidian(obsidianDir, tree, nodes, edges)}
                  style={{ ...obsidianSmBtn, background: '#ede9fe', color: '#7c3aed' }}
                  title="지금 바로 옵시디언에 저장"
                >
                  🔄 지금 저장
                </button>
              </div>

              <div style={{ display: 'flex', gap: 3 }}>
                <button onClick={handleLoadFromObsidian} style={obsidianSmBtn} title="옵시디언에서 마지막 캔버스 불러오기">
                  📤 불러오기
                </button>
                <button onClick={handleRestoreTreeFromObsidian} style={obsidianSmBtn} title="옵시디언 백업에서 저장소 복원">
                  🗄️ 저장소 복원
                </button>
                <button onClick={handleDisconnectObsidian} style={{ ...obsidianSmBtn, background: '#fee2e2', color: '#991b1b' }} title="연결 해제">
                  ✕
                </button>
              </div>

              {obsidianStatus && (
                <div style={{
                  fontSize: 10,
                  color: obsidianStatus.includes('오류') || obsidianStatus.includes('실패') ? '#dc2626' : '#059669',
                  lineHeight: 1.3,
                }}>
                  {obsidianStatus}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Actions: export & import */}
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>파일 내보내기 / 가져오기</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleExportCurrent} style={fileBtn} title="현재 캔버스를 JSON 파일로 다운로드">
            📥 현재 맵 내보내기
          </button>
          <button onClick={() => fileInputRef.current?.click()} style={fileBtn} title="JSON 파일을 캔버스에 불러오기">
            📤 파일 불러오기
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleExportAll} style={{ ...fileBtn, background: '#fef3c7', color: '#92400e' }} title="저장소 전체를 JSON 파일로 백업">
            🗄️ 저장소 백업
          </button>
          <button onClick={() => importAllRef.current?.click()} style={{ ...fileBtn, background: '#fef3c7', color: '#92400e' }} title="백업 파일로 저장소 복원">
            🗄️ 저장소 복원
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />
        <input ref={importAllRef} type="file" accept=".json" onChange={handleImportAll} style={{ display: 'none' }} />
      </div>

      {/* 태그·이름 검색 */}
      <div style={{ padding: '6px 10px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
        <div style={{ position: 'relative' }}>
          <input
            placeholder="🔍 태그 또는 이름 검색 (예: #사랑, 요한복음, 구원)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '5px 26px 5px 8px', fontSize: 11,
              border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none',
              background: '#f8fafc', boxSizing: 'border-box',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              title="검색 지우기"
              style={{
                position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                padding: 0, width: 20, height: 20, lineHeight: 1,
                fontSize: 14, color: '#94a3b8',
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}
            >×</button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        <TreeNode
          item={filteredTree}
          depth={0}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onLoad={handleLoad}
          onDelete={handleDelete}
          onOverwrite={handleOverwrite}
          onToggleFolder={toggleFolder}
          renaming={renaming}
          renameValue={renameValue}
          onRenameValueChange={setRenameValue}
          onStartRename={startRename}
          onCommitRename={commitRename}
          dragId={dragId}
          onDragStart={setDragId}
          dropTargetId={dropTargetId}
          dropPosition={dropPosition}
          onDropHover={(id, pos) => { setDropTargetId(id); setDropPosition(pos); }}
          onDropEnd={handleMoveNode}
          onDragCancel={() => { setDragId(null); setDropTargetId(null); setDropPosition(null); }}
        />
      </div>

      {/* 방문자 수 + 이메일 */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid #e2e8f0',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
      }}>
        {/* Visitor counter card */}
        <div style={{
          background: '#0f172a',
          borderRadius: 10,
          padding: '10px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10 }}>
            👥 앱 방문자
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {todayCount != null ? todayCount.toLocaleString() : '–'}
              </div>
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 4, letterSpacing: '.04em' }}>오늘 방문</div>
            </div>
            <div style={{ width: 1, height: 34, background: 'rgba(255,255,255,.12)', flexShrink: 0 }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#60a5fa', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {totalCount != null ? (typeof totalCount === 'number' ? totalCount.toLocaleString() : totalCount) : '–'}
              </div>
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 4, letterSpacing: '.04em' }}>전체 누적</div>
            </div>
          </div>
        </div>

        {/* Email contact */}
        <EmailContact address="biblemindmap9@gmail.com" />

      </div>
    </div>
  );
}

// 트리에서 모든 파일 항목 수집
function collectFiles(node) {
  const result = [];
  if (node.type === 'file' && node.data) {
    result.push(node);
  }
  if (node.children) {
    for (const child of node.children) {
      result.push(...collectFiles(child));
    }
  }
  return result;
}

function TreeNode({
  item, depth, selectedId, onSelect, onLoad, onDelete, onOverwrite,
  onToggleFolder, renaming, renameValue, onRenameValueChange, onStartRename, onCommitRename,
  dragId, onDragStart, dropTargetId, dropPosition, onDropHover, onDropEnd, onDragCancel,
}) {
  const isFolder = item.type === 'folder';
  const isSelected = selectedId === item.id;
  const isRoot = item.id === 'root';
  const isRenaming = renaming === item.id;
  const isDragging = dragId === item.id;
  const isDropTarget = dropTargetId === item.id;

  const handleDragStart = (e) => {
    if (isRoot || isRenaming) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    onDragStart(item.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragId || dragId === item.id) return;
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    if (isFolder || isRoot) {
      if (y < h * 0.25 && !isRoot) onDropHover(item.id, 'before');
      else if (y > h * 0.75 && !isRoot) onDropHover(item.id, 'after');
      else onDropHover(item.id, 'inside');
    } else {
      if (y < h * 0.5) onDropHover(item.id, 'before');
      else onDropHover(item.id, 'after');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragId || dragId === item.id) return;
    onDropEnd(dragId, item.id, dropPosition || 'inside');
  };

  const handleDragEnd = () => { onDragCancel(); };

  let rowBg = isSelected ? '#dbeafe' : 'transparent';
  let borderIndicator = 'none';
  if (isDropTarget && dragId && dragId !== item.id) {
    if (dropPosition === 'inside') {
      rowBg = '#ddd6fe';
    } else if (dropPosition === 'before') {
      borderIndicator = '2px solid #7c3aed';
    } else if (dropPosition === 'after') {
      borderIndicator = '2px solid #7c3aed';
    }
  }

  return (
    <div>
      <div
        draggable={!isRoot && !isRenaming}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onDragLeave={() => { if (isDropTarget) onDropHover(null, null); }}
        onClick={() => {
          onSelect(item.id);
          if (isFolder) onToggleFolder(item.id);
        }}
        onDoubleClick={() => {
          if (!isFolder) onLoad(item);
          else onStartRename(item);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          paddingLeft: 8 + depth * 16,
          background: rowBg,
          cursor: isDragging ? 'grabbing' : 'pointer',
          userSelect: 'none',
          borderRadius: 2,
          opacity: isDragging ? 0.4 : 1,
          borderTop: isDropTarget && dropPosition === 'before' ? borderIndicator : 'none',
          borderBottom: isDropTarget && dropPosition === 'after' ? borderIndicator : 'none',
          transition: 'background 0.15s, opacity 0.15s',
        }}
      >
        <span style={{ fontSize: 13, flexShrink: 0, cursor: !isRoot && !isRenaming ? 'grab' : 'default' }}>
          {isFolder ? (item.open ? '📂' : '📁') : item.type === 'doc' ? '✍️' : '📄'}
        </span>

        {isRenaming ? (
          <input
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onBlur={onCommitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') onCommitRename(); if (e.key === 'Escape') onCommitRename(); }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            style={{ flex: 1, fontSize: 12, padding: '1px 4px', border: '1px solid #93c5fd', borderRadius: 3, outline: 'none' }}
          />
        ) : (
          <span style={{ flex: 1, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.name}
          </span>
        )}

        {!isRoot && !isRenaming && isSelected && (
          <div style={{ display: 'flex', gap: 2 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onStartRename(item)} style={tinyBtn} title="이름 변경">✏️</button>
            {!isFolder && item.type !== 'doc' && <button onClick={() => onOverwrite(item.id)} style={tinyBtn} title="덮어쓰기">💾</button>}
            {!isFolder && <button onClick={() => onLoad(item)} style={tinyBtn} title={item.type === 'doc' ? '문서 열기' : '불러오기'}>{item.type === 'doc' ? '✍️' : '📤'}</button>}
            <button onClick={() => onDelete(item.id)} style={tinyBtn} title="삭제">🗑️</button>
          </div>
        )}
      </div>

      {isFolder && item.open && item.children?.map((child) => (
        <TreeNode
          key={child.id}
          item={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          onLoad={onLoad}
          onDelete={onDelete}
          onOverwrite={onOverwrite}
          onToggleFolder={onToggleFolder}
          renaming={renaming}
          renameValue={renameValue}
          onRenameValueChange={onRenameValueChange}
          onStartRename={onStartRename}
          onCommitRename={onCommitRename}
          dragId={dragId}
          onDragStart={onDragStart}
          dropTargetId={dropTargetId}
          dropPosition={dropPosition}
          onDropHover={onDropHover}
          onDropEnd={onDropEnd}
          onDragCancel={onDragCancel}
        />
      ))}

      {isFolder && item.open && (!item.children || item.children.length === 0) && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (dragId) onDropHover(item.id, 'inside');
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragId) onDropEnd(dragId, item.id, 'inside');
          }}
          style={{
            padding: '4px 8px',
            paddingLeft: 24 + depth * 16,
            color: '#94a3b8', fontSize: 11,
            background: isDropTarget && dropPosition === 'inside' ? '#ede9fe' : 'transparent',
          }}
        >
          {isDropTarget && dropPosition === 'inside' ? '📥 여기에 놓기' : '비어 있음'}
        </div>
      )}
    </div>
  );
}

const iconBtnTop = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94a3b8', padding: '2px',
};

const newMapBtn = {
  padding: '8px 0', fontSize: 13, fontWeight: 700,
  background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
  width: '100%',
};

const actionBtn = {
  flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 600,
  background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
};

const fileBtn = {
  flex: 1, padding: '5px 4px', fontSize: 11, fontWeight: 600,
  background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 4, cursor: 'pointer',
  textAlign: 'center',
};

const obsidianBtn = {
  padding: '7px 0', fontSize: 12, fontWeight: 600,
  background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
};

const obsidianSmBtn = {
  flex: 1, padding: '4px 2px', fontSize: 10, fontWeight: 600,
  background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 4, cursor: 'pointer',
  textAlign: 'center',
};

const tinyBtn = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '1px', lineHeight: 1,
};

// ── 이메일 문의 버튼 (메일앱 / Gmail 웹 / 주소 복사) ──────────────────
function EmailContact({ address }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const subject = '[성경 마인드맵] 문의 · 기능 제안';
  const mailto  = `mailto:${address}?subject=${encodeURIComponent(subject)}`;
  const gmail   = `https://mail.google.com/mail/?view=cm&fu=1&to=${encodeURIComponent(address)}&su=${encodeURIComponent(subject)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 API 실패 시 폴백: textarea 이용
      const ta = document.createElement('textarea');
      ta.value = address;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1500); }
      finally { document.body.removeChild(ta); }
    }
  };

  const optionStyle = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 8px', fontSize: 11, textAlign: 'left',
    background: '#fff', border: 'none', borderRadius: 5,
    cursor: 'pointer', color: '#334155', width: '100%',
    textDecoration: 'none',
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 10px', width: '100%',
          background: open ? '#e0f2fe' : '#f1f5f9',
          borderRadius: 8, color: '#475569', fontSize: 11,
          border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'left',
        }}
        title="문의 · 기능 제안 (메일 앱 · Gmail · 주소 복사)"
      >
        <span>✉️</span>
        <span style={{ fontWeight: 600 }}>문의 · 기능 제안</span>
        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto', wordBreak: 'break-all' }}>{address}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, bottom: 'calc(100% + 6px)',
          minWidth: 200, padding: 6,
          background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: 8, boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column', gap: 2,
          zIndex: 100,
        }}>
          <a
            href={mailto}
            onClick={() => setOpen(false)}
            style={optionStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            <span>📧</span>
            <span style={{ fontWeight: 600 }}>메일 앱으로 작성</span>
          </a>
          <a
            href={gmail}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            style={optionStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            <span>🌐</span>
            <span style={{ fontWeight: 600 }}>Gmail 웹에서 작성</span>
          </a>
          <button
            onClick={handleCopy}
            style={optionStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            <span>{copied ? '✅' : '📋'}</span>
            <span style={{ fontWeight: 600 }}>{copied ? '주소가 복사되었습니다' : '이메일 주소 복사'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
