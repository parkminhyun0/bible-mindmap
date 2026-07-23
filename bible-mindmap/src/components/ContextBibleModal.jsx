import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import useMobile from '../hooks/useMobile';
import { OT_BOOKS, NT_BOOKS } from '../data/bibleBooks';
import { BOOK_CONTEXTS, SUPPORTED_BOOK_IDS } from '../data/bookContext';

// 책 id → 한글 약어
const KO_ABBR_BY_ID = {
  Gen:'창', Exod:'출', Lev:'레', Num:'민', Deut:'신',
  Josh:'수', Judg:'삿', Ruth:'룻',
  '1Sam':'삼상','2Sam':'삼하','1Kgs':'왕상','2Kgs':'왕하',
  '1Chr':'대상','2Chr':'대하', Ezra:'스', Neh:'느', Esth:'에',
  Job:'욥', Ps:'시', Prov:'잠', Eccl:'전', Song:'아',
  Isa:'사', Jer:'렘', Lam:'애', Ezek:'겔', Dan:'단',
  Hos:'호', Joel:'욜', Amos:'암', Obad:'옵', Jonah:'욘',
  Mic:'미', Nah:'나', Hab:'합', Zeph:'습', Hag:'학',
  Zech:'슥', Mal:'말',
  Matt:'마', Mark:'막', Luke:'눅', John:'요', Acts:'행',
  Rom:'롬','1Cor':'고전','2Cor':'고후', Gal:'갈', Eph:'엡',
  Phil:'빌', Col:'골','1Thess':'살전','2Thess':'살후',
  '1Tim':'딤전','2Tim':'딤후', Titus:'딛', Phlm:'몬', Heb:'히',
  Jas:'약','1Pet':'벧전','2Pet':'벧후',
  '1John':'요일','2John':'요이','3John':'요삼',
  Jude:'유', Rev:'계',
};

const BASE = import.meta.env.BASE_URL;

const strip = (s) => s ? s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';

// ── 분석 함수 (규칙과 신학어를 파라미터로 받음 · 책마다 다름) ─────────────
function analyzeVerse(words, discourseRules, theoTerms) {
  if (!words?.length) return { discourse: null, theoTerms: [], strongsSet: new Set(), isParaBreak: false };
  const strongsSet = new Set(words.map(w => w.s));
  // 히브리 규칙용 모폴로지 리스트 (GNT 규칙은 무시)
  const morphs = words.map(w => w.m || '').filter(Boolean);
  const discourse  = (discourseRules || []).find(r => r.match && r.match(strongsSet, morphs)) || null;
  const isParaBreak = !!discourse && ['rhetorical_q', 'major_concl', 'wayehi_setting'].includes(discourse.id);

  const seen = new Set();
  const terms = [];
  for (const w of words) {
    if (theoTerms && theoTerms[w.s] && !seen.has(w.s)) {
      terms.push({ strongs: w.s, ...theoTerms[w.s] });
      seen.add(w.s);
    }
  }
  return { discourse, theoTerms: terms, strongsSet, isParaBreak };
}

function calcChapterTheoFreq(lexData, theoTerms) {
  const freq = {};
  if (!theoTerms) return freq;
  for (const words of Object.values(lexData)) {
    if (!Array.isArray(words)) continue;
    const seen = new Set();
    for (const w of words) {
      if (theoTerms[w.s] && !seen.has(w.s)) {
        freq[w.s] = (freq[w.s] || 0) + 1;
        seen.add(w.s);
      }
    }
  }
  return freq;
}

// ── 단락 그룹화 ───────────────────────────────────────────────────────────
function buildParagraphs(krv, analyzed, discourseRules, theoTerms) {
  const paragraphs = [];
  let cur = null;

  for (const { verse } of krv) {
    const ana  = analyzed[verse];
    const isBreak = !cur || ana?.isParaBreak;
    if (isBreak) {
      if (cur) paragraphs.push(sealParagraph(cur, discourseRules, theoTerms));
      cur = { startVerse: verse, verses: [], discourseIds: [], theoCounts: {} };
    }
    cur.verses.push(verse);
    if (ana?.discourse) cur.discourseIds.push(ana.discourse.id);
    ana?.theoTerms?.forEach(t => { cur.theoCounts[t.strongs] = (cur.theoCounts[t.strongs] || 0) + 1; });
  }
  if (cur) paragraphs.push(sealParagraph(cur, discourseRules, theoTerms));
  return paragraphs;
}

function sealParagraph(p, discourseRules, theoTerms) {
  const topTheo = Object.entries(p.theoCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 2)
    .map(([s]) => theoTerms?.[s]?.ko).filter(Boolean);
  const openRule = (discourseRules || []).find(r => r.id === p.discourseIds[0]) || null;
  return { ...p, endVerse: p.verses[p.verses.length - 1], topTheo, openRule };
}

// ── Q&A 쌍 감지 ──────────────────────────────────────────────────────────
function detectQAPairs(analyzed, krv) {
  const result = {};
  const verses = krv.map(v => v.verse);

  for (let i = 0; i < verses.length; i++) {
    const v  = verses[i];
    const ss = analyzed[v]?.strongsSet;
    if (!ss) continue;

    const hasQ = ss.has('G5101') && ss.has('G3767');
    const hasA = ss.has('G3361') && ss.has('G1096');

    if (hasQ && hasA) {
      result[v] = { type: 'QA', pairedWith: null };
    } else if (hasQ) {
      const nv  = verses[i + 1];
      const nss = nv ? analyzed[nv]?.strongsSet : null;
      const nextHasA = nss?.has('G3361') && nss?.has('G1096');
      result[v] = { type: 'Q', pairedWith: nextHasA ? nv : null };
      if (nextHasA && !result[nv]) result[nv] = { type: 'A', pairedWith: v };
    } else if (hasA && !result[v]) {
      result[v] = { type: 'A', pairedWith: null };
    }
  }
  return result;
}

// 담화 들여쓰기 규칙 (강력 규칙 — 모든 책 동일 적용)
// level 1 = 종속절·설명절·목적절 (앞 주장의 부연·이유·목적)
// level 0 = 주절·선언·전환·주요 구조 마커
// ── GNT: reason(γάρ) · purpose(ἵνα) · Q&A 답변
// ── HOT: ki_reason(כִּי) · hinneh(הִנֵּה) · Q&A 답변
// ── 신규 책 추가 시: 위 id 목록에 해당 corpus 의 이유/목적 접속사 id 를 추가할 것
function buildIndentLevels(analyzed, qaPairs, krv) {
  const lv = {};
  for (const { verse } of krv) {
    const ana = analyzed[verse];
    const qa  = qaPairs[verse];
    const id  = ana?.discourse?.id;
    if (qa?.type === 'A')           lv[verse] = 1; // Q&A 답변절 (GNT·HOT 공통)
    else if (id === 'reason')       lv[verse] = 1; // GNT: γάρ — 이유·설명
    else if (id === 'ki_reason')    lv[verse] = 1; // HOT: כִּי — 이유·설명 (γάρ 대응)
    else if (id === 'purpose')      lv[verse] = 1; // GNT: ἵνα — 목적
    else if (id === 'hinneh')       lv[verse] = 1; // HOT: הִנֵּה — 주의 환기 (서사 내 부각절)
    else                             lv[verse] = 0;
  }
  return lv;
}

// ─────────────────────────────────────────────────────────────────────────
export default function ContextBibleModal({ onClose, initialRef }) {
  const isMobile = useMobile();
  // 모바일 바텀시트: 'closed' | 'peek' | 'full'
  const [sheetSnap, setSheetSnap] = useState('closed');
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [chapters, setChapters] = useState({}); // { [ch]: { krv, lex, analyzed, theoFreq, paragraphs, qaPairs, indentLevels } }
  const [loading, setLoading] = useState(true);
  const [failedChapters, setFailedChapters] = useState([]); // [{ch, err}]
  const [retrying, setRetrying] = useState(false);
  const [error, setError]     = useState('');
  const scrolledToInitial = useRef(false);
  const [activeRef, setActiveRef] = useState(() =>
    initialRef?.ch && initialRef?.verse ? initialRef : { ch: 1, verse: 1 });

  const [rightMode, setRightMode]         = useState('verse');
  const [threadStrongs, setThreadStrongs] = useState(null);
  const [threadData, setThreadData]       = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [metaOpen, setMetaOpen]           = useState(true);

  // ── 팝업 창 상태 (데스크톱 전용) ──────────────────────────────────────
  const [minimized, setMinimized] = useState(false);
  const [showOrigRef, setShowHebRef] = useState(false); // 히브리 절 번호 병기 토글
  // 개별 폰트 사이즈 (본문 / 부가 / 레전드 / 흐름 / 분석 / 배경) — 9~24 범위
  const [fontSizes, setFontSizes] = useState({
    body: 14,      // 본문 절 텍스트
    meta: 10,      // 절 번호·단락 헤더·신학어 칩·장 헤더
    legend: 9,     // 담화 레전드 (수사적 질문 등 7종 + 진술)
    flow: 9,       // 논증 흐름 미니맵 (라벨 · dot 절 번호)
    analysis: 12,  // 우측 분석 패널 (담화 카드·Q&A·핵심어)
    bg: 11,        // 배경 메타 카드·각 장 의제
  });
  const bumpFont = useCallback((key, delta) => {
    setFontSizes(prev => ({
      ...prev,
      [key]: Math.max(9, Math.min(24, prev[key] + delta)),
    }));
  }, []);

  // 활성 책 (칩으로 전환 가능) — 기본값은 로마서
  const [activeBookId, setActiveBookId] = useState('Rom');
  const activeBook = useMemo(
    () => [...OT_BOOKS, ...NT_BOOKS].find(b => b.id === activeBookId) || null,
    [activeBookId],
  );

  // 현재 책 컨텍스트 (BOOK · CHAPTERS · META · MACRO · 담화 규칙 · 신학어)
  const bookCtx = BOOK_CONTEXTS[activeBookId] || null;
  const isSupported = !!bookCtx;
  const BOOK = bookCtx?.book || { ko: activeBook?.ko || '', bollsNum: 0, lexId: null, testament: 'NT' };
  // 원어 (히/헬) 동적 라벨: hot → 히브리 · gnt → 헬라
  const origLangShort = BOOK.lexCorpus === 'hot' ? '히' : '헬';
  const origLangFull  = BOOK.lexCorpus === 'hot' ? '히브리어' : '헬라어';
  const BOOK_META = bookCtx?.meta || null;
  const MACRO_STRUCTURE = bookCtx?.macro || { sections: [], pivots: [], arcs: [] };
  const DISCOURSE_RULES = bookCtx?.discourseRules || [];
  const THEO_TERMS = bookCtx?.theoTerms || {};
  const CHAPTERS = useMemo(
    () => Array.from({ length: bookCtx?.chapters || 0 }, (_, i) => i + 1),
    [bookCtx],
  );

  // 활성 testament (구약/신약) 판별 + 그라데이션 톤
  const activeTestament = OT_BOOKS.some(b => b.id === activeBookId) ? 'OT' : 'NT';
  const activeFadeTint = BOOK_CHIP_PALETTE[activeTestament].fadeTint;

  // 칩을 chipRow 좌측으로 스무스 스크롤
  const scrollChipToLeft = useCallback((chipEl) => {
    const row = chipRowRef.current;
    if (!row || !chipEl) return;
    const rowRect = row.getBoundingClientRect();
    const chipRect = chipEl.getBoundingClientRect();
    const target = row.scrollLeft + (chipRect.left - rowRect.left) - 12;
    row.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, []);

  // 모달 열자마자 현재 성경 칩을 좌측으로 자동 스크롤
  useEffect(() => {
    if (isMobile) return;
    const t = setTimeout(() => {
      const row = chipRowRef.current;
      const active = row?.querySelector('[data-book-active="true"]');
      if (active) scrollChipToLeft(active);
    }, 180);
    return () => clearTimeout(t);
  }, [isMobile, scrollChipToLeft]);

  // 좌우 패널 스플리터 (데스크톱): 우측 패널 폭 (px)
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return { x: 40, y: 40 };
    const w = Math.min(1040, window.innerWidth - 40);
    return { x: Math.max(20, (window.innerWidth - w) / 2), y: 48 };
  });
  const [size, setSize] = useState(() => {
    if (typeof window === 'undefined') return { w: 1040, h: 640 };
    return {
      w: Math.min(1040, window.innerWidth - 40),
      h: Math.min(720, window.innerHeight - 96),
    };
  });

  const scrollRef   = useRef(null);
  const contentRef  = useRef(null);
  const chipRowRef  = useRef(null);
  const obsRef      = useRef(null);
  const [macroLayout, setMacroLayout] = useState({ height: 0, sections: [], pivots: [], arcs: [] });
  const [hoveredArc, setHoveredArc] = useState(null);
  const [hoveredPivot, setHoveredPivot] = useState(null);
  const dragging  = useRef(false);
  const resizing  = useRef(false);
  const splitDragging = useRef(false);
  const splitStart = useRef({ mx:0, w:0 });
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimer = useRef(null);
  const dragStart = useRef({ mx:0,my:0,px:0,py:0 });
  const resizeStart = useRef({ mx:0,my:0,w:0,h:0 });

  const onHeaderMouseDown = useCallback((e) => {
    if (isMobile || e.button !== 0) return;
    // 버튼 등 자식 요소 클릭은 드래그 시작 X
    if (e.target.closest('button, input')) return;
    dragging.current = true;
    dragStart.current = { mx:e.clientX, my:e.clientY, px:pos.x, py:pos.y };
    e.preventDefault();
  }, [isMobile, pos]);

  const onResizeMouseDown = useCallback((e) => {
    if (isMobile || e.button !== 0) return;
    resizing.current = true;
    resizeStart.current = { mx:e.clientX, my:e.clientY, w:size.w, h:size.h };
    e.preventDefault();
    e.stopPropagation();
  }, [isMobile, size]);

  useEffect(() => {
    if (isMobile) return;
    const onMove = (e) => {
      if (dragging.current) {
        const dx = e.clientX - dragStart.current.mx;
        const dy = e.clientY - dragStart.current.my;
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - 200, dragStart.current.px + dx)),
          y: Math.max(0, Math.min(window.innerHeight - 60, dragStart.current.py + dy)),
        });
      }
      if (resizing.current) {
        const dw = e.clientX - resizeStart.current.mx;
        const dh = e.clientY - resizeStart.current.my;
        setSize({
          w: Math.max(560, Math.min(window.innerWidth - 40, resizeStart.current.w + dw)),
          h: Math.max(320, Math.min(window.innerHeight - 40, resizeStart.current.h + dh)),
        });
      }
      if (splitDragging.current) {
        const dx = e.clientX - splitStart.current.mx;
        // 우측 패널이 커지려면 스플리터가 왼쪽으로 → dx가 음수
        setRightPanelWidth(prev => {
          const next = splitStart.current.w - dx;
          return Math.max(160, Math.min(size.w - 240, next));
        });
      }
    };
    const onUp = () => {
      dragging.current = false;
      resizing.current = false;
      splitDragging.current = false;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isMobile, size.w]);

  const onSplitMouseDown = useCallback((e) => {
    if (isMobile || e.button !== 0) return;
    splitDragging.current = true;
    splitStart.current = { mx: e.clientX, w: rightPanelWidth };
    e.preventDefault();
    e.stopPropagation();
  }, [isMobile, rightPanelWidth]);

  // ── 단일 장 로드 (bookCtx 기반) ─────────────────────────────────────────
  const loadChapter = useCallback(async (ch) => {
    const bollsNum  = bookCtx?.book?.bollsNum;
    const lexId     = bookCtx?.book?.lexId;
    const lexCorpus = bookCtx?.book?.lexCorpus || 'gnt'; // 'gnt' (헬라 NT) · 'hot' (히브리 OT)
    const rules     = bookCtx?.discourseRules || [];
    const terms     = bookCtx?.theoTerms || {};

    // 원어 lex 가 있는 책만 lex 도 병렬 로드, 없으면 KRV 만
    const krvPromise = fetch(`https://bolls.life/get-text/KRV/${bollsNum}/${ch}/`).then(r => {
      if (!r.ok) throw new Error(`KRV ${ch}장 HTTP ${r.status}`);
      return r.json();
    });
    // lex 파일이 404 등으로 누락된 경우 → 빈 객체로 fallback (KRV 만으로 표시)
    // 이렇게 하면 데이터셋 결함으로 전체 로드가 실패하지 않음
    const lexPromise = lexId
      ? fetch(`${BASE}data/lex/${lexCorpus}/${lexId}/${ch}.json`)
          .then(r => {
            if (!r.ok) {
              console.warn(`[문맥 성경] lex 누락: ${lexCorpus}/${lexId}/${ch}.json (HTTP ${r.status}) — KRV 만으로 표시`);
              return {}; // fallback
            }
            return r.json();
          })
          .catch(e => {
            console.warn(`[문맥 성경] lex fetch 오류: ${lexCorpus}/${lexId}/${ch}.json`, e);
            return {};
          })
      : Promise.resolve({});

    const [krvRaw, lexData] = await Promise.all([krvPromise, lexPromise]);
    const krv = krvRaw.map(v => ({ verse: Number(v.verse), text: strip(v.text) }));
    // _hebRefs 는 절 데이터가 아닌 히브리↔영어 절 번호 매핑 (별도 저장)
    const hebRefs = lexData._hebRefs || {};
    const analyzed = {};
    for (const [v, words] of Object.entries(lexData)) {
      if (v.startsWith('_')) continue; // meta 필드 스킵
      analyzed[Number(v)] = analyzeVerse(words, rules, terms);
    }
    // 절 하나도 분석 못 하는 경우(=lex 없는 책)에도 KRV 만으로 절 데이터 채움
    if (!Object.keys(analyzed).length) {
      for (const { verse } of krv) analyzed[verse] = { discourse: null, theoTerms: [], strongsSet: new Set(), isParaBreak: false };
    }
    // 수동 담화 주석 (히브리어 서사 등 lex 자동 감지 불가한 책) 오버레이
    const manual = bookCtx?.manualDiscourse || {};
    const paraBreakIds = new Set([
      // 히브리 서사
      'setting', 'wayehi_setting', 'commitment', 'fulfillment', 'genealogy',
      // 로마서 구조
      'thesis', 'justification', 'climax', 'doxology', 'praxis',
      // 창세기 구조
      'creation', 'protoevangelium', 'toledot', 'covenant_call',
      'faith_reckoned', 'aqedah', 'israel_name', 'divine_providence',
    ]);
    for (const [key, ruleId] of Object.entries(manual)) {
      const [c, v] = key.split(':').map(Number);
      if (c !== ch) continue;
      const rule = rules.find(r => r.id === ruleId);
      if (!rule) continue;
      analyzed[v] = analyzed[v] || { discourse: null, theoTerms: [], strongsSet: new Set(), isParaBreak: false };
      analyzed[v].discourse = rule;
      analyzed[v].isParaBreak = paraBreakIds.has(ruleId);
    }
    const theoFreq     = calcChapterTheoFreq(lexData, terms);
    const paragraphs   = buildParagraphs(krv, analyzed, rules, terms);
    const qaPairs      = detectQAPairs(analyzed, krv);
    const indentLevels = buildIndentLevels(analyzed, qaPairs, krv);
    return { krv, lex: lexData, analyzed, theoFreq, paragraphs, qaPairs, indentLevels, hebRefs };
  }, [bookCtx]);

  // 책 전환 시 activeRef 를 1:1 로 리셋 + 스크롤 최상단
  const prevBookIdRef = useRef(activeBookId);
  useEffect(() => {
    if (prevBookIdRef.current !== activeBookId) {
      prevBookIdRef.current = activeBookId;
      setActiveRef({ ch: 1, verse: 1 });
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [activeBookId]);

  // ── 활성 책 전체 로드 (배치 · 스트리밍 · 자동 재시도) ─────────────────
  useEffect(() => {
    if (!isSupported || CHAPTERS.length === 0) {
      setLoading(false);
      setChapters({});
      return;
    }
    let cancelled = false;
    setLoading(true); setError(''); setFailedChapters([]); setChapters({});

    // 배치 크기 · rate limit / 브라우저 커넥션 한도 고려
    const INITIAL_BATCH = 6;

    const runBatch = async (chs) => {
      const results = await Promise.allSettled(
        chs.map(ch => loadChapter(ch).then(v => [ch, v]))
      );
      return results.map((r, i) => ({
        ch: chs[i],
        ok: r.status === 'fulfilled',
        value: r.status === 'fulfilled' ? r.value : null,
        err: r.status === 'rejected' ? (r.reason?.message || '로드 실패') : null,
      }));
    };

    const runAll = async () => {
      let failedChs = [];

      // ── 1차 로드 (배치 6개씩 순차) ──
      for (let i = 0; i < CHAPTERS.length; i += INITIAL_BATCH) {
        if (cancelled) return;
        const batch = CHAPTERS.slice(i, i + INITIAL_BATCH);
        const outcomes = await runBatch(batch);
        if (cancelled) return;
        const partial = {};
        outcomes.forEach(o => {
          if (o.ok) { const [ch, v] = o.value; partial[ch] = v; }
          else failedChs.push(o.ch);
        });
        // 스트리밍 — 사용자는 로드되는 대로 본문을 볼 수 있음
        if (Object.keys(partial).length > 0) {
          setChapters(prev => ({ ...prev, ...partial }));
        }
      }

      // ── 재시도 3단계: exponential backoff + 점점 작은 배치 ──
      // attempt 0: 500ms 대기 · batch 4
      // attempt 1: 1200ms 대기 · batch 2
      // attempt 2: 2500ms 대기 · batch 1 (순차 · 각 절 간 300ms)
      const retryPlans = [
        { delay: 500,  batch: 4, gap: 0 },
        { delay: 1200, batch: 2, gap: 100 },
        { delay: 2500, batch: 1, gap: 300 },
      ];

      for (let attempt = 0; attempt < retryPlans.length && failedChs.length > 0; attempt++) {
        if (cancelled) return;
        const { delay, batch: batchSize, gap } = retryPlans[attempt];
        await new Promise(r => setTimeout(r, delay));
        if (cancelled) return;

        const retryList = failedChs;
        failedChs = [];
        for (let i = 0; i < retryList.length; i += batchSize) {
          if (cancelled) return;
          const batch = retryList.slice(i, i + batchSize);
          const outcomes = await runBatch(batch);
          if (cancelled) return;
          const partial = {};
          outcomes.forEach(o => {
            if (o.ok) { const [ch, v] = o.value; partial[ch] = v; }
            else failedChs.push(o.ch);
          });
          if (Object.keys(partial).length > 0) {
            setChapters(prev => ({ ...prev, ...partial }));
          }
          // 배치 간 gap (마지막 재시도만 활성 · 순차 로드)
          if (gap > 0 && i + batchSize < retryList.length) {
            await new Promise(r => setTimeout(r, gap));
          }
        }
      }

      if (cancelled) return;
      const finalFailed = failedChs.map(ch => ({ ch, err: '로드 실패' }));
      setFailedChapters(finalFailed);
      setLoading(false);
    };

    runAll();
    return () => { cancelled = true; };
  }, [loadChapter, isSupported, CHAPTERS]);

  // ── 실패 챕터 재시도 ──────────────────────────────────────────────────────
  const retryFailed = useCallback(async () => {
    if (!failedChapters.length || retrying) return;
    setRetrying(true);
    const BATCH_SIZE = 6;
    const chs = failedChapters.map(f => f.ch);
    const stillFailed = [];
    const newOk = {};

    for (let i = 0; i < chs.length; i += BATCH_SIZE) {
      const batch = chs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(ch => loadChapter(ch).then(v => [ch, v]))
      );
      const partial = {};
      results.forEach((r, j) => {
        if (r.status === 'fulfilled') {
          const [ch, v] = r.value;
          newOk[ch] = v;
          partial[ch] = v;
        } else {
          stillFailed.push({ ch: batch[j], err: r.reason?.message || '로드 실패' });
        }
      });
      // 스트리밍: 배치가 성공하는 대로 즉시 반영
      if (Object.keys(partial).length > 0) {
        setChapters(prev => ({ ...prev, ...partial }));
      }
    }

    setFailedChapters(stillFailed);
    if (Object.keys(newOk).length > 0) setError('');
    setRetrying(false);
  }, [failedChapters, retrying, loadChapter]);

  const loadedCount = Object.keys(chapters).length;
  const chReady   = !loading && loadedCount > 0;
  const activeCh  = chapters[activeRef.ch];
  const activeKrv = activeCh?.krv || [];
  const activeAna = activeCh?.analyzed?.[activeRef.verse] || { discourse: null, theoTerms: [] };
  const activeData = activeKrv.find(v => v.verse === activeRef.verse);
  const activeQaPairs = activeCh?.qaPairs || {};
  const activeTheoFreq = activeCh?.theoFreq || {};

  // ── Intersection Observer (전체 스크롤 컨테이너 관찰) ──────────────────
  useEffect(() => {
    if (!scrollRef.current || !chReady) return;
    obsRef.current?.disconnect();
    const io = new IntersectionObserver(entries => {
      // 프로그래매틱 스크롤 중이면 IO 무시 (방향키 왕복 버그 방지)
      if (programmaticScrollRef.current) return;
      let best = null, bestRatio = 0;
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio > bestRatio) {
          bestRatio = e.intersectionRatio;
          best = { ch: Number(e.target.dataset.ch), verse: Number(e.target.dataset.verse) };
        }
      });
      if (best) setActiveRef(best);
    }, { root: scrollRef.current, threshold: [0.3, 0.6] });
    scrollRef.current.querySelectorAll('[data-verse]').forEach(el => io.observe(el));
    obsRef.current = io;
    return () => io.disconnect();
  }, [chReady]);

  // ── initialRef 로 자동 스크롤 (챕터 로드 완료 후 한 번만) ─────────────
  useEffect(() => {
    if (!chReady || scrolledToInitial.current) return;
    if (!initialRef?.ch || !initialRef?.verse) {
      scrolledToInitial.current = true;
      return;
    }
    // 해당 챕터가 로드됐는지 확인
    if (!chapters[initialRef.ch]) return;
    scrolledToInitial.current = true;
    requestAnimationFrame(() => {
      scrollRef.current
        ?.querySelector(`[data-ch="${initialRef.ch}"][data-verse="${initialRef.verse}"]`)
        ?.scrollIntoView({ behavior: 'auto', block: 'center' });
    });
  }, [chReady, chapters, initialRef]);

  // ── 거시구조 레이아웃 측정 ────────────────────────────────────────────
  useEffect(() => {
    if (isMobile || !chReady || !contentRef.current) return;
    let raf = 0;
    const measure = () => {
      const content = contentRef.current;
      if (!content) return;
      const contentTop = content.offsetTop; // scrollRef 기준
      const totalHeight = content.offsetHeight;

      // 각 pivot 의 y 좌표 + 절 행의 top/bottom (tooltip이 행 밖에 배치되도록)
      const pivots = MACRO_STRUCTURE.pivots.map(p => {
        const el = content.querySelector(`[data-ch="${p.ch}"][data-verse="${p.verse}"]`);
        if (!el) return null;
        const y = contentTop + el.offsetTop + el.offsetHeight / 2;
        const yTop = contentTop + el.offsetTop;
        const yBottom = contentTop + el.offsetTop + el.offsetHeight;
        return { ...p, y, yTop, yBottom };
      }).filter(Boolean);

      // 섹션 밴드 (챕터의 첫절 → 마지막 챕터의 마지막 절)
      const sections = MACRO_STRUCTURE.sections.map(s => {
        const startEl = content.querySelector(`[data-ch="${s.fromCh}"][data-verse="1"]`);
        const endCh = chapters[s.toCh];
        const endVerse = endCh?.krv?.[endCh.krv.length - 1]?.verse;
        const endEl = endVerse
          ? content.querySelector(`[data-ch="${s.toCh}"][data-verse="${endVerse}"]`)
          : null;
        if (!startEl || !endEl) return null;
        return {
          ...s,
          y1: contentTop + startEl.offsetTop,
          y2: contentTop + endEl.offsetTop + endEl.offsetHeight,
        };
      }).filter(Boolean);

      // arc 는 pivots 기준으로 y 좌표 조립
      const pivotById = Object.fromEntries(pivots.map(p => [p.id, p]));
      const arcs = MACRO_STRUCTURE.arcs.map(a => {
        const f = pivotById[a.from];
        const t = pivotById[a.to];
        if (!f || !t) return null;
        return { ...a, y1: f.y, y2: t.y };
      }).filter(Boolean);

      setMacroLayout({ height: contentTop + totalHeight, sections, pivots, arcs });
    };
    raf = requestAnimationFrame(() => requestAnimationFrame(measure));

    // 폰트/리사이즈 시 재측정
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => requestAnimationFrame(measure));
    });
    ro.observe(contentRef.current);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [isMobile, chReady, chapters, fontSizes, MACRO_STRUCTURE]);

  const scrollTo = useCallback((ch, verse) => {
    // IO 잠금 시작 — 스크롤 정착 후 해제
    programmaticScrollRef.current = true;
    clearTimeout(programmaticScrollTimer.current);
    setActiveRef({ ch, verse });
    requestAnimationFrame(() => {
      scrollRef.current
        ?.querySelector(`[data-ch="${ch}"][data-verse="${verse}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    programmaticScrollTimer.current = setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 600);
  }, []);

  // ── 방향키 절 이동 (chapters 미로드여도 폴백으로 동작) ─────────────────
  const moveVerse = useCallback((delta) => {
    const { ch, verse } = activeRef;
    const chData = chapters[ch];
    // 폴백: 데이터 없으면 절 번호만 증감 (다음 렌더에서 자연스레 스크롤됨)
    if (!chData) {
      const nextVerse = verse + delta;
      if (nextVerse >= 1) setActiveRef({ ch, verse: nextVerse });
      return;
    }
    const verses = chData.krv.map(v => v.verse);
    const idx = verses.indexOf(verse);
    // activeRef.verse 가 목록에 없으면 인접 값으로 보정
    if (idx < 0) {
      const target = delta > 0
        ? verses.find(v => v > verse) ?? verses[verses.length - 1]
        : [...verses].reverse().find(v => v < verse) ?? verses[0];
      scrollTo(ch, target);
      return;
    }
    const nextIdx = idx + delta;
    if (nextIdx >= 0 && nextIdx < verses.length) {
      scrollTo(ch, verses[nextIdx]);
      return;
    }
    if (nextIdx < 0 && ch > 1) {
      for (let c = ch - 1; c >= 1; c--) {
        const prev = chapters[c];
        if (prev?.krv?.length) {
          scrollTo(c, prev.krv[prev.krv.length - 1].verse);
          return;
        }
      }
    } else if (nextIdx >= verses.length && ch < 16) {
      for (let c = ch + 1; c <= 16; c++) {
        const next = chapters[c];
        if (next?.krv?.length) {
          scrollTo(c, next.krv[0].verse);
          return;
        }
      }
    }
  }, [activeRef, chapters, scrollTo]);

  const moveChapter = useCallback((delta) => {
    const target = activeRef.ch + delta;
    if (target < 1 || target > 16) return;
    if (!chapters[target]) return;
    scrollTo(target, 1);
  }, [activeRef.ch, chapters, scrollTo]);

  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') { onClose(); return; }
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        moveVerse(e.key === 'ArrowDown' ? 1 : -1);
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !isMobile) {
        e.preventDefault();
        moveChapter(e.key === 'ArrowRight' ? 1 : -1);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, moveVerse, moveChapter, isMobile]);

  // ── 핵심어 종단 추적 ─────────────────────────────────────────────────────
  const startThread = useCallback((strongs) => {
    setThreadStrongs(strongs);
    setRightMode('thread');
    setThreadLoading(true);

    const refs = [];
    for (const ch of CHAPTERS) {
      const chData = chapters[ch];
      if (!chData) continue;
      for (const [v, words] of Object.entries(chData.lex)) {
        if (!Array.isArray(words) || !words.some(w => w.s === strongs)) continue;
        const verseNum  = Number(v);
        const text      = chData.krv.find(r => r.verse === verseNum)?.text || null;
        const discourse = analyzeVerse(words, DISCOURSE_RULES, THEO_TERMS).discourse;
        refs.push({ ch, verse: verseNum, text, discourse });
      }
    }
    setThreadData(refs);
    setThreadLoading(false);
  }, [chapters, CHAPTERS, DISCOURSE_RULES, THEO_TERMS]);

  const goToThreadRef = useCallback((ch, verse) => {
    setRightMode('verse');
    scrollTo(ch, verse);
  }, [scrollTo]);

  // 현재 장의 논증 흐름 미니맵
  const flowMap = useMemo(() => {
    if (!activeCh) return [];
    return activeCh.krv.map(v => ({
      verse: v.verse,
      discourse: activeCh.analyzed[v.verse]?.discourse || null,
      isActive: v.verse === activeRef.verse,
    }));
  }, [activeCh, activeRef.verse]);

  // 데스크톱 폰트 사이즈 별칭 (모바일은 원본 크기 유지)
  const A = fontSizes.analysis;

  // ── 렌더 ──────────────────────────────────────────────────────────────
  const modalInner = (
      <div
        style={{ background:'#ffffff',
          borderRadius: isMobile ? 0 : 12,
          border: isMobile ? 'none' : '1px solid rgba(15,23,42,.1)',
          width: isMobile ? '100%' : size.w,
          maxWidth: isMobile ? '100%' : 'none',
          height: isMobile ? '100dvh' : (minimized ? 'auto' : size.h),
          display:'flex',flexDirection:'column',
          overflow:'hidden',
          boxShadow: isMobile ? 'none' : '0 20px 60px rgba(15,23,42,.28), 0 4px 16px rgba(15,23,42,.14)',
          position:'relative',
          userSelect: dragging.current ? 'none' : 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── 헤더 (데스크톱: 드래그 핸들) ── */}
        <div
          onMouseDown={onHeaderMouseDown}
          style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
            padding: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 10px) 14px 10px' : '9px 12px 9px 16px',
            borderBottom:'1px solid rgba(255,255,255,.15)',flexShrink:0,gap:8,
            background: isMobile ? '#ffffff'
              : 'linear-gradient(135deg, #b45309, #d97706)',
            borderRadius: isMobile ? 0 : (minimized ? 12 : '12px 12px 0 0'),
            cursor: isMobile ? 'default' : 'grab',
            userSelect:'none' }}>
          <div style={{ display:'flex',alignItems:'center',gap: isMobile?8:10,minWidth:0,flex:1 }}>
            {isMobile ? (
              <>
                <button
                  onClick={() => setChapterPickerOpen(true)}
                  style={{ display:'flex',alignItems:'center',gap:6,
                    background:'linear-gradient(135deg, rgba(217,119,6,.14), rgba(251,191,36,.08))',
                    border:'1px solid rgba(217,119,6,.28)',
                    borderRadius:10,padding:'6px 12px',cursor:'pointer',minHeight:36 }}>
                  <span style={{ fontSize:11,fontWeight:700,color:'#b45309',letterSpacing:'.08em' }}>롬</span>
                  <span style={{ fontSize:16,fontWeight:800,color:'#0f172a',lineHeight:1 }}>
                    {activeRef.ch}
                  </span>
                  <span style={{ fontSize:11,color:'#64748b',fontWeight:600 }}>:{activeRef.verse}</span>
                  <span style={{ fontSize:10,color:'#94a3b8',marginLeft:2 }}>▾</span>
                </button>
                <span style={{
                  fontSize:8, fontWeight:800, color:'#b45309',
                  background:'rgba(251,191,36,.18)',
                  border:'1px solid rgba(217,119,6,.35)',
                  borderRadius:4, padding:'2px 5px',
                  letterSpacing:'.06em', flexShrink:0,
                  fontFamily:"'Menlo','Monaco',monospace" }}>
                  TEST 0.1
                </span>
              </>
            ) : (
              <>
                <span style={{ fontSize:20,flexShrink:0 }}>📖</span>
                <span style={{ fontSize:17,fontWeight:800,color:'#fff',flexShrink:0,letterSpacing:'.02em' }}>
                  문맥 성경
                </span>
                <span style={{
                  fontSize:11, fontWeight:800, color:'#fbbf24',
                  background:'rgba(0,0,0,.32)',
                  border:'1px solid rgba(251,191,36,.45)',
                  borderRadius:5, padding:'3px 8px',
                  letterSpacing:'.06em', flexShrink:0,
                  fontFamily:"'Menlo','Monaco',monospace" }}>
                  TEST VER 0.1
                </span>
              </>
            )}
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:2,flexShrink:0 }}>
            {isMobile && (
              <button onClick={() => setLegendOpen(v => !v)}
                title="담화 범례"
                style={{ background:'none',border:'none',
                  color: legendOpen ? '#d97706' : '#94a3b8',
                  fontSize:18,cursor:'pointer',padding:'6px 8px',borderRadius:8,
                  minWidth:36,minHeight:36 }}>ⓘ</button>
            )}
            {!isMobile && (
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setShowHebRef(v => !v)}
                title={showOrigRef ? `${origLangFull} 원문 절 번호 숨기기` : `${origLangFull} 원문 절 번호 병기 (KRV/영어와 다른 절만)`}
                style={{
                  ...popupIconBtn,
                  minWidth: 32,
                  padding: '0 8px',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '.05em',
                  background: showOrigRef ? 'rgba(251,191,36,.28)' : 'rgba(255,255,255,.15)',
                  border: showOrigRef ? '1px solid rgba(251,191,36,.55)' : 'none',
                  color: showOrigRef ? '#fbbf24' : '#fff',
                }}>{origLangShort}</button>
            )}
            {!isMobile && (
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setMinimized(v => !v)}
                title={minimized ? '펼치기' : '최소화'}
                style={popupIconBtn}>{minimized ? '▲' : '▼'}</button>
            )}
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={onClose}
              title="닫기"
              style={{ ...(isMobile ? {
                background:'none',border:'none',color:'#94a3b8',
                fontSize:22,cursor:'pointer',padding:'4px 8px',borderRadius:8,
                minWidth:36,minHeight:36
              } : { ...popupIconBtn, background:'rgba(239,68,68,.35)' })}}>✕</button>
          </div>
        </div>

        {!minimized && (<>
        {/* ── 담화 레전드 (모바일은 접힘 가능) — 우측에 폰트 조절 컨트롤 ── */}
        {(!isMobile || legendOpen) && (
          <div style={{ display:'flex',alignItems:'center',
            gap: isMobile?10:10,
            flexWrap: isMobile?'nowrap':'wrap',
            overflowX: isMobile?'auto':'visible',
            padding: isMobile?'8px 14px':'6px 16px 6px 22px',
            borderBottom:'1px solid rgba(15,23,42,.06)',
            flexShrink:0,background:'rgba(15,23,42,.02)' }}>
            {DISCOURSE_RULES.map(r => (
              <span key={r.id} style={{ fontSize: isMobile?10:fontSizes.legend,color:r.color,fontWeight:800,
                display:'flex',alignItems:'center',gap:4,flexShrink:0 }}>
                <span style={{ width: isMobile?6:5,height: isMobile?6:5,borderRadius:'50%',background:r.color,
                  flexShrink:0,display:'inline-block' }} />
                {r.role}
              </span>
            ))}
            {/* 회색 dot: 담화어 없는 절 (진술) */}
            <span style={{ fontSize: isMobile?10:fontSizes.legend,color:'#64748b',fontWeight:800,
              display:'flex',alignItems:'center',gap:4,flexShrink:0 }}
              title="담화 접속사 없이 서술하는 절">
              <span style={{ width: isMobile?6:5,height: isMobile?6:5,borderRadius:'50%',
                background:'rgba(148,163,184,.7)',
                flexShrink:0,display:'inline-block' }} />
              진술
            </span>
            {/* 폰트 조절 컨트롤 (데스크톱만) — modern segmented steppers */}
            {!isMobile && (
              <div style={fontPanelWrapper}>
                <div style={fontPanelBrand}>
                  <span style={{
                    fontSize: 14, fontWeight: 800, color: '#8A6027',
                    letterSpacing: '-.02em', lineHeight: 1,
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  }}>Aa</span>
                  <div style={{ width:1, height:14, background:'rgba(212,153,79,.4)' }} />
                </div>
                {[
                  { key:'body',     label:'본문' },
                  { key:'meta',     label:'부가' },
                  { key:'legend',   label:'레전드' },
                  { key:'flow',     label:'흐름' },
                  { key:'analysis', label:'분석' },
                  { key:'bg',       label:'배경' },
                ].map(g => (
                  <div key={g.key} style={fontStepper}>
                    <span style={fontStepperLabel}>{g.label}</span>
                    <div style={fontStepperInner}>
                      <button
                        onClick={() => bumpFont(g.key, -1)}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(212,153,79,.22)';
                          e.currentTarget.style.color = '#4A3210';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#8A6027';
                        }}
                        title={`${g.label} 작게`}
                        style={stepBtn}>−</button>
                      <span style={stepValue}>{fontSizes[g.key]}</span>
                      <button
                        onClick={() => bumpFont(g.key, 1)}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(212,153,79,.22)';
                          e.currentTarget.style.color = '#4A3210';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#8A6027';
                        }}
                        title={`${g.label} 크게`}
                        style={stepBtn}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 논증 흐름 미니맵 (데스크톱만, Rom 전용) ── */}
        {isSupported && !isMobile && chReady && flowMap.length > 0 && (
          <div style={{ display:'flex',alignItems:'center',gap:3,
            padding: isMobile?'5px 14px':'6px 22px',
            overflowX:'auto',borderBottom:'1px solid rgba(15,23,42,.05)',
            flexShrink:0,background:'rgba(15,23,42,.03)' }}>
            <span style={{ fontSize: fontSizes.flow,color:'#64748b',fontWeight:700,flexShrink:0,marginRight:4 }}>
              {activeRef.ch}장 흐름
            </span>
            {flowMap.map(({ verse, discourse: d, isActive }) => {
              const dotSize = isActive ? Math.max(18, fontSizes.flow * 2 + 2) : Math.max(9, fontSizes.flow + 1);
              return (
                <div key={verse}
                  onClick={() => scrollTo(activeRef.ch, verse)}
                  title={`${activeRef.ch}:${verse}${d ? ` · ${d.role}` : ' · 진술'}`}
                  style={{ width:dotSize,height:dotSize,borderRadius:'50%',
                    background: d ? d.color : 'rgba(148,163,184,.7)',
                    border: isActive ? `2px solid ${d?.color||'#475569'}` : 'none',
                    boxShadow: isActive ? `0 0 8px ${d?.color||'#475569'}80` : 'none',
                    cursor:'pointer',flexShrink:0,transition:'all .15s',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize: fontSizes.flow - 1,color:'#fff',fontWeight:700 }}>
                  {isActive && <span>{verse}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── 성경 66권 라벨링 칩 (다이어리 인덱스 스타일) ── */}
        {!isMobile && (
          <div
            ref={chipRowRef}
            style={{
              padding:'14px 20px 0',
              background:`linear-gradient(180deg, rgba(255,255,255,0) 0%, ${activeFadeTint} 100%)`,
              flexShrink:0,
              overflowX:'auto',
              overflowY:'hidden',
              position:'relative',
            }}>
            <div style={{
              display:'flex',
              alignItems:'flex-end',
              gap:3,
              minWidth:'max-content',
              paddingTop:6,
              paddingBottom:2,
            }}>
              {/* 구약 뱃지 */}
              {(() => { const p = BOOK_CHIP_PALETTE.OT; return (
                <span style={{
                  padding:'4px 9px',
                  background:p.tabBg,
                  color:p.tabText,
                  border:`1px solid ${p.tabBorder}`,
                  borderRadius:5,
                  fontSize:10, fontWeight:800, letterSpacing:'.1em',
                  fontFamily:"'Inter','Pretendard',sans-serif",
                  flexShrink:0,
                  marginRight:8,
                  userSelect:'none',
                }}>{p.label}</span>
              );})()}

              {OT_BOOKS.map(b => {
                const abbr = KO_ABBR_BY_ID[b.id] || b.ko.slice(0,1);
                const isActive = b.id === activeBookId;
                const isDone = SUPPORTED_BOOK_IDS.includes(b.id);
                const p = BOOK_CHIP_PALETTE.OT;
                return (
                  <div key={b.id}
                    data-book-active={isActive ? 'true' : 'false'}
                    title={`${b.ko} (${b.en}) · ${b.chapters}장${isDone ? ' · ✅ 완성' : ''}`}
                    onClick={(e) => { setActiveBookId(b.id); scrollChipToLeft(e.currentTarget); }}
                    style={bookChipStyle(isActive, 'OT')}
                    onMouseEnter={e => {
                      if (isActive) return;
                      e.currentTarget.style.background = p.hoverBg;
                      e.currentTarget.style.color = p.hoverText;
                      e.currentTarget.style.borderColor = p.hoverBorder;
                    }}
                    onMouseLeave={e => {
                      if (isActive) return;
                      e.currentTarget.style.background = p.baseBg;
                      e.currentTarget.style.color = p.baseText;
                      e.currentTarget.style.borderColor = p.baseBorder;
                    }}
                  >
                    {abbr}
                    {isDone && <span style={completedDotStyle} />}
                  </div>
                );
              })}

              <span style={{ width:18, flexShrink:0 }} />

              {/* 신약 뱃지 */}
              {(() => { const p = BOOK_CHIP_PALETTE.NT; return (
                <span style={{
                  padding:'4px 9px',
                  background:p.tabBg,
                  color:p.tabText,
                  border:`1px solid ${p.tabBorder}`,
                  borderRadius:5,
                  fontSize:10, fontWeight:800, letterSpacing:'.1em',
                  fontFamily:"'Inter','Pretendard',sans-serif",
                  flexShrink:0,
                  marginRight:8,
                  userSelect:'none',
                }}>{p.label}</span>
              );})()}

              {NT_BOOKS.map(b => {
                const abbr = KO_ABBR_BY_ID[b.id] || b.ko.slice(0,1);
                const isActive = b.id === activeBookId;
                const isDone = SUPPORTED_BOOK_IDS.includes(b.id);
                const p = BOOK_CHIP_PALETTE.NT;
                return (
                  <div key={b.id}
                    data-book-active={isActive ? 'true' : 'false'}
                    title={`${b.ko} (${b.en}) · ${b.chapters}장${isDone ? ' · ✅ 완성' : ''}`}
                    onClick={(e) => { setActiveBookId(b.id); scrollChipToLeft(e.currentTarget); }}
                    style={bookChipStyle(isActive, 'NT')}
                    onMouseEnter={e => {
                      if (isActive) return;
                      e.currentTarget.style.background = p.hoverBg;
                      e.currentTarget.style.color = p.hoverText;
                      e.currentTarget.style.borderColor = p.hoverBorder;
                    }}
                    onMouseLeave={e => {
                      if (isActive) return;
                      e.currentTarget.style.background = p.baseBg;
                      e.currentTarget.style.color = p.baseText;
                      e.currentTarget.style.borderColor = p.baseBorder;
                    }}
                  >
                    {abbr}
                    {isDone && <span style={completedDotStyle} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 장 네비게이션 (데스크톱, 흐름 아래, Rom 전용) ── */}
        {isSupported && !isMobile && chReady && (
          <div style={{
            display:'flex', alignItems:'center', gap:4,
            padding:'8px 22px',
            overflowX:'auto',
            borderBottom:'1px solid rgba(15,23,42,.05)',
            flexShrink:0,
            background:`linear-gradient(180deg, ${activeFadeTint} 0%, rgba(15,23,42,.015) 65%)`,
          }}>
            <span style={{
              fontSize:10, fontWeight:700, color:'#64748b',
              flexShrink:0, marginRight:8,
              letterSpacing:'.06em',
              textTransform:'uppercase',
              fontFamily:"'Inter', -apple-system, sans-serif",
            }}>Jump</span>
            {CHAPTERS.map(ch => {
              const isActive = ch === activeRef.ch;
              const isFailed = !chapters[ch];
              return (
                <button
                  key={ch}
                  disabled={isFailed}
                  onClick={() => scrollTo(ch, 1)}
                  onMouseEnter={e => {
                    if (isActive || isFailed) return;
                    e.currentTarget.style.background = 'rgba(217,119,6,.09)';
                    e.currentTarget.style.color = '#b45309';
                    e.currentTarget.style.borderColor = 'rgba(217,119,6,.25)';
                  }}
                  onMouseLeave={e => {
                    if (isActive || isFailed) return;
                    e.currentTarget.style.background = 'rgba(255,255,255,.6)';
                    e.currentTarget.style.color = '#334155';
                    e.currentTarget.style.borderColor = 'rgba(15,23,42,.08)';
                  }}
                  title={isFailed ? `${ch}장 로드 실패` : `${ch}장으로 이동`}
                  style={{
                    padding:'3px 9px',
                    minWidth:30,
                    border: `1px solid ${
                      isActive ? 'transparent'
                      : isFailed ? 'rgba(220,38,38,.2)'
                      : 'rgba(15,23,42,.08)'
                    }`,
                    borderRadius:6,
                    background: isActive
                      ? 'linear-gradient(135deg, #d97706, #f59e0b)'
                      : isFailed
                        ? 'rgba(220,38,38,.06)'
                        : 'rgba(255,255,255,.6)',
                    color: isActive
                      ? '#fff'
                      : isFailed
                        ? '#dc2626'
                        : '#334155',
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 600,
                    lineHeight: 1.4,
                    fontFamily: "'SF Mono', 'JetBrains Mono', 'Menlo', ui-monospace, monospace",
                    fontVariantNumeric: 'tabular-nums',
                    cursor: isFailed ? 'not-allowed' : 'pointer',
                    opacity: isFailed ? 0.55 : 1,
                    transition: 'background .12s, color .12s, border-color .12s, box-shadow .12s',
                    flexShrink:0,
                    boxShadow: isActive ? '0 1px 4px rgba(217,119,6,.35)' : 'none',
                    WebkitBackdropFilter: isActive ? 'none' : 'blur(4px)',
                    backdropFilter: isActive ? 'none' : 'blur(4px)',
                  }}
                >{ch}</button>
              );
            })}
          </div>
        )}

        {/* ── 바디 (Rom 전용 · 다른 책은 placeholder) ── */}
        {isSupported && (
        <div style={{ display:'flex',flex:1,overflow:'hidden',position:'relative' }}>

          {/* 좌: 전체 본문 (연속 스크롤 + 좌측 거시구조 거터) */}
          <div ref={scrollRef} style={{ flex:1,minWidth:0,overflowY:'auto',
            padding: isMobile?'8px 10px':0,
            position:'relative' }}>

            {loading && (
              <div style={{ color:'#64748b',textAlign:'center',marginTop:60,fontSize:13,lineHeight:1.6 }}>
                지금 성경 본문을 빠르게 불러오고 있습니다.<br/>
                조금만 기다려주세요~ ^^
              </div>
            )}
            {error && (
              <div style={{ color:'#dc2626',textAlign:'center',marginTop:60,fontSize:13 }}>
                {error}
                <div style={{ marginTop:10 }}>
                  <button onClick={retryFailed} disabled={retrying}
                    style={{ padding:'6px 14px',fontSize:12,fontWeight:700,
                      background:'#dc2626',color:'#fff',border:'none',
                      borderRadius:6,cursor: retrying?'default':'pointer',
                      opacity: retrying?0.6:1 }}>
                    {retrying ? '재시도 중…' : '↻ 재시도'}
                  </button>
                </div>
              </div>
            )}

            {chReady && failedChapters.length > 0 && (
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
                gap:8,margin: isMobile?'0 0 10px':'10px 12px 10px 108px',
                padding:'8px 12px',
                background:'rgba(220,38,38,.08)',border:'1px solid rgba(220,38,38,.25)',
                borderRadius:8,fontSize:12,color:'#991b1b' }}>
                <span>
                  ⚠ {failedChapters.length}개 장 로드 실패
                  <span style={{ marginLeft:6,color:'#94a3b8',fontWeight:400 }}>
                    ({failedChapters.map(f => f.ch).join(', ')}장)
                  </span>
                </span>
                <button onClick={retryFailed} disabled={retrying}
                  style={{ padding:'4px 10px',fontSize:11,fontWeight:700,
                    background:'#dc2626',color:'#fff',border:'none',
                    borderRadius:5,cursor: retrying?'default':'pointer',
                    opacity: retrying?0.6:1,flexShrink:0 }}>
                  {retrying ? '재시도 중…' : '↻ 재시도'}
                </button>
              </div>
            )}

            {/* 본문 콘텐츠 컬럼 + 좌측 거시구조 거터 (플렉스 행) */}
            {chReady && (
              <div style={{ display:'flex', alignItems:'stretch', position:'relative' }}>

                {/* ── 좌측 거시구조 거터 (데스크톱 전용, 116px) ── */}
                {!isMobile && (
                  <div style={{ width:116, flexShrink:0, position:'relative' }}>

                    {/* SVG 오버레이: 섹션 밴드 · 스파인 · arc · pivot dot */}
                    {macroLayout.height > 0 && (
                      <svg
                        width={116}
                        height={macroLayout.height}
                        style={{ position:'absolute', top:0, left:0,
                          overflow:'visible', display:'block',
                          pointerEvents:'none' }}>
                        <defs>
                          {macroLayout.sections.map(s => (
                            <linearGradient key={s.id} id={`ctx-grad-${s.id}`}
                              x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0" stopColor={s.color} stopOpacity="0" />
                              <stop offset="1" stopColor={s.color} stopOpacity="0.55" />
                            </linearGradient>
                          ))}
                        </defs>

                        {/* 섹션 밴드 — 얇은 세로 컬러 스트립 (라벨은 HTML) */}
                        {macroLayout.sections.map(s => (
                          <rect key={s.id}
                            x={104} y={s.y1}
                            width={4} height={Math.max(0, s.y2 - s.y1)}
                            fill={`url(#ctx-grad-${s.id})`}
                            rx={2} />
                        ))}

                        {/* 섹션 사이 얇은 divider 라인 */}
                        {macroLayout.sections.slice(1).map(s => (
                          <line key={`div-${s.id}`}
                            x1={12} x2={108}
                            y1={s.y1} y2={s.y1}
                            stroke="rgba(15,23,42,.06)"
                            strokeWidth={1}
                            strokeDasharray="1 3" />
                        ))}

                        {/* 스파인 (얇은 dashed) */}
                        {macroLayout.pivots.length > 1 && (
                          <line
                            x1={98} y1={macroLayout.pivots[0].y}
                            x2={98} y2={macroLayout.pivots[macroLayout.pivots.length-1].y}
                            stroke="rgba(15,23,42,.14)"
                            strokeWidth={1} strokeDasharray="2 5" />
                        )}

                        {/* 논리 arc — 스파인에서 좌측으로 부드럽게 커브 */}
                        {macroLayout.arcs.map(a => {
                          const dy = Math.abs(a.y2 - a.y1);
                          const bend = Math.min(72, 20 + dy * 0.05);
                          const cx = 98 - bend;
                          const path = `M 98 ${a.y1} C ${cx} ${a.y1}, ${cx} ${a.y2}, 98 ${a.y2}`;
                          const isHover = hoveredArc === a.id;
                          return (
                            <g key={a.id} pointerEvents="auto">
                              <path
                                d={path}
                                stroke={a.color}
                                strokeWidth={isHover ? 1.6 : 1}
                                fill="none"
                                opacity={isHover ? 0.85 : 0.32}
                                strokeLinecap="round"
                                style={{ transition:'opacity .15s, stroke-width .15s' }} />
                              <path
                                d={path}
                                stroke="transparent" strokeWidth={14} fill="none"
                                onMouseEnter={() => setHoveredArc(a.id)}
                                onMouseLeave={() => setHoveredArc(null)}
                                style={{ cursor:'help' }} />
                            </g>
                          );
                        })}

                        {/* pivot dots — 링 스타일 (도넛) */}
                        {macroLayout.pivots.map(p => {
                          const isHover = hoveredPivot === p.id;
                          return (
                            <g key={p.id} pointerEvents="auto"
                              onMouseEnter={() => setHoveredPivot(p.id)}
                              onMouseLeave={() => setHoveredPivot(null)}
                              onClick={() => scrollTo(p.ch, p.verse)}
                              style={{ cursor:'pointer' }}>
                              {/* halo */}
                              {isHover && (
                                <circle cx={98} cy={p.y} r={9}
                                  fill={p.color} opacity={0.18} />
                              )}
                              {/* 링 */}
                              <circle
                                cx={98} cy={p.y}
                                r={isHover ? 5 : 4}
                                fill="#ffffff"
                                stroke={p.color}
                                strokeWidth={isHover ? 2.2 : 1.8}
                                style={{ transition:'r .15s, stroke-width .15s' }} />
                              {/* 중앙 */}
                              <circle
                                cx={98} cy={p.y}
                                r={isHover ? 2 : 1.5}
                                fill={p.color}
                                style={{ transition:'r .15s' }} />
                            </g>
                          );
                        })}

                      </svg>
                    )}

                    {/* HTML hover tooltip — 좌측 공백(x=0~96)에 배치, 우측으로 화살표로 pivot 가리킴 */}
                    {(hoveredArc || hoveredPivot) && (() => {
                      const item = hoveredArc
                        ? macroLayout.arcs.find(a => a.id === hoveredArc)
                        : macroLayout.pivots.find(p => p.id === hoveredPivot);
                      if (!item) return null;
                      const y = hoveredArc ? (item.y1 + item.y2) / 2 : item.y;
                      const label = hoveredArc
                        ? item.label
                        : `${item.ch}:${item.verse} · ${item.label}`;
                      return (
                        <div style={{
                          position: 'absolute',
                          left: 2,
                          top: y,
                          transform: 'translateY(-50%)',
                          width: 90,
                          padding: '6px 9px',
                          background: 'rgba(15,23,42,.96)',
                          color: '#fff',
                          fontSize: 10.5,
                          fontWeight: 600,
                          borderRadius: 6,
                          fontFamily: "'Inter','Pretendard','SF Pro Text',sans-serif",
                          pointerEvents: 'none',
                          zIndex: 6,
                          boxShadow: '0 3px 10px rgba(15,23,42,.35)',
                          lineHeight: 1.35,
                          wordBreak: 'keep-all',
                          overflowWrap: 'break-word',
                          letterSpacing: '.005em',
                          WebkitBackdropFilter: 'blur(2px)',
                          backdropFilter: 'blur(2px)',
                        }}>
                          {label}
                          {/* 오른쪽으로 향하는 화살표 (pivot 방향) */}
                          <div style={{
                            position: 'absolute',
                            right: -5, top: '50%',
                            transform: 'translateY(-50%)',
                            width: 0, height: 0,
                            borderTop: '5px solid transparent',
                            borderBottom: '5px solid transparent',
                            borderLeft: '6px solid rgba(15,23,42,.96)',
                            filter: 'drop-shadow(1px 0 1px rgba(15,23,42,.2))',
                          }} />
                        </div>
                      );
                    })()}

                    {/* HTML 섹션 라벨 pill — sticky (섹션 y-range 내에서 따라 이동) */}
                    {macroLayout.sections.map(s => (
                      <div key={s.id + '-chip-range'}
                        aria-hidden="true"
                        style={{
                          position:'absolute',
                          left: 0, right: 0,
                          top: s.y1,
                          height: Math.max(0, s.y2 - s.y1),
                          pointerEvents:'none',
                          zIndex: 3,
                        }}>
                        <div
                          onClick={() => scrollTo(s.fromCh, 1)}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = `${s.color}22`;
                            e.currentTarget.style.borderColor = `${s.color}88`;
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = `0 2px 4px ${s.color}30, 0 6px 16px rgba(15,23,42,.08)`;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = `${s.color}14`;
                            e.currentTarget.style.borderColor = `${s.color}55`;
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = `0 1px 2px ${s.color}22, 0 4px 12px rgba(15,23,42,.04)`;
                          }}
                          title={`${s.label} — ${s.fromCh}장으로 이동`}
                          style={{
                            position:'sticky',
                            top: 14,
                            display:'inline-flex',
                            marginLeft: 6,
                            alignItems:'center', gap:5,
                            padding:'3px 8px 3px 7px',
                            background: `${s.color}14`,
                            border: `1px solid ${s.color}55`,
                            borderRadius: 999,
                            fontSize: 10, fontWeight: 700,
                            color: s.color,
                            fontFamily: "'Inter','Pretendard',-apple-system,sans-serif",
                            letterSpacing: '.01em',
                            whiteSpace: 'nowrap',
                            boxShadow: `0 1px 2px ${s.color}22, 0 4px 12px rgba(15,23,42,.04)`,
                            userSelect:'none',
                            pointerEvents:'auto',
                            cursor:'pointer',
                            WebkitBackdropFilter:'blur(6px) saturate(160%)',
                            backdropFilter:'blur(6px) saturate(160%)',
                            transition:'background .18s, border-color .18s, transform .18s, box-shadow .2s',
                          }}>
                          <span style={{
                            fontFamily:"'SF Mono','JetBrains Mono',ui-monospace,monospace",
                            fontSize:9, fontWeight:800,
                            opacity:.85,
                            fontVariantNumeric:'tabular-nums',
                          }}>{s.fromCh}–{s.toCh}</span>
                          <span>{s.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── 우측 콘텐츠 (본문 리스트) ── */}
                <div ref={contentRef}
                  style={{ flex:1, minWidth:0, padding:'10px 12px', position:'relative' }}>

            {CHAPTERS.map(ch => {
              const chData = chapters[ch];
              if (!chData) return null;
              return (
                <div key={ch} style={{ marginBottom:22 }}>
                  {/* 장 구분 헤더 (스크롤 앵커) */}
                  <div style={{ display:'flex',alignItems:'center',gap:10,
                    padding:'12px 8px 6px',marginTop:ch===1?0:12,
                    borderTop: ch===1 ? 'none' : '2px solid rgba(15,23,42,.08)' }}>
                    <span style={{ fontSize: isMobile?22:fontSizes.meta+12,fontWeight:800,color:'#0f172a',
                      letterSpacing:'-.02em' }}>
                      {ch}<span style={{ fontSize: isMobile?14:fontSizes.meta+4,color:'#94a3b8',marginLeft:3,fontWeight:600 }}>장</span>
                    </span>
                    <span style={{ fontSize: isMobile?10:fontSizes.meta,color:'#94a3b8' }}>
                      {chData.krv.length}절 · 단락 {chData.paragraphs.length}
                    </span>
                  </div>

                  {chData.paragraphs.map((para, pIdx) => (
                    <div key={`${ch}-${para.startVerse}`} style={{ marginBottom:8 }}>
                      {/* 단락 헤더 */}
                      <div style={{ display:'flex',alignItems:'center',gap:8,
                        padding:'5px 10px 5px 12px',marginBottom:2,
                        background:'rgba(15,23,42,.035)',borderRadius:7,
                        borderLeft:`3px solid ${para.openRule?.color || '#cbd5e1'}` }}>
                        <span style={{ fontSize: isMobile?9:fontSizes.meta-1,fontWeight:800,color:'#64748b' }}>§{pIdx+1}</span>
                        <span style={{ fontSize: isMobile?9:fontSizes.meta-1,color:'#94a3b8' }}>
                          {ch}:{para.startVerse}–{para.endVerse}
                        </span>
                        <span style={{ fontSize: isMobile?10:fontSizes.meta,fontWeight:700,
                          color: para.openRule?.color || '#475569' }}>
                          {para.topTheo.length > 0 ? para.topTheo.join('·') : (para.openRule?.role || '서술')}
                        </span>
                        {para.openRule && (
                          <span style={{ fontSize: isMobile?9:fontSizes.meta-1,color:'#94a3b8',marginLeft:'auto' }}>
                            {para.openRule.icon} {para.openRule.role}
                          </span>
                        )}
                      </div>

                      {para.verses.map(verse => {
                        const vData = chData.krv.find(r => r.verse === verse);
                        if (!vData) return null;
                        const ana   = chData.analyzed[verse] || { discourse:null, theoTerms:[] };
                        const d     = ana.discourse;
                        const qa    = chData.qaPairs[verse];
                        const isActive = ch === activeRef.ch && verse === activeRef.verse;
                        const level = chData.indentLevels[verse] || 0;

                        const qaAmber = qa && (qa.type === 'Q' || qa.type === 'A' || qa.type === 'QA');
                        const barColor = qaAmber ? '#f59e0b' : (d?.color || 'rgba(148,163,184,.4)');
                        const tintBg   = qaAmber
                          ? 'rgba(245,158,11,.08)'
                          : (d ? d.color + '14' : 'transparent');
                        const activeBg = isActive
                          ? (qaAmber ? 'rgba(245,158,11,.22)' : (d?.bg || 'rgba(15,23,42,.06)'))
                          : tintBg;

                        return (
                          <div key={verse} data-ch={ch} data-verse={verse}
                            onClick={() => {
                              setActiveRef({ ch, verse });
                              if (isMobile) setSheetSnap(prev => prev === 'closed' ? 'peek' : prev);
                            }}
                            style={{
                              display:'flex', gap: isMobile?10:8, marginBottom:2,
                              padding: isMobile?'10px 12px 10px 10px':'8px 10px 8px 8px',
                              marginLeft: level * (isMobile?12:18),
                              borderRadius: isMobile?10:8, cursor:'pointer',
                              borderLeft:`3px solid ${barColor}`,
                              background: activeBg,
                              transition:'background .15s,border-color .15s',
                            }}>
                            <div style={{ flexShrink:0,width: isMobile?46:44,display:'flex',flexDirection:'column',
                              alignItems:'center',gap:2,marginTop:2 }}>
                              <span style={{ fontSize: isMobile?11:fontSizes.meta,fontWeight:700,
                                color: isActive ? (qaAmber ? '#d97706' : (d?.color || '#475569')) : '#64748b' }}>
                                {ch}:{verse}
                              </span>
                              {showOrigRef && chData.hebRefs?.[verse] && (
                                <span style={{
                                  fontSize: isMobile?8:Math.max(8, fontSizes.meta-3),
                                  color:'#94a3b8', fontWeight:600, lineHeight:1,
                                  fontStyle:'italic',
                                  fontFamily:"'Inter','Pretendard',sans-serif",
                                }} title={`${origLangFull} 원문: ${chData.hebRefs[verse]}`}>
                                  {origLangShort} {chData.hebRefs[verse]}
                                </span>
                              )}
                              {d && <span title={d.role} style={{ fontSize: isMobile?13:fontSizes.meta+1,lineHeight:1 }}>{d.icon}</span>}
                              {qa && (
                                <span style={{
                                  fontSize: isMobile?8:fontSizes.meta-2, fontWeight:800, lineHeight:1,
                                  padding:'1px 4px', borderRadius:3,
                                  background: qa.type === 'A' ? 'rgba(239,68,68,.15)' : 'rgba(245,158,11,.22)',
                                  color: qa.type === 'A' ? '#dc2626' : '#b45309',
                                }}>{qa.type === 'QA' ? 'Q·A' : qa.type}</span>
                              )}
                            </div>

                            <div style={{ flex:1,minWidth:0 }}>
                              <div style={{ fontSize: isMobile?16:fontSizes.body,color:'#1e293b',
                                lineHeight: isMobile?1.75:1.85,wordBreak:'keep-all',
                                textAlign:'justify', textJustify:'inter-character' }}>
                                {vData.text}
                              </div>
                              {ana.theoTerms.length > 0 && (
                                <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginTop:5 }}>
                                  {ana.theoTerms.map(t => (
                                    <span key={t.strongs}
                                      onClick={e => { e.stopPropagation(); startThread(t.strongs); }}
                                      title={`"${t.ko}" ${BOOK.ko} 전체 추적 →`}
                                      style={{ fontSize: isMobile?9:fontSizes.meta-1,fontWeight:700,color:t.color,
                                        background:t.color+'22',border:`1px solid ${t.color}55`,
                                        borderRadius:99,padding:'1px 7px',cursor:'pointer',
                                        transition:'background .12s' }}>
                                      {t.ko}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
                </div>
              </div>
            )}
          </div>

          {/* 좌·우 스플리터 (데스크톱) */}
          {!isMobile && (
            <div
              onMouseDown={onSplitMouseDown}
              title="좌우 크기 조절 (드래그)"
              style={{
                width: 6,
                flexShrink: 0,
                cursor: 'col-resize',
                background: splitDragging.current
                  ? 'rgba(217,119,6,.4)'
                  : 'linear-gradient(90deg, transparent, rgba(15,23,42,.08), transparent)',
                position: 'relative',
                transition: 'background .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(217,119,6,.25)'; }}
              onMouseLeave={e => {
                if (!splitDragging.current) e.currentTarget.style.background = 'linear-gradient(90deg, transparent, rgba(15,23,42,.08), transparent)';
              }}
            >
              <div style={{ position:'absolute', top:'50%', left:'50%',
                transform:'translate(-50%, -50%)',
                width:2, height:24, borderRadius:2,
                background:'rgba(15,23,42,.25)' }} />
            </div>
          )}

          {/* 우: 분석 패널 (모바일에서는 스냅 바텀시트) */}
          {isMobile && sheetSnap === 'full' && (
            <div
              onClick={() => setSheetSnap('peek')}
              style={{ position:'absolute',inset:0,background:'rgba(15,23,42,.4)',
                zIndex:5,transition:'opacity .2s' }} />
          )}
          <div
            onClick={e => isMobile && e.stopPropagation()}
            style={{
              width: isMobile ? '100%' : Math.max(160, Math.min(rightPanelWidth, size.w - 240)),
              minWidth: isMobile ? undefined : 160,
              flexShrink: 0,
              overflowY: isMobile ? (sheetSnap === 'full' ? 'auto' : 'hidden') : 'auto',
              padding: isMobile ? '0 16px' : '14px 16px',
              background: '#ffffff',
              ...(isMobile ? {
                position: 'absolute',
                left: 0, right: 0, bottom: 0,
                height: sheetSnap === 'full' ? '85%' : sheetSnap === 'peek' ? 132 : 0,
                borderTop: '1px solid rgba(15,23,42,.08)',
                borderRadius: '18px 18px 0 0',
                boxShadow: '0 -8px 32px rgba(15,23,42,.18)',
                transition: 'height .28s cubic-bezier(.4,0,.2,1)',
                zIndex: 6,
                overflow: sheetSnap === 'closed' ? 'hidden' : undefined,
              } : { background: '#f8fafc' })
            }}>
            {isMobile && sheetSnap !== 'closed' && (
              <div
                onClick={() => setSheetSnap(s => s === 'peek' ? 'full' : 'peek')}
                style={{ display:'flex',flexDirection:'column',alignItems:'center',
                  padding:'8px 0 4px',cursor:'pointer',userSelect:'none' }}>
                <div style={{ width:38,height:5,borderRadius:99,background:'rgba(15,23,42,.18)' }} />
                {sheetSnap === 'peek' && (() => {
                  const d = activeAna.discourse;
                  const qa = activeQaPairs[activeRef.verse];
                  return (
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginTop:8,
                      padding:'0 4px',width:'100%',justifyContent:'space-between' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8,minWidth:0 }}>
                        <span style={{ fontSize:12,fontWeight:800,color:'#b45309',flexShrink:0 }}>
                          {activeRef.ch}:{activeRef.verse}
                        </span>
                        {d ? (
                          <span style={{ display:'inline-flex',alignItems:'center',gap:4,
                            padding:'3px 9px',borderRadius:99,
                            background:d.bg,border:`1px solid ${d.color}55`,
                            fontSize:11,fontWeight:800,color:d.color,flexShrink:0 }}>
                            {d.icon} {d.role}
                          </span>
                        ) : (
                          <span style={{ fontSize:11,color:'#64748b' }}>📝 진술</span>
                        )}
                        {qa && (
                          <span style={{ fontSize:10,fontWeight:800,padding:'2px 6px',borderRadius:4,
                            background: qa.type==='A' ? 'rgba(239,68,68,.15)' : 'rgba(245,158,11,.22)',
                            color: qa.type==='A' ? '#dc2626' : '#b45309',flexShrink:0 }}>
                            {qa.type==='QA'?'Q·A':qa.type}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize:10,color:'#94a3b8',flexShrink:0 }}>▲ 더보기</span>
                    </div>
                  );
                })()}
              </div>
            )}
            <div style={{ padding: isMobile ? '4px 0 calc(env(safe-area-inset-bottom, 0px) + 20px)' : 0 }}>

            {/* ────── 책 배경 메타 패널 (verse 모드에서만) ────── */}
            {rightMode === 'verse' && (
              <div style={{
                marginBottom: 14,
                borderRadius: 10,
                border: '1px solid rgba(217,119,6,.28)',
                background: 'linear-gradient(180deg, rgba(251,191,36,.08), rgba(217,119,6,.04))',
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => setMetaOpen(v => !v)}
                  style={{
                    width:'100%', display:'flex', alignItems:'center',
                    justifyContent:'space-between', gap:6,
                    padding:'8px 12px', border:'none',
                    background:'transparent', cursor:'pointer',
                    color:'#b45309', fontSize: isMobile?11:fontSizes.bg, fontWeight:800,
                    letterSpacing:'.04em',
                  }}>
                  <span style={{ display:'flex',alignItems:'center',gap:6 }}>
                    <span style={{ fontSize: isMobile?13:fontSizes.bg+2 }}>📜</span>
                    <span>배경 · {BOOK.ko}</span>
                  </span>
                  <span style={{ fontSize: isMobile?11:fontSizes.bg,color:'#94a3b8' }}>
                    {metaOpen ? '▾' : '▸'}
                  </span>
                </button>
                {metaOpen && (() => {
                  // 라벨 컬럼 폭도 폰트 크기에 맞춰 확장 (최대 5자: "저작 장소" · "핵심 주제")
                  const labelWidth = isMobile ? 62 : Math.max(60, Math.round(fontSizes.bg * 5.4));
                  return (
                  <div style={{ padding:'2px 12px 12px' }}>
                    {[
                      { label:'장르',      value: BOOK_META.genre,    note: BOOK_META.genreNote },
                      { label:'저작 연도', value: BOOK_META.year,     note: BOOK_META.yearNote },
                      { label:'저작 장소', value: BOOK_META.place,    note: BOOK_META.placeNote },
                      { label:'저자',      value: BOOK_META.author,   note: BOOK_META.authorNote },
                      { label:'1차 독자',  value: BOOK_META.audience, note: BOOK_META.audienceNote },
                      { label:'핵심 주제', value: BOOK_META.theme,    note: BOOK_META.themeNote },
                    ].filter(r => r.value).map(row => (
                      <div key={row.label} style={{
                        display:'grid', gridTemplateColumns:`${labelWidth}px 1fr`,
                        gap:6, marginBottom:6,
                      }}>
                        <span style={{ fontSize: isMobile?10:fontSizes.bg-1, color:'#94a3b8',
                          fontWeight:700, letterSpacing:'.04em',
                          whiteSpace:'nowrap' }}>{row.label}</span>
                        <div>
                          <div style={{ fontSize: isMobile?11:fontSizes.bg,fontWeight:700,color:'#1e293b',lineHeight:1.4,
                            textAlign:'justify',wordBreak:'keep-all' }}>
                            {row.value}
                          </div>
                          {row.note && (
                            <div style={{ fontSize: isMobile?10:fontSizes.bg-1,color:'#64748b',lineHeight:1.4,marginTop:1,
                              textAlign:'justify',wordBreak:'keep-all' }}>
                              {row.note}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* 각 장 의제 요약 */}
                    <div style={{ marginTop:10,paddingTop:8,
                      borderTop:'1px dashed rgba(217,119,6,.3)' }}>
                      <div style={{ fontSize: isMobile?10:fontSizes.bg-1,color:'#94a3b8',
                        fontWeight:700,letterSpacing:'.04em',marginBottom:6 }}>
                        각 장 의제
                      </div>
                      {(() => {
                        // "장" 라벨 폭을 폰트 크기에 유기적으로 매핑
                        const chLabelWidth = isMobile ? 26 : Math.max(28, Math.round(fontSizes.bg * 2.6));
                        return CHAPTERS.map(ch => {
                          const isActive = ch === activeRef.ch;
                          return (
                            <div key={ch}
                              onClick={() => scrollTo(ch, 1)}
                              style={{
                                display:'grid',
                                gridTemplateColumns:`${chLabelWidth}px 1fr`,
                                gap:6, padding:'4px 6px', marginBottom:1,
                                borderRadius:5, cursor:'pointer',
                                background: isActive ? 'rgba(217,119,6,.14)' : 'transparent',
                                transition:'background .12s',
                              }}
                              onMouseEnter={e => {
                                if (!isActive) e.currentTarget.style.background = 'rgba(15,23,42,.04)';
                              }}
                              onMouseLeave={e => {
                                if (!isActive) e.currentTarget.style.background = 'transparent';
                              }}>
                              <span style={{
                                fontSize: isMobile?10:fontSizes.bg-1, fontWeight:800,
                                color: isActive ? '#b45309' : '#94a3b8',
                                textAlign:'right', lineHeight:1.4,
                                whiteSpace:'nowrap',       // "10장" 등이 두 줄로 안 넘어가게
                              }}>{ch}장</span>
                              <span style={{
                                fontSize: isMobile?10.5:fontSizes.bg-.5,
                                color: isActive ? '#1e293b' : '#475569',
                                fontWeight: isActive ? 700 : 500,
                                lineHeight:1.4,
                                textAlign:'justify',wordBreak:'keep-all',
                              }}>{BOOK_META.chapterAgenda[ch]}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                  );
                })()}
              </div>
            )}

            {rightMode === 'thread' && (
              <div key={`thread-${threadStrongs}`} style={{ animation:'ctx-fade .2s ease' }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
                  <button onClick={() => setRightMode('verse')}
                    style={{ background:'rgba(15,23,42,.06)',border:'none',color:'#475569',
                      borderRadius:6,padding:'3px 9px',fontSize:10,cursor:'pointer' }}>← 뒤로</button>
                  {threadStrongs && (
                    <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                      <span style={{ fontSize:14,fontWeight:800,
                        color: THEO_TERMS[threadStrongs]?.color }}>
                        「{THEO_TERMS[threadStrongs]?.ko}」
                      </span>
                      <span style={{ fontSize:10,color:'#64748b' }}>종단 추적</span>
                    </div>
                  )}
                </div>

                {threadLoading ? (
                  <div style={{ color:'#64748b',fontSize:12,textAlign:'center',paddingTop:30 }}>
                    {BOOK.ko} 전체 스캔 중…
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize:10,color:'#64748b',marginBottom:12 }}>
                      {BOOK.ko} 전체 <strong style={{ color:THEO_TERMS[threadStrongs]?.color }}>
                        {threadData.length}절
                      </strong>에서 등장
                    </div>

                    {CHAPTERS.map(ch => {
                      const chRefs = threadData.filter(r => r.ch === ch);
                      if (!chRefs.length) return null;
                      return (
                        <div key={ch} style={{ marginBottom:14 }}>
                          <div style={{ fontSize:10,fontWeight:700,color:'#475569',
                            borderBottom:'1px solid rgba(15,23,42,.08)',
                            paddingBottom:4,marginBottom:5 }}>
                            {ch}장
                            <span style={{ fontWeight:400,color:'#94a3b8',marginLeft:6 }}>
                              {chRefs.length}절
                            </span>
                          </div>
                          {chRefs.map(ref => (
                            <div key={ref.verse}
                              onClick={() => goToThreadRef(ref.ch, ref.verse)}
                              style={{ padding:'6px 8px',borderRadius:7,marginBottom:3,
                                cursor:'pointer',background:'#ffffff',
                                border:'1px solid rgba(15,23,42,.06)',transition:'background .13s' }}
                              onMouseEnter={e => e.currentTarget.style.background='rgba(15,23,42,.04)'}
                              onMouseLeave={e => e.currentTarget.style.background='#ffffff'}
                            >
                              <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:ref.text?2:0 }}>
                                <span style={{ fontSize:10,fontWeight:700,
                                  color: THEO_TERMS[threadStrongs]?.color }}>
                                  {ch}:{ref.verse}
                                </span>
                                {ref.discourse && (
                                  <span style={{ fontSize:8,color:ref.discourse.color }}>
                                    {ref.discourse.icon} {ref.discourse.role}
                                  </span>
                                )}
                              </div>
                              {ref.text ? (
                                <div style={{ fontSize:10,color:'#475569',lineHeight:1.5 }}>
                                  {ref.text.length > 58 ? ref.text.slice(0,58)+'…' : ref.text}
                                </div>
                              ) : (
                                <div style={{ fontSize:9,color:'#94a3b8' }}>
                                  [{ch}장 클릭 시 본문 표시]
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {rightMode === 'verse' && !activeData && (
              <div style={{ color:'#94a3b8',fontSize: isMobile?12:A,textAlign:'center',marginTop:50 }}>
                절을 클릭하거나<br/>스크롤하면 분석이 표시됩니다
              </div>
            )}

            {rightMode === 'verse' && activeData && (() => {
              const { discourse, theoTerms } = activeAna;
              const qa = activeQaPairs[activeRef.verse];
              const maxFreq = activeTheoFreq && Math.max(1, ...Object.values(activeTheoFreq));

              return (
                <div key={`${activeRef.ch}-${activeRef.verse}`} style={{ animation:'ctx-fade .2s ease' }}>

                  <div style={{ fontSize: isMobile?11:A-1,fontWeight:700,color:'#b45309',marginBottom:12,
                    display:'flex',alignItems:'baseline',gap:6,flexWrap:'wrap' }}>
                    <span>{BOOK.ko} {activeRef.ch}:{activeRef.verse}</span>
                    {activeCh?.hebRefs?.[activeRef.verse] && (
                      <span style={{ fontSize: isMobile?9:A-3, fontWeight:600,
                        color:'#94a3b8', fontStyle:'italic',
                        fontFamily:"'Inter','Pretendard',sans-serif",
                      }} title={`${origLangFull} 원문 절 번호`}>
                        · {origLangShort} {activeCh.hebRefs[activeRef.verse]}
                      </span>
                    )}
                  </div>

                  {discourse ? (
                    <div style={{ background:discourse.bg,
                      border:`1px solid ${discourse.color}55`,
                      borderLeft:`4px solid ${discourse.color}`,
                      borderRadius:10,padding:'12px 14px',marginBottom:12 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:8 }}>
                        <span style={{ fontSize: isMobile?18:A+6 }}>{discourse.icon}</span>
                        <div>
                          <div style={{ fontSize: isMobile?13:A+1,fontWeight:800,color:discourse.color }}>
                            {discourse.role}
                          </div>
                          <div style={{ fontSize: isMobile?10:A-2,color:'#64748b',marginTop:1 }}>{origLangFull} 신호어</div>
                        </div>
                      </div>
                      <div style={{ background:'#ffffff',border:`1px solid ${discourse.color}30`,
                        borderRadius:6,padding:'6px 10px',marginBottom:10 }}>
                        <span style={{ fontSize: isMobile?18:A+6,fontWeight:700,color:discourse.color,
                          fontFamily:"'Gentium Plus', serif" }}>{discourse.gr}</span>
                        <span style={{ fontSize: isMobile?10:A-2,color:'#64748b',marginLeft:8 }}>
                          ({discourse.tr})
                        </span>
                      </div>
                      <p style={{ fontSize: isMobile?12:A,color:'#334155',lineHeight:1.7,margin:0,
                        textAlign:'justify',wordBreak:'keep-all' }}>
                        {discourse.desc}
                      </p>
                    </div>
                  ) : (
                    <div style={{ background:'#ffffff',
                      border:'1px solid rgba(15,23,42,.08)',
                      borderRadius:10,padding:'10px 14px',marginBottom:12,
                      fontSize: isMobile?12:A,color:'#475569' }}>
                      📝 <strong style={{ color:'#0f172a' }}>진술</strong>
                      <p style={{ margin:'6px 0 0',lineHeight:1.6,textAlign:'justify',wordBreak:'keep-all' }}>
                        특정 담화 접속사 없이 바울의 논증이나 사실을 서술합니다.
                      </p>
                    </div>
                  )}

                  {qa && (
                    <div style={{ background:'rgba(245,158,11,.1)',
                      border:'1px solid rgba(245,158,11,.35)',
                      borderRadius:8,padding:'8px 12px',marginBottom:12 }}>
                      <div style={{ fontSize: isMobile?10:A-2,fontWeight:700,color:'#b45309',marginBottom:4 }}>
                        수사적 Q&A 쌍
                      </div>
                      <div style={{ fontSize: isMobile?11:A-1,color:'#475569',lineHeight:1.5,
                        textAlign:'justify',wordBreak:'keep-all' }}>
                        {qa.type === 'Q' && qa.pairedWith &&
                          `↓ ${activeRef.ch}:${qa.pairedWith}절에서 강하게 반박합니다 (μὴ γένοιτο)`}
                        {qa.type === 'A' && qa.pairedWith &&
                          `↑ ${activeRef.ch}:${qa.pairedWith}절 질문에 대한 답입니다`}
                        {qa.type === 'QA' &&
                          '이 절 안에서 바울이 질문하고 스스로 강하게 반박합니다'}
                      </div>
                      {qa.pairedWith && (
                        <button
                          onClick={() => scrollTo(activeRef.ch, qa.pairedWith)}
                          style={{ marginTop:6,fontSize: isMobile?9:A-3,background:'rgba(245,158,11,.2)',
                            border:'1px solid rgba(245,158,11,.4)',color:'#b45309',
                            borderRadius:5,padding:'2px 8px',cursor:'pointer' }}>
                          {qa.type === 'Q' ? '↓ 반박 절로' : '↑ 질문 절로'}
                        </button>
                      )}
                    </div>
                  )}

                  {theoTerms.length > 0 && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize: isMobile?10:A-2,fontWeight:700,color:'#475569',
                        marginBottom:8,letterSpacing:'.06em' }}>
                        이 절의 신학 핵심어
                        <span style={{ fontWeight:400,color:'#94a3b8',marginLeft:4 }}>
                          (클릭 → 전체 추적)
                        </span>
                      </div>
                      {theoTerms.map(t => {
                        const freq = activeTheoFreq[t.strongs] || 0;
                        return (
                          <div key={t.strongs} style={{ marginBottom:7 }}>
                            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
                              <span onClick={() => startThread(t.strongs)}
                                style={{ fontSize: isMobile?11:A-1,fontWeight:700,color:t.color,cursor:'pointer',
                                  borderBottom:`1px dotted ${t.color}80`,paddingBottom:1 }}>{t.ko}</span>
                              <span style={{ fontSize: isMobile?10:A-2,color:'#64748b' }}>{freq}절/{activeRef.ch}장</span>
                            </div>
                            <div style={{ background:'rgba(15,23,42,.08)',borderRadius:99,
                              height:4,overflow:'hidden' }}>
                              <div style={{ width:`${Math.round((freq/maxFreq)*100)}%`,height:'100%',
                                background:t.color,borderRadius:99,transition:'width .4s' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {Object.keys(activeTheoFreq).length > 0 && (() => {
                    // 가장 긴 핵심어에 맞춰 라벨 컬럼 폭 동적 계산 (2줄 wrap 방지)
                    const distEntries = Object.entries(activeTheoFreq).sort((a,b) => b[1]-a[1])
                      .filter(([s]) => !!THEO_TERMS[s]);
                    const distFontSize = isMobile ? 10 : A - 2;
                    const maxLabelLen = distEntries.reduce(
                      (m, [s]) => Math.max(m, (THEO_TERMS[s]?.ko || '').length), 0);
                    // 한글 1자 ≈ 폰트 크기 × 1.02 픽셀 + 여유분
                    const distLabelWidth = Math.max(28, Math.ceil(maxLabelLen * distFontSize * 1.05) + 4);
                    // 빈도 숫자 컬럼도 자릿수 기반으로 동적
                    const maxFreqDigits = distEntries.reduce(
                      (m, [, f]) => Math.max(m, String(f).length), 1);
                    const distFreqWidth = Math.max(18, maxFreqDigits * distFontSize * 0.62 + 4);
                    return (
                      <div style={{ background:'#ffffff',
                        border:'1px solid rgba(15,23,42,.08)',
                        borderRadius:10,padding:'10px 12px' }}>
                        <div style={{ fontSize: isMobile?10:A-2,fontWeight:700,color:'#475569',
                          marginBottom:8,letterSpacing:'.06em' }}>
                          {activeRef.ch}장 전체 핵심어 분포
                        </div>
                        {distEntries.map(([s, freq]) => {
                          const t = THEO_TERMS[s];
                          return (
                            <div key={s} style={{ display:'flex',alignItems:'center',gap:6,marginBottom:5 }}>
                              <span onClick={() => startThread(s)}
                                style={{ fontSize: distFontSize,fontWeight:700,color:t.color,
                                  width: distLabelWidth, flexShrink:0, cursor:'pointer',
                                  whiteSpace:'nowrap', // 안전망: 절대 wrap 안 함
                                  borderBottom:`1px dotted ${t.color}80` }}>{t.ko}</span>
                              <div style={{ flex:1,minWidth:0,background:'rgba(15,23,42,.08)',
                                borderRadius:99,height:5,overflow:'hidden' }}>
                                <div style={{ width:`${Math.round((freq/maxFreq)*100)}%`,height:'100%',
                                  background:t.color,borderRadius:99 }} />
                              </div>
                              <span style={{ fontSize: distFontSize,color:'#64748b',
                                width: distFreqWidth, textAlign:'right', flexShrink:0,
                                fontVariantNumeric:'tabular-nums' }}>{freq}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
            </div>
          </div>
        </div>
        )}

        {/* ── 각 권 placeholder 페이지 (Rom 외) ── */}
        {!isSupported && activeBook && !isMobile && (
          <div style={{
            flex:1, overflow:'auto', position:'relative',
            display:'flex', alignItems:'center', justifyContent:'center',
            padding:'40px 20px',
            background:`linear-gradient(180deg, rgba(255,255,255,0) 0%, ${activeFadeTint} 100%), #ffffff`,
          }}>
            <div style={{
              display:'flex', flexDirection:'column',
              alignItems:'center', gap:16,
              maxWidth: 480,
              padding:'56px 44px',
              background:'#ffffff',
              border:`1px solid ${BOOK_CHIP_PALETTE[activeTestament].baseBorder}`,
              borderRadius:20,
              boxShadow:'0 8px 32px rgba(15,23,42,.06)',
              textAlign:'center',
            }}>
              <div style={{ fontSize:56, lineHeight:1, opacity:.55 }}>📖</div>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'4px 11px',
                background: BOOK_CHIP_PALETTE[activeTestament].tabBg,
                border:`1px solid ${BOOK_CHIP_PALETTE[activeTestament].tabBorder}`,
                borderRadius:99,
                fontSize:10, fontWeight:800, letterSpacing:'.1em',
                color: BOOK_CHIP_PALETTE[activeTestament].tabText,
                fontFamily:"'Inter','Pretendard',sans-serif",
              }}>{BOOK_CHIP_PALETTE[activeTestament].label}</div>
              <div style={{
                fontSize:26, fontWeight:800, color:'#0f172a',
                letterSpacing:'-.02em',
                fontFamily:"'Pretendard','Inter',sans-serif",
              }}>{activeBook.ko}</div>
              <div style={{
                fontSize:13, color:'#64748b', fontWeight:500,
                fontFamily:"'Inter','Pretendard',sans-serif",
                fontVariantNumeric:'tabular-nums',
              }}>{activeBook.en} · <span style={{
                color: BOOK_CHIP_PALETTE[activeTestament].baseText, fontWeight:700,
              }}>{activeBook.chapters}장</span></div>
              <div style={{
                marginTop:14,
                padding:'8px 16px',
                background:'rgba(212,153,79,.12)',
                border:'1px solid rgba(212,153,79,.4)',
                borderRadius:99,
                fontSize:11, fontWeight:700, color:'#8A6027',
                letterSpacing:'.06em', textTransform:'uppercase',
                fontFamily:"'Inter','Pretendard',sans-serif",
              }}>본문 준비 중 · Coming Soon</div>
              <button
                onClick={() => {
                  setActiveBookId('Rom');
                  setTimeout(() => {
                    const row = chipRowRef.current;
                    const act = row?.querySelector('[data-book-active="true"]');
                    if (act) scrollChipToLeft(act);
                  }, 30);
                }}
                style={{
                  marginTop:6,
                  padding:'8px 18px',
                  background:'#ffffff',
                  border:'1px solid rgba(15,23,42,.15)',
                  borderRadius:8,
                  fontSize:12, fontWeight:700, color:'#334155',
                  cursor:'pointer',
                  fontFamily:"'Inter','Pretendard',sans-serif",
                  transition:'background .12s, border-color .12s, color .12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(212,153,79,.1)';
                  e.currentTarget.style.borderColor = 'rgba(212,153,79,.4)';
                  e.currentTarget.style.color = '#8A6027';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = 'rgba(15,23,42,.15)';
                  e.currentTarget.style.color = '#334155';
                }}
              >← {BOOK.ko}로 돌아가기</button>
            </div>
          </div>
        )}

        {/* ── 모바일 바텀 네비 ── */}
        {isMobile && chReady && (
          <div style={{ display:'flex',alignItems:'center',gap:6,
            padding:'8px 12px calc(env(safe-area-inset-bottom, 0px) + 8px)',
            borderTop:'1px solid rgba(15,23,42,.08)',background:'#ffffff',
            flexShrink:0 }}>
            <button
              onClick={() => activeRef.ch > 1 && scrollTo(activeRef.ch - 1, 1)}
              disabled={activeRef.ch <= 1}
              style={{ display:'flex',alignItems:'center',gap:4,
                background: activeRef.ch>1 ? 'rgba(15,23,42,.05)' : 'transparent',
                border:'none',borderRadius:10,
                padding:'8px 12px',cursor: activeRef.ch>1?'pointer':'default',
                color: activeRef.ch>1 ? '#334155' : '#cbd5e1',
                fontSize:12,fontWeight:700,minHeight:40 }}>
              ◀ {activeRef.ch > 1 ? activeRef.ch - 1 : ''}장
            </button>
            <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
              <span style={{ fontSize:10,color:'#64748b',fontWeight:700 }}>
                {activeRef.ch}<span style={{ color:'#cbd5e1' }}> / 16</span>
              </span>
              <div style={{ width:'100%',maxWidth:180,height:4,background:'rgba(15,23,42,.08)',
                borderRadius:99,overflow:'hidden' }}>
                <div style={{ width:`${(activeRef.ch/16)*100}%`,height:'100%',
                  background:'linear-gradient(90deg,#d97706,#f59e0b)',
                  borderRadius:99,transition:'width .3s' }} />
              </div>
            </div>
            <button
              onClick={() => activeRef.ch < 16 && scrollTo(activeRef.ch + 1, 1)}
              disabled={activeRef.ch >= 16}
              style={{ display:'flex',alignItems:'center',gap:4,
                background: activeRef.ch<16 ? 'rgba(15,23,42,.05)' : 'transparent',
                border:'none',borderRadius:10,
                padding:'8px 12px',cursor: activeRef.ch<16?'pointer':'default',
                color: activeRef.ch<16 ? '#334155' : '#cbd5e1',
                fontSize:12,fontWeight:700,minHeight:40 }}>
              {activeRef.ch < 16 ? activeRef.ch + 1 : ''}장 ▶
            </button>
            <button
              onClick={() => setChapterPickerOpen(true)}
              style={{ background:'linear-gradient(135deg,#d97706,#f59e0b)',
                border:'none',color:'#fff',borderRadius:10,
                padding:'8px 12px',cursor:'pointer',
                fontSize:14,fontWeight:800,minHeight:40,minWidth:44,
                boxShadow:'0 3px 10px rgba(217,119,6,.35)' }}>☰</button>
          </div>
        )}
        </>)}

        {/* ── 챕터 피커 (모바일) ── */}
        {isMobile && chapterPickerOpen && (
          <div
            onClick={() => setChapterPickerOpen(false)}
            style={{ position:'absolute',inset:0,zIndex:10,
              background:'rgba(15,23,42,.5)',
              display:'flex',alignItems:'flex-end',justifyContent:'center' }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{ width:'100%',background:'#ffffff',
                borderRadius:'20px 20px 0 0',
                padding:'12px 18px calc(env(safe-area-inset-bottom, 0px) + 20px)',
                boxShadow:'0 -8px 32px rgba(15,23,42,.2)',
                animation:'ctx-slideup .25s ease' }}>
              <div style={{ display:'flex',justifyContent:'center',marginBottom:10 }}>
                <div style={{ width:38,height:5,borderRadius:99,background:'rgba(15,23,42,.18)' }} />
              </div>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
                marginBottom:14 }}>
                <span style={{ fontSize:15,fontWeight:800,color:'#0f172a' }}>{BOOK.ko} 목차</span>
                <button onClick={() => setChapterPickerOpen(false)}
                  style={{ background:'none',border:'none',fontSize:20,color:'#94a3b8',
                    cursor:'pointer',padding:'4px 8px' }}>✕</button>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:8 }}>
                {CHAPTERS.map(ch => {
                  const isActive = ch === activeRef.ch;
                  const isFailed = !chapters[ch];
                  return (
                    <button key={ch}
                      disabled={isFailed}
                      onClick={() => { scrollTo(ch, 1); setChapterPickerOpen(false); }}
                      style={{
                        padding:'14px 0',fontSize:16,fontWeight:800,
                        border:'none',borderRadius:12,
                        cursor: isFailed ? 'not-allowed' : 'pointer',
                        background: isActive ? 'linear-gradient(135deg,#d97706,#f59e0b)'
                          : isFailed ? 'rgba(220,38,38,.08)' : 'rgba(15,23,42,.05)',
                        color: isActive ? '#fff' : isFailed ? '#dc2626' : '#334155',
                        opacity: isFailed ? 0.55 : 1,
                        boxShadow: isActive ? '0 4px 12px rgba(217,119,6,.35)' : 'none',
                        transition:'transform .1s',
                      }}>
                      {ch}
                      {isFailed && <span style={{ fontSize:9,display:'block',marginTop:2 }}>✕</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── 리사이즈 핸들 (데스크톱, 최소화 아닐 때) ── */}
        {!isMobile && !minimized && (
          <div
            onMouseDown={onResizeMouseDown}
            title="크기 조절"
            style={{
              position:'absolute', right:0, bottom:0,
              width:18, height:18, cursor:'se-resize',
              borderRadius:'0 0 12px 0',
              background:'linear-gradient(135deg, transparent 45%, #cbd5e1 45%, #94a3b8 100%)',
              zIndex:20,
            }}
          />
        )}
      </div>
  );

  const styleBlock = (
    <style>{`
      @keyframes ctx-fade {
        from { opacity:0; transform:translateY(5px); }
        to   { opacity:1; transform:translateY(0); }
      }
      @keyframes ctx-slideup {
        from { transform:translateY(100%); }
        to   { transform:translateY(0); }
      }
    `}</style>
  );

  // 모바일: 풀스크린 + 백드롭
  if (isMobile) {
    return (
      <div
        style={{ position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:1200,
          background:'rgba(15,23,42,.55)',
          WebkitBackdropFilter:'blur(6px)', backdropFilter:'blur(6px)',
          display:'flex',alignItems:'stretch',justifyContent:'center' }}
        onClick={onClose}
      >
        {modalInner}
        {styleBlock}
      </div>
    );
  }

  // 데스크톱: 백드롭 없는 팝업 창 (드래그 + 리사이즈)
  return (
    <div
      style={{ position:'fixed',
        left:pos.x, top:pos.y, zIndex:1200,
        fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif" }}
    >
      {modalInner}
      {styleBlock}
    </div>
  );
}

// 구약 (OT) 팔레트: 보라 계열 · 신약 (NT) 팔레트: 블루 계열 · 활성 칩은 진한 그래디언트 + 위로 튀어오름
const BOOK_CHIP_PALETTE = {
  OT: {
    label: '구약 · OT',
    tabBg: 'rgba(139,92,246,.12)',
    tabBorder: 'rgba(139,92,246,.4)',
    tabText: '#6d28d9',
    baseBg: 'rgba(139,92,246,.09)',
    baseBorder: 'rgba(139,92,246,.32)',
    baseText: '#5b21b6',
    hoverBg: 'rgba(139,92,246,.22)',
    hoverText: '#4c1d95',
    hoverBorder: 'rgba(139,92,246,.55)',
    activeBg: 'linear-gradient(180deg, #a78bfa 0%, #7c3aed 100%)',
    activeBorder: '#6d28d9',
    activeShadow: '0 -2px 6px rgba(124,58,237,.4), 0 4px 10px rgba(124,58,237,.3)',
    fadeTint: 'rgba(124,58,237,.22)', // JUMP 로 이어지는 그라데이션 톤
  },
  NT: {
    label: '신약 · NT',
    tabBg: 'rgba(37,99,235,.12)',
    tabBorder: 'rgba(37,99,235,.4)',
    tabText: '#1d4ed8',
    baseBg: 'rgba(37,99,235,.08)',
    baseBorder: 'rgba(37,99,235,.28)',
    baseText: '#1e40af',
    hoverBg: 'rgba(37,99,235,.2)',
    hoverText: '#1e3a8a',
    hoverBorder: 'rgba(37,99,235,.55)',
    activeBg: 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
    activeBorder: '#1d4ed8',
    activeShadow: '0 -2px 6px rgba(37,99,235,.4), 0 4px 10px rgba(37,99,235,.3)',
    fadeTint: 'rgba(37,99,235,.22)',
  },
};

// 완성된 성경 표시용 red dot (칩 우상단)
const completedDotStyle = {
  position: 'absolute',
  top: -3,
  right: -3,
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#dc2626',
  border: '1.5px solid #ffffff',
  boxShadow: '0 1px 3px rgba(220,38,38,.5)',
  pointerEvents: 'none',
  zIndex: 4,
};

// 다이어리 인덱스 탭 스타일 (책 약어 칩)
// 활성 칩: 위로 4px 튀어오름 · 상단 코너 크게 라운드 · testament 컬러 그래디언트
// 비활성 칩: testament 별 톤 유지 · 굵은 볼드로 가독성 확보
const bookChipStyle = (isActive, testament) => {
  const p = BOOK_CHIP_PALETTE[testament];
  return {
    padding: isActive ? '6px 12px 8px' : '4px 9px',
    background: isActive ? p.activeBg : p.baseBg,
    color: isActive ? '#ffffff' : p.baseText,
    border: isActive
      ? `1px solid ${p.activeBorder}`
      : `1px solid ${p.baseBorder}`,
    borderRadius: isActive ? '10px 10px 3px 3px' : '5px',
    fontSize: isActive ? 12.5 : 11.5,
    fontWeight: isActive ? 800 : 700,
    transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: isActive
      ? `${p.activeShadow}, inset 0 1px 0 rgba(255,255,255,.4)`
      : 'none',
    cursor: 'pointer',
    transition: 'background .15s, color .15s, border-color .15s, transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .18s',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    letterSpacing: '.01em',
    fontFamily: "'Inter','Pretendard',-apple-system,sans-serif",
    userSelect: 'none',
    position: 'relative',
    zIndex: isActive ? 3 : 1,
    minHeight: isActive ? 32 : 24,
    display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    fontVariantNumeric: 'tabular-nums',
    textShadow: isActive ? '0 1px 1px rgba(0,0,0,.18)' : 'none',
  };
};

const popupIconBtn = {
  background: 'rgba(255,255,255,.15)',
  border: 'none',
  borderRadius: 6,
  color: '#fff',
  fontSize: 11,
  fontWeight: 700,
  minWidth: 28, height: 26,
  padding: '0 6px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};

// #D4994F 톤 팔레트 (warm ochre/mustard) ─────────────────────────────
// base:     #D4994F  (기준)
// dark:     #8A6027  (라벨 · 스텝 아이콘)
// deep:     #4A3210  (값 텍스트 · 최대 대비)
// tint-90:  #FDF8EE  (컨테이너 배경)
// tint-70:  #F5E4C7  (호버 스텝 배경)
// border:   rgba(212,153,79,.35)
// hover:    rgba(212,153,79,.65)
const fontPanelWrapper = {
  marginLeft: 'auto',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
  padding: '5px 10px',
  background: 'rgba(253,248,238,.85)',
  border: '1px solid rgba(212,153,79,.38)',
  borderRadius: 10,
  WebkitBackdropFilter: 'blur(8px) saturate(180%)',
  backdropFilter: 'blur(8px) saturate(180%)',
  boxShadow: '0 1px 2px rgba(212,153,79,.12)',
};

const fontPanelBrand = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  paddingRight: 2,
};

const fontStepper = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const fontStepperLabel = {
  fontSize: 10.5,
  fontWeight: 700,
  color: '#8A6027',
  letterSpacing: '.01em',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif",
};

const fontStepperInner = {
  display: 'inline-flex',
  alignItems: 'stretch',
  background: 'rgba(212,153,79,.09)',
  border: '1px solid rgba(212,153,79,.32)',
  borderRadius: 7,
  overflow: 'hidden',
  height: 24,
};

const stepBtn = {
  width: 24, height: 24,
  border: 'none',
  background: 'transparent',
  color: '#8A6027',
  fontSize: 14, fontWeight: 600, lineHeight: 1,
  cursor: 'pointer',
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center',
  transition: 'background .12s, color .12s',
  fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
};

const stepValue = {
  fontSize: 11.5,
  fontWeight: 700,
  color: '#4A3210',
  minWidth: 22,
  padding: '0 4px',
  display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center',
  fontVariantNumeric: 'tabular-nums',
  fontFamily: "'SF Mono', 'JetBrains Mono', 'Menlo', ui-monospace, monospace",
  borderLeft: '1px solid rgba(212,153,79,.32)',
  borderRight: '1px solid rgba(212,153,79,.32)',
  background: 'rgba(255,251,243,.85)',
};
