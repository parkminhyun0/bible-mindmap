import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import useMobile from '../hooks/useMobile';

const BASE = import.meta.env.BASE_URL;
const BOOK = { ko: '로마서', bollsNum: 45, lexId: 'Rom' };
const CHAPTERS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];

const strip = (s) => s ? s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';

// ── 담화 접속사 규칙 (우선순위 순) ─────────────────────────────────────────
const DISCOURSE_RULES = [
  { id: 'rhetorical_q', role: '수사적 질문', icon: '❓', color: '#f59e0b', bg: 'rgba(245,158,11,.12)',
    gr: 'τί οὖν', tr: '티 운',
    desc: '바울이 예상되는 반론을 스스로 질문으로 제기합니다. 독자의 생각을 대신 말하고 직접 반박하는 수사적 장치입니다.',
    match: (s) => s.has('G5101') && s.has('G3767') },
  { id: 'me_genoito', role: '강한 반박', icon: '⛔', color: '#ef4444', bg: 'rgba(239,68,68,.12)',
    gr: 'μὴ γένοιτο', tr: '메 게노이토',
    desc: '"절대로 그럴 수 없다!" 헬라어에서 가장 강한 부정 표현. 바울이 앞의 수사적 질문을 단호하게 부정합니다.',
    match: (s) => s.has('G3361') && s.has('G1096') },
  { id: 'major_concl', role: '대 결론', icon: '🏁', color: '#10b981', bg: 'rgba(16,185,129,.12)',
    gr: 'ἄρα', tr: '아라',
    desc: '긴 논증 끝에 바울이 핵심 결론을 선언합니다. 앞서 쌓아온 모든 논거가 이 한 절로 수렴됩니다.',
    match: (s) => s.has('G0686') },
  { id: 'concl', role: '결론·적용', icon: '✅', color: '#6366f1', bg: 'rgba(99,102,241,.12)',
    gr: 'οὖν', tr: '운',
    desc: '앞 논증에서 이끌어낸 결론 또는 실천적 적용입니다.',
    match: (s) => s.has('G3767') },
  { id: 'contrast', role: '대조·전환', icon: '↔', color: '#f87171', bg: 'rgba(248,113,113,.12)',
    gr: 'ἀλλά', tr: '알라',
    desc: '앞 내용과 대조되는 새로운 방향이 시작됩니다.',
    match: (s) => s.has('G0235') },
  { id: 'reason', role: '이유·설명', icon: '💡', color: '#fbbf24', bg: 'rgba(251,191,36,.1)',
    gr: 'γάρ', tr: '가르',
    desc: '앞 주장이나 사실에 대한 근거를 설명합니다. 개역한글에서 "이는", "왜냐하면"으로 번역되거나 생략됩니다.',
    match: (s) => s.has('G1063') },
  { id: 'purpose', role: '목적', icon: '🎯', color: '#34d399', bg: 'rgba(52,211,153,.1)',
    gr: 'ἵνα', tr: '히나',
    desc: '행동이나 사건의 목적과 의도를 밝힙니다.',
    match: (s) => s.has('G2443') },
];

// ── 신학 핵심어 ───────────────────────────────────────────────────────────
const THEO_TERMS = {
  'G0266': { ko: '죄',   color: '#ef4444' },
  'G5485': { ko: '은혜', color: '#22d3ee' },
  'G3551': { ko: '율법', color: '#f59e0b' },
  'G4151': { ko: '성령', color: '#10b981' },
  'G2222': { ko: '생명', color: '#34d399' },
  'G2288': { ko: '사망', color: '#94a3b8' },
  'G1343': { ko: '의',   color: '#a78bfa' },
  'G4102': { ko: '믿음', color: '#60a5fa' },
};

// ── 분석 함수 ─────────────────────────────────────────────────────────────
function analyzeVerse(words) {
  if (!words?.length) return { discourse: null, theoTerms: [], strongsSet: new Set(), isParaBreak: false };
  const strongsSet = new Set(words.map(w => w.s));
  const discourse  = DISCOURSE_RULES.find(r => r.match(strongsSet)) || null;
  const isParaBreak = !!discourse && ['rhetorical_q', 'major_concl'].includes(discourse.id);

  const seen = new Set();
  const theoTerms = [];
  for (const w of words) {
    if (THEO_TERMS[w.s] && !seen.has(w.s)) {
      theoTerms.push({ strongs: w.s, ...THEO_TERMS[w.s] });
      seen.add(w.s);
    }
  }
  return { discourse, theoTerms, strongsSet, isParaBreak };
}

function calcChapterTheoFreq(lexData) {
  const freq = {};
  for (const words of Object.values(lexData)) {
    if (!Array.isArray(words)) continue;
    const seen = new Set();
    for (const w of words) {
      if (THEO_TERMS[w.s] && !seen.has(w.s)) {
        freq[w.s] = (freq[w.s] || 0) + 1;
        seen.add(w.s);
      }
    }
  }
  return freq;
}

// ── 단락 그룹화 ───────────────────────────────────────────────────────────
function buildParagraphs(krv, analyzed) {
  const paragraphs = [];
  let cur = null;

  for (const { verse } of krv) {
    const ana  = analyzed[verse];
    const isBreak = !cur || ana?.isParaBreak;
    if (isBreak) {
      if (cur) paragraphs.push(sealParagraph(cur));
      cur = { startVerse: verse, verses: [], discourseIds: [], theoCounts: {} };
    }
    cur.verses.push(verse);
    if (ana?.discourse) cur.discourseIds.push(ana.discourse.id);
    ana?.theoTerms?.forEach(t => { cur.theoCounts[t.strongs] = (cur.theoCounts[t.strongs] || 0) + 1; });
  }
  if (cur) paragraphs.push(sealParagraph(cur));
  return paragraphs;
}

function sealParagraph(p) {
  const topTheo = Object.entries(p.theoCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 2)
    .map(([s]) => THEO_TERMS[s]?.ko).filter(Boolean);
  const openRule = DISCOURSE_RULES.find(r => r.id === p.discourseIds[0]) || null;
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

function buildIndentLevels(analyzed, qaPairs, krv) {
  const lv = {};
  for (const { verse } of krv) {
    const ana = analyzed[verse];
    const qa  = qaPairs[verse];
    const id  = ana?.discourse?.id;
    if (qa?.type === 'A')        lv[verse] = 1;
    else if (id === 'reason')    lv[verse] = 1;
    else if (id === 'purpose')   lv[verse] = 1;
    else                          lv[verse] = 0;
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

  // ── 팝업 창 상태 (데스크톱 전용) ──────────────────────────────────────
  const [minimized, setMinimized] = useState(false);
  const [fontSize, setFontSize]   = useState(14); // 11~22
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

  const scrollRef = useRef(null);
  const obsRef    = useRef(null);
  const dragging  = useRef(false);
  const resizing  = useRef(false);
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
    };
    const onUp = () => { dragging.current = false; resizing.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isMobile]);

  // ── 단일 장 로드 ────────────────────────────────────────────────────────
  const loadChapter = useCallback(async (ch) => {
    const [krvRaw, lexData] = await Promise.all([
      fetch(`https://bolls.life/get-text/KRV/${BOOK.bollsNum}/${ch}/`).then(r => {
        if (!r.ok) throw new Error(`KRV ${ch}장 HTTP ${r.status}`);
        return r.json();
      }),
      fetch(`${BASE}data/lex/gnt/${BOOK.lexId}/${ch}.json`).then(r => {
        if (!r.ok) throw new Error(`lex ${ch}장 HTTP ${r.status}`);
        return r.json();
      }),
    ]);
    const krv = krvRaw.map(v => ({ verse: Number(v.verse), text: strip(v.text) }));
    const analyzed = {};
    for (const [v, words] of Object.entries(lexData)) {
      analyzed[Number(v)] = analyzeVerse(words);
    }
    const theoFreq     = calcChapterTheoFreq(lexData);
    const paragraphs   = buildParagraphs(krv, analyzed);
    const qaPairs      = detectQAPairs(analyzed, krv);
    const indentLevels = buildIndentLevels(analyzed, qaPairs, krv);
    return { krv, lex: lexData, analyzed, theoFreq, paragraphs, qaPairs, indentLevels };
  }, []);

  // ── 로마서 전체 로드 (실패 챕터 격리) ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setFailedChapters([]);

    Promise.allSettled(CHAPTERS.map(ch => loadChapter(ch).then(v => [ch, v])))
      .then(results => {
        if (cancelled) return;
        const ok = [];
        const failed = [];
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') ok.push(r.value);
          else failed.push({ ch: CHAPTERS[i], err: r.reason?.message || '로드 실패' });
        });
        setChapters(Object.fromEntries(ok));
        setFailedChapters(failed);
        if (ok.length === 0) setError('모든 장 로드 실패 — 네트워크 확인 후 재시도');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [loadChapter]);

  // ── 실패 챕터 재시도 ──────────────────────────────────────────────────────
  const retryFailed = useCallback(async () => {
    if (!failedChapters.length || retrying) return;
    setRetrying(true);
    const chs = failedChapters.map(f => f.ch);
    const results = await Promise.allSettled(chs.map(ch => loadChapter(ch).then(v => [ch, v])));
    const newOk = {};
    const stillFailed = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        const [ch, v] = r.value;
        newOk[ch] = v;
      } else {
        stillFailed.push({ ch: chs[i], err: r.reason?.message || '로드 실패' });
      }
    });
    setChapters(prev => ({ ...prev, ...newOk }));
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

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

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

  const scrollTo = useCallback((ch, verse) => {
    setActiveRef({ ch, verse });
    requestAnimationFrame(() => {
      scrollRef.current
        ?.querySelector(`[data-ch="${ch}"][data-verse="${verse}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

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
        const discourse = analyzeVerse(words).discourse;
        refs.push({ ch, verse: verseNum, text, discourse });
      }
    }
    setThreadData(refs);
    setThreadLoading(false);
  }, [chapters]);

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
            ) : (
              <>
                <span style={{ fontSize:16,flexShrink:0 }}>📖</span>
                <span style={{ fontSize:14,fontWeight:800,color:'#fff',flexShrink:0,letterSpacing:'.02em' }}>
                  문맥 성경 — {BOOK.ko} {activeRef.ch}:{activeRef.verse}
                </span>
                {!minimized && (
                  <span style={{ fontSize:11,color:'rgba(255,255,255,.7)',flexShrink:0 }}>
                    · 헬라어 담화구조
                  </span>
                )}
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
            {!isMobile && !minimized && (
              <>
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => setFontSize(v => Math.max(11, v - 1))}
                  title="글자 작게"
                  style={popupIconBtn}>A－</button>
                <span style={{ fontSize:10,color:'rgba(255,255,255,.85)',
                  minWidth:24,textAlign:'center',fontWeight:700 }}>{fontSize}</span>
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => setFontSize(v => Math.min(22, v + 1))}
                  title="글자 크게"
                  style={popupIconBtn}>A＋</button>
                <div style={{ width:1,height:18,background:'rgba(255,255,255,.2)',margin:'0 4px' }} />
              </>
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
        {/* ── 담화 레전드 (모바일은 접힘 가능) ── */}
        {(!isMobile || legendOpen) && (
          <div style={{ display:'flex',alignItems:'center',
            gap: isMobile?10:10,
            flexWrap: isMobile?'nowrap':'wrap',
            overflowX: isMobile?'auto':'visible',
            padding: isMobile?'8px 14px':'8px 22px',
            borderBottom:'1px solid rgba(15,23,42,.06)',
            flexShrink:0,background:'rgba(15,23,42,.02)' }}>
            {DISCOURSE_RULES.map(r => (
              <span key={r.id} style={{ fontSize: isMobile?10:9,color:r.color,fontWeight:800,
                display:'flex',alignItems:'center',gap:4,flexShrink:0 }}>
                <span style={{ width: isMobile?6:5,height: isMobile?6:5,borderRadius:'50%',background:r.color,
                  flexShrink:0,display:'inline-block' }} />
                {r.role}
              </span>
            ))}
          </div>
        )}

        {/* ── 논증 흐름 미니맵 (데스크톱만) ── */}
        {!isMobile && chReady && flowMap.length > 0 && (
          <div style={{ display:'flex',alignItems:'center',gap:3,
            padding: isMobile?'5px 14px':'6px 22px',
            overflowX:'auto',borderBottom:'1px solid rgba(15,23,42,.05)',
            flexShrink:0,background:'rgba(15,23,42,.03)' }}>
            <span style={{ fontSize:9,color:'#64748b',fontWeight:700,flexShrink:0,marginRight:4 }}>
              {activeRef.ch}장 흐름
            </span>
            {flowMap.map(({ verse, discourse: d, isActive }) => (
              <div key={verse}
                onClick={() => scrollTo(activeRef.ch, verse)}
                title={`${activeRef.ch}:${verse}${d ? ` · ${d.role}` : ''}`}
                style={{ width:isActive?20:10,height:isActive?20:10,borderRadius:'50%',
                  background: d ? d.color : 'rgba(15,23,42,.15)',
                  border: isActive ? `2px solid ${d?.color||'#0f172a'}` : 'none',
                  boxShadow: isActive ? `0 0 8px ${d?.color||'#0f172a'}80` : 'none',
                  cursor:'pointer',flexShrink:0,transition:'all .15s',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:8,color:'#fff' }}>
                {isActive && <span>{verse}</span>}
              </div>
            ))}
          </div>
        )}

        {/* ── 바디 ── */}
        <div style={{ display:'flex',flex:1,overflow:'hidden',position:'relative' }}>

          {/* 좌: 전체 본문 (연속 스크롤) */}
          <div ref={scrollRef} style={{ flex:1,overflowY:'auto',
            padding: isMobile?'8px 10px':'10px 12px',
            borderRight: isMobile?'none':'1px solid rgba(15,23,42,.06)' }}>

            {loading && (
              <div style={{ color:'#64748b',textAlign:'center',marginTop:60,fontSize:13 }}>
                로마서 전체 로드 중… (16장)
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
                gap:8,padding:'8px 12px',marginBottom:10,
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

            {chReady && CHAPTERS.map(ch => {
              const chData = chapters[ch];
              if (!chData) return null;
              return (
                <div key={ch} style={{ marginBottom:22 }}>
                  {/* 장 구분 헤더 (스크롤 앵커) */}
                  <div style={{ display:'flex',alignItems:'center',gap:10,
                    padding:'12px 8px 6px',marginTop:ch===1?0:12,
                    borderTop: ch===1 ? 'none' : '2px solid rgba(15,23,42,.08)' }}>
                    <span style={{ fontSize:22,fontWeight:800,color:'#0f172a',
                      letterSpacing:'-.02em' }}>
                      {ch}<span style={{ fontSize:14,color:'#94a3b8',marginLeft:3,fontWeight:600 }}>장</span>
                    </span>
                    <span style={{ fontSize:10,color:'#94a3b8' }}>
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
                        <span style={{ fontSize:9,fontWeight:800,color:'#64748b' }}>§{pIdx+1}</span>
                        <span style={{ fontSize:9,color:'#94a3b8' }}>
                          {ch}:{para.startVerse}–{para.endVerse}
                        </span>
                        <span style={{ fontSize:10,fontWeight:700,
                          color: para.openRule?.color || '#475569' }}>
                          {para.topTheo.length > 0 ? para.topTheo.join('·') : (para.openRule?.role || '서술')}
                        </span>
                        {para.openRule && (
                          <span style={{ fontSize:9,color:'#94a3b8',marginLeft:'auto' }}>
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
                            <div style={{ flexShrink:0,width: isMobile?42:38,display:'flex',flexDirection:'column',
                              alignItems:'center',gap:2,marginTop:2 }}>
                              <span style={{ fontSize: isMobile?11:10,fontWeight:700,
                                color: isActive ? (qaAmber ? '#d97706' : (d?.color || '#475569')) : '#64748b' }}>
                                {ch}:{verse}
                              </span>
                              {d && <span title={d.role} style={{ fontSize: isMobile?13:11,lineHeight:1 }}>{d.icon}</span>}
                              {qa && (
                                <span style={{
                                  fontSize:8, fontWeight:800, lineHeight:1,
                                  padding:'1px 4px', borderRadius:3,
                                  background: qa.type === 'A' ? 'rgba(239,68,68,.15)' : 'rgba(245,158,11,.22)',
                                  color: qa.type === 'A' ? '#dc2626' : '#b45309',
                                }}>{qa.type === 'QA' ? 'Q·A' : qa.type}</span>
                              )}
                            </div>

                            <div style={{ flex:1,minWidth:0 }}>
                              <div style={{ fontSize: isMobile?16:fontSize,color:'#1e293b',
                                lineHeight: isMobile?1.75:1.85,wordBreak:'keep-all' }}>
                                {vData.text}
                              </div>
                              {ana.theoTerms.length > 0 && (
                                <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginTop:5 }}>
                                  {ana.theoTerms.map(t => (
                                    <span key={t.strongs}
                                      onClick={e => { e.stopPropagation(); startThread(t.strongs); }}
                                      title={`"${t.ko}" 로마서 전체 추적 →`}
                                      style={{ fontSize:9,fontWeight:700,color:t.color,
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
              width: isMobile ? '100%' : 296,
              flexShrink: 0,
              overflowY: isMobile && sheetSnap === 'full' ? 'auto' : 'hidden',
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
                    로마서 전체 스캔 중…
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize:10,color:'#64748b',marginBottom:12 }}>
                      로마서 전체 <strong style={{ color:THEO_TERMS[threadStrongs]?.color }}>
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
              <div style={{ color:'#94a3b8',fontSize:12,textAlign:'center',marginTop:50 }}>
                절을 클릭하거나<br/>스크롤하면 분석이 표시됩니다
              </div>
            )}

            {rightMode === 'verse' && activeData && (() => {
              const { discourse, theoTerms } = activeAna;
              const qa = activeQaPairs[activeRef.verse];
              const maxFreq = activeTheoFreq && Math.max(1, ...Object.values(activeTheoFreq));

              return (
                <div key={`${activeRef.ch}-${activeRef.verse}`} style={{ animation:'ctx-fade .2s ease' }}>

                  <div style={{ fontSize:11,fontWeight:700,color:'#b45309',marginBottom:12 }}>
                    {BOOK.ko} {activeRef.ch}:{activeRef.verse}
                  </div>

                  {discourse ? (
                    <div style={{ background:discourse.bg,
                      border:`1px solid ${discourse.color}55`,
                      borderLeft:`4px solid ${discourse.color}`,
                      borderRadius:10,padding:'12px 14px',marginBottom:12 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:8 }}>
                        <span style={{ fontSize:18 }}>{discourse.icon}</span>
                        <div>
                          <div style={{ fontSize:13,fontWeight:800,color:discourse.color }}>
                            {discourse.role}
                          </div>
                          <div style={{ fontSize:10,color:'#64748b',marginTop:1 }}>헬라어 신호어</div>
                        </div>
                      </div>
                      <div style={{ background:'#ffffff',border:`1px solid ${discourse.color}30`,
                        borderRadius:6,padding:'6px 10px',marginBottom:10 }}>
                        <span style={{ fontSize:18,fontWeight:700,color:discourse.color,
                          fontFamily:"'Gentium Plus', serif" }}>{discourse.gr}</span>
                        <span style={{ fontSize:10,color:'#64748b',marginLeft:8 }}>
                          ({discourse.tr})
                        </span>
                      </div>
                      <p style={{ fontSize:12,color:'#334155',lineHeight:1.7,margin:0 }}>
                        {discourse.desc}
                      </p>
                    </div>
                  ) : (
                    <div style={{ background:'#ffffff',
                      border:'1px solid rgba(15,23,42,.08)',
                      borderRadius:10,padding:'10px 14px',marginBottom:12,
                      fontSize:12,color:'#475569' }}>
                      📝 <strong style={{ color:'#0f172a' }}>진술</strong>
                      <p style={{ margin:'6px 0 0',lineHeight:1.6 }}>
                        특정 담화 접속사 없이 바울의 논증이나 사실을 서술합니다.
                      </p>
                    </div>
                  )}

                  {qa && (
                    <div style={{ background:'rgba(245,158,11,.1)',
                      border:'1px solid rgba(245,158,11,.35)',
                      borderRadius:8,padding:'8px 12px',marginBottom:12 }}>
                      <div style={{ fontSize:10,fontWeight:700,color:'#b45309',marginBottom:4 }}>
                        수사적 Q&A 쌍
                      </div>
                      <div style={{ fontSize:11,color:'#475569',lineHeight:1.5 }}>
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
                          style={{ marginTop:6,fontSize:9,background:'rgba(245,158,11,.2)',
                            border:'1px solid rgba(245,158,11,.4)',color:'#b45309',
                            borderRadius:5,padding:'2px 8px',cursor:'pointer' }}>
                          {qa.type === 'Q' ? '↓ 반박 절로' : '↑ 질문 절로'}
                        </button>
                      )}
                    </div>
                  )}

                  {theoTerms.length > 0 && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:10,fontWeight:700,color:'#475569',
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
                                style={{ fontSize:11,fontWeight:700,color:t.color,cursor:'pointer',
                                  borderBottom:`1px dotted ${t.color}80`,paddingBottom:1 }}>{t.ko}</span>
                              <span style={{ fontSize:10,color:'#64748b' }}>{freq}절/{activeRef.ch}장</span>
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

                  {Object.keys(activeTheoFreq).length > 0 && (
                    <div style={{ background:'#ffffff',
                      border:'1px solid rgba(15,23,42,.08)',
                      borderRadius:10,padding:'10px 12px' }}>
                      <div style={{ fontSize:10,fontWeight:700,color:'#475569',
                        marginBottom:8,letterSpacing:'.06em' }}>
                        {activeRef.ch}장 전체 핵심어 분포
                      </div>
                      {Object.entries(activeTheoFreq).sort((a,b) => b[1]-a[1]).map(([s, freq]) => {
                        const t = THEO_TERMS[s];
                        if (!t) return null;
                        return (
                          <div key={s} style={{ display:'flex',alignItems:'center',gap:6,marginBottom:5 }}>
                            <span onClick={() => startThread(s)}
                              style={{ fontSize:10,fontWeight:700,color:t.color,
                                width:28,flexShrink:0,cursor:'pointer',
                                borderBottom:`1px dotted ${t.color}80` }}>{t.ko}</span>
                            <div style={{ flex:1,background:'rgba(15,23,42,.08)',
                              borderRadius:99,height:5,overflow:'hidden' }}>
                              <div style={{ width:`${Math.round((freq/maxFreq)*100)}%`,height:'100%',
                                background:t.color,borderRadius:99 }} />
                            </div>
                            <span style={{ fontSize:10,color:'#64748b',
                              width:20,textAlign:'right',flexShrink:0 }}>{freq}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
            </div>
          </div>
        </div>

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
                <span style={{ fontSize:15,fontWeight:800,color:'#0f172a' }}>로마서 목차</span>
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
