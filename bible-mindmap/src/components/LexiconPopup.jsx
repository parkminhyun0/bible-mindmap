import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchStrongDefinition, fetchStrongConcordance, humanizeMorph, linkifyDefinition, evictStrongDefinitionCache } from '../utils/lexicon';
import { getBook } from '../data/bibleBooks';
import { useCanvas } from '../context/CanvasContext';
import useMobile from '../hooks/useMobile';
import OriginalLanguageResearchActions from './OriginalLanguageResearchActions';
import { KOREAN_GLOSS_ACTIVE } from '../data/koreanGlossActive';
import LexiconDefinitionTree from './LexiconDefinitionTree';
import { normalizeHebrewLexicalForm, normalizeHebrewSurfaceForm } from '../utils/hebrewLexicalForm';
import { buildHebrewWordComposition, humanizeHebrewMorphCode } from '../utils/hebrewMorphologyDisplay';
import { resolveSurfaceKoreanTransliteration } from '../utils/surfaceKoreanTransliteration';
import './LexiconPopup.css';

const POPUP_MIN_WIDTH = 340;
const POPUP_MIN_HEIGHT = 300;
const POPUP_VIEWPORT_MARGIN = 12;
const DEFAULT_DESKTOP_WIDTH = 760;
const DEFAULT_DESKTOP_HEIGHT = 620;
const THREE_COLUMN_MIN_WIDTH = 720;

// HOT가 일부 토큰에서 lemma를 생략하는 경우의 최소 원형 보정.
// H0776 창 1:2는 וְ/הָ/אָ֗רֶץ만 제공하므로 접두사·관사를 제거한
// 사전 원형 אֶרֶץ를 명시한다.
const HEBREW_LEMMA_FALLBACKS = {
  H776: 'אֶרֶץ',
};

const HEBREW_SURFACE_SEGMENT_FALLBACKS = {
  H776: ['וְ', 'הָ', 'אָרֶץ'],
};

function clampSize(width, height, vw, vh) {
  const maxW = Math.max(POPUP_MIN_WIDTH, vw - POPUP_VIEWPORT_MARGIN * 2);
  const maxH = Math.max(POPUP_MIN_HEIGHT, vh - POPUP_VIEWPORT_MARGIN * 2);
  return {
    width: Math.min(Math.max(POPUP_MIN_WIDTH, width), maxW),
    height: Math.min(Math.max(POPUP_MIN_HEIGHT, height), maxH),
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function baseDesktopPosition(anchor, width, height, vw, vh) {
  const margin = POPUP_VIEWPORT_MARGIN;
  return {
    left: clamp((anchor?.x ?? vw / 2) - width / 2, margin, vw - width - margin),
    top: clamp((anchor?.y ?? vh / 2) + 8, margin, vh - height - margin),
  };
}

function clampDesktopPosition(left, top, width, height, vw, vh) {
  const margin = POPUP_VIEWPORT_MARGIN;
  return {
    left: clamp(left, margin, vw - width - margin),
    top: clamp(top, margin, vh - height - margin),
  };
}

function resizeHandleStyle(side) {
  const thickness = 8;
  const corner = 14;
  const base = { position: 'absolute', zIndex: 50, background: 'transparent', userSelect: 'none' };
  switch (side) {
    case 'top': return { ...base, top: -4, left: 10, right: 10, height: thickness, cursor: 'ns-resize' };
    case 'bottom': return { ...base, bottom: -4, left: 10, right: 10, height: thickness, cursor: 'ns-resize' };
    case 'left': return { ...base, left: -4, top: 10, bottom: 10, width: thickness, cursor: 'ew-resize' };
    case 'right': return { ...base, right: -4, top: 10, bottom: 10, width: thickness, cursor: 'ew-resize' };
    case 'nw': return { ...base, top: -6, left: -6, width: corner, height: corner, cursor: 'nwse-resize' };
    case 'ne': return { ...base, top: -6, right: -6, width: corner, height: corner, cursor: 'nesw-resize' };
    case 'sw': return { ...base, bottom: -6, left: -6, width: corner, height: corner, cursor: 'nesw-resize' };
    case 'se': return { ...base, bottom: -6, right: -6, width: corner, height: corner, cursor: 'nwse-resize' };
    default: return base;
  }
}

function normalizedStrong(strong) {
  return strong ? strong.replace(/^([HG])0+(?=\d)/, '$1') : '';
}

function strongNumber(strong) {
  if (!strong) return '';
  return strong.replace(/^([GH])0*/, '');
}

function externalStrongHref(strong, isHebrew) {
  const num = strongNumber(strong);
  return num ? `https://biblehub.com/${isHebrew ? 'hebrew' : 'greek'}/${num}.htm` : null;
}

function displayLexicalForm(value, isHebrew) {
  return isHebrew ? normalizeHebrewLexicalForm(value) : (value || '');
}

function displaySurfaceForm(value, isHebrew) {
  return isHebrew ? normalizeHebrewSurfaceForm(value) : (value || '');
}

function resolveKoreanTransliteration(entry) {
  if (entry?.translitKo) return entry.translitKo;
  const key = normalizedStrong(entry?.s);
  const record = (key && KOREAN_GLOSS_ACTIVE[key]) || (entry?.s && KOREAN_GLOSS_ACTIVE[entry.s]) || null;
  if (!record?.translitKo || record.review === false) return null;
  return record.translitKo;
}

function resolveLexicalRecord(entry) {
  const key = normalizedStrong(entry?.s);
  return (key && KOREAN_GLOSS_ACTIVE[key]) || (entry?.s && KOREAN_GLOSS_ACTIVE[entry.s]) || null;
}

// 한글 음역은 학술(SBL) 표기를 기본으로 삼는다. 낱말에 따라 다른 표기가 통용되기도
// 하는데, 그런 경우에만 왜 갈리는지를 음역 바로 아래에 보여 준다.
// 판단 기준은 variants — 실제로 통용되는 다른 표기가 기록된 항목만 대상이다.
// 표기가 갈리지 않는 낱말에까지 설명을 붙이면 화면이 무거워진다.
function resolveTransliterationNote(entry) {
  const key = normalizedStrong(entry?.s);
  const record = (key && KOREAN_GLOSS_ACTIVE[key]) || (entry?.s && KOREAN_GLOSS_ACTIVE[entry.s]) || null;
  if (!record || !Array.isArray(record.variants) || record.variants.length === 0) return null;
  const note = typeof record.note === 'string' ? record.note.trim() : '';
  return note ? { note, variants: record.variants } : null;
}

function morphologyFields(human) {
  if (!human) return [];
  if (human.includes(' | ')) return [{ label: '형태 분석', value: human }];
  const parts = human.split(' · ').filter(Boolean);
  if (!parts.length) return [];
  const pos = parts[0];
  if (pos === '동사' && parts.length >= 4) {
    const looksHebrewStem = ['Qal', 'Niphal', 'Piel', 'Pual', 'Hiphil', 'Hophal', 'Hithpael'].includes(parts[1]);
    const labels = looksHebrewStem
      ? ['품사', '어간 (Binyan)', '시상', '인칭', '성', '수']
      : ['품사', '시제', '태', '법', '인칭', '수'];
    return parts.map((value, index) => ({ label: labels[index] || `형태 ${index}`, value }));
  }
  if (pos === '명사' && parts.length >= 3) {
    const stateLike = ['독립형', '연계형', '한정형'].includes(parts[parts.length - 1]);
    const labels = stateLike ? ['품사', '성', '수', '상태'] : ['품사', '격', '수', '성'];
    return parts.map((value, index) => ({ label: labels[index] || `형태 ${index}`, value }));
  }
  return [{ label: '형태 분석', value: human }];
}

function sourceLabel(isHebrew) {
  return isHebrew ? 'BDB' : "Greek Strong's";
}

export default function LexiconPopup({ entry, anchor, bookId, passage, onClose, zIndex }) {
  const { onAddVerse } = useCanvas() || {};
  const isMobile = useMobile();
  const [tab, setTab] = useState('def');
  const [morphDetailOpen, setMorphDetailOpen] = useState(false);
  const [defReloadNonce, setDefReloadNonce] = useState(0);
  const [definition, setDefinition] = useState(null);
  const [defLoading, setDefLoading] = useState(false);
  const [defError, setDefError] = useState(null);
  const [researchActive, setResearchActive] = useState(false);
  const [usages, setUsages] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState('');

  useEffect(() => {
    if (!entry?.s) return;
    let cancelled = false;
    setDefLoading(true);
    setDefError(null);
    setDefinition(null);
    fetchStrongDefinition(entry.s)
      .then((value) => { if (!cancelled) setDefinition(value); })
      .catch((error) => { if (!cancelled) setDefError(error.message || '조회 실패'); })
      .finally(() => { if (!cancelled) setDefLoading(false); });
    return () => { cancelled = true; };
  }, [entry?.s, defReloadNonce]);

  useEffect(() => {
    if (tab !== 'usage' || usages !== null) return;
    if (!entry?.s || !bookId) { setUsages([]); return; }
    let cancelled = false;
    setUsageLoading(true);
    setUsageError('');
    fetchStrongConcordance(entry.s, bookId)
      .then((list) => { if (!cancelled) setUsages(list); })
      .catch((error) => {
        if (!cancelled) {
          setUsages([]);
          setUsageError(error.message || '관련 구절 로드 실패');
        }
      })
      .finally(() => { if (!cancelled) setUsageLoading(false); });
    return () => { cancelled = true; };
  }, [tab, entry?.s, bookId, usages]);

  useEffect(() => {
    setTab('def');
    setMorphDetailOpen(false);
    setUsages(null);
    setUsageError('');
    setResearchActive(false);
  }, [entry?.s]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !researchActive) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, researchActive]);

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const [popupSize, setPopupSize] = useState(() => clampSize(DEFAULT_DESKTOP_WIDTH, DEFAULT_DESKTOP_HEIGHT, vw, vh));
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef(null);

  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
    setPopupSize(clampSize(DEFAULT_DESKTOP_WIDTH, DEFAULT_DESKTOP_HEIGHT, vw, vh));
  }, [entry?.s]);

  useEffect(() => {
    const onWindowResize = () => {
      setPopupSize((previous) => clampSize(previous.width, previous.height, window.innerWidth, window.innerHeight));
      setDragOffset({ x: 0, y: 0 });
    };
    window.addEventListener('resize', onWindowResize);
    return () => window.removeEventListener('resize', onWindowResize);
  }, []);

  const onDragStart = (event) => {
    if (isMobile || researchActive || event.button !== 0) return;
    event.preventDefault();
    const currentBase = baseDesktopPosition(anchor, popupSize.width, popupSize.height, window.innerWidth, window.innerHeight);
    const currentPosition = clampDesktopPosition(
      currentBase.left + dragOffset.x,
      currentBase.top + dragOffset.y,
      popupSize.width,
      popupSize.height,
      window.innerWidth,
      window.innerHeight,
    );
    dragState.current = {
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startLeft: currentPosition.left,
      startTop: currentPosition.top,
    };
    const onMove = (moveEvent) => {
      if (!dragState.current) return;
      const width = popupSize.width;
      const height = popupSize.height;
      const nextBase = baseDesktopPosition(anchor, width, height, window.innerWidth, window.innerHeight);
      const nextPosition = clampDesktopPosition(
        dragState.current.startLeft + moveEvent.clientX - dragState.current.startMouseX,
        dragState.current.startTop + moveEvent.clientY - dragState.current.startMouseY,
        width,
        height,
        window.innerWidth,
        window.innerHeight,
      );
      setDragOffset({
        x: nextPosition.left - nextBase.left,
        y: nextPosition.top - nextBase.top,
      });
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onResizeStart = (edges) => (event) => {
    if (isMobile || researchActive || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const base = baseDesktopPosition(anchor, popupSize.width, popupSize.height, viewportWidth, viewportHeight);
    const position = clampDesktopPosition(
      base.left + dragOffset.x,
      base.top + dragOffset.y,
      popupSize.width,
      popupSize.height,
      viewportWidth,
      viewportHeight,
    );

    const start = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      left: position.left,
      top: position.top,
      right: position.left + popupSize.width,
      bottom: position.top + popupSize.height,
    };

    const onMove = (moveEvent) => {
      const margin = POPUP_VIEWPORT_MARGIN;
      const currentVw = window.innerWidth;
      const currentVh = window.innerHeight;
      const dx = moveEvent.clientX - start.mouseX;
      const dy = moveEvent.clientY - start.mouseY;

      let left = start.left;
      let top = start.top;
      let right = start.right;
      let bottom = start.bottom;

      if (edges.left) left = clamp(start.left + dx, margin, start.right - POPUP_MIN_WIDTH);
      if (edges.right) right = clamp(start.right + dx, start.left + POPUP_MIN_WIDTH, currentVw - margin);
      if (edges.top) top = clamp(start.top + dy, margin, start.bottom - POPUP_MIN_HEIGHT);
      if (edges.bottom) bottom = clamp(start.bottom + dy, start.top + POPUP_MIN_HEIGHT, currentVh - margin);

      if (!edges.left && left < margin) left = margin;
      if (!edges.top && top < margin) top = margin;
      if (!edges.right && right > currentVw - margin) right = currentVw - margin;
      if (!edges.bottom && bottom > currentVh - margin) bottom = currentVh - margin;

      const nextSize = clampSize(right - left, bottom - top, currentVw, currentVh);
      if (edges.left) left = right - nextSize.width;
      else right = left + nextSize.width;
      if (edges.top) top = bottom - nextSize.height;
      else bottom = top + nextSize.height;

      const nextPosition = clampDesktopPosition(left, top, nextSize.width, nextSize.height, currentVw, currentVh);
      const nextBase = baseDesktopPosition(anchor, nextSize.width, nextSize.height, currentVw, currentVh);

      setPopupSize(nextSize);
      setDragOffset({
        x: nextPosition.left - nextBase.left,
        y: nextPosition.top - nextBase.top,
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (!entry) return null;

  const isHebrew = entry.s?.startsWith('H');
  const surfaceSegments = isHebrew && HEBREW_SURFACE_SEGMENT_FALLBACKS[normalizedStrong(entry.s)]
    ? HEBREW_SURFACE_SEGMENT_FALLBACKS[normalizedStrong(entry.s)].join('/')
    : entry.w;
  const hebrewComposition = isHebrew ? buildHebrewWordComposition(surfaceSegments, entry.m) : [];
  const fullMorphHuman = isHebrew ? humanizeHebrewMorphCode(entry.m) : humanizeMorph(entry.m);
  const primaryMorphHuman = isHebrew
    ? (hebrewComposition[hebrewComposition.length - 1]?.human || fullMorphHuman)
    : fullMorphHuman;
  const morphFields = morphologyFields(primaryMorphHuman);
  const koreanTranslit = resolveKoreanTransliteration(entry);
  const translitNote = resolveTransliterationNote(entry);
  const lexicalRecord = resolveLexicalRecord(entry);
  // 일부 HOT 토큰은 활용형만 있고 `l`(lemma)이 없다. 이때 전체 어형을
  // 사전 원형으로 표시하면 접두사·관사까지 원형에 섞이므로 활성 사전의
  // 검증된 lemma를 먼저 사용한다.
  const lexicalSource = entry.l
    || lexicalRecord?.lemma
    || (isHebrew ? HEBREW_LEMMA_FALLBACKS[normalizedStrong(entry.s)] : '')
    || entry.w
    || '';
  const lemma = displayLexicalForm(lexicalSource, isHebrew) || lexicalSource;
  const surfaceForm = displaySurfaceForm(entry.w, isHebrew) || lemma;
  const segmentedSurfaceForm = isHebrew && hebrewComposition.length > 1
    ? hebrewComposition.map((part) => part.form).filter(Boolean).join(' / ')
    : surfaceForm;
  const surfaceKoreanTranslit = resolveSurfaceKoreanTransliteration(entry.w, isHebrew);
  const partOfSpeech = definition?.meta?.partOfSpeech || morphFields.find((field) => field.label === '품사')?.value || '—';
  const source = sourceLabel(isHebrew);
  const strongHref = externalStrongHref(entry.s, isHebrew);

  const width = isMobile ? vw : popupSize.width;
  const height = isMobile ? Math.round(vh * 0.88) : popupSize.height;
  const base = isMobile ? { left: 0, top: vh - height } : baseDesktopPosition(anchor, width, height, vw, vh);
  const desktopPosition = isMobile
    ? base
    : clampDesktopPosition(base.left + dragOffset.x, base.top + dragOffset.y, width, height, vw, vh);
  const left = isMobile ? 0 : desktopPosition.left;
  const top = isMobile ? base.top : desktopPosition.top;
  const resolvedZIndex = researchActive ? Math.min(zIndex ?? 2501, 1200) : (zIndex ?? 2501);
  const threeColumn = !isMobile && popupSize.width >= THREE_COLUMN_MIN_WIDTH;

  const metaCells = [
    ['Strong', entry.s || '—'],
    ['Lemma', lemma || '—'],
    ['어형 학술 음역', entry.tr || '—'],
    ['어형 한글 음역', surfaceKoreanTranslit || '검토 대기'],
    ['Part of speech', partOfSpeech],
  ];

  const leftFields = [
    ['사전 원형', lemma],
    ['원형 학술 음역 (SBL)', lexicalRecord?.translit],
    ['원형 한글 음역', koreanTranslit],
    ['실제 어형', surfaceForm],
    ['어형 학술 음역 (SBL)', entry.tr],
    ...(surfaceKoreanTranslit ? [
      ['어형 한글 음역', surfaceKoreanTranslit],
      ['표기 기준', 'SBL 학술 음역 / 검토 완료 한글 음역 병기'],
    ] : []),
    ...morphFields.map((field) => [field.label, field.value]),
    ['TWOT', definition?.meta?.twot],
  ].filter(([, value]) => value);

  const popup = (
    <div
      role="dialog"
      aria-modal={isMobile ? 'true' : 'false'}
      aria-label={`원어 사전 · ${entry.w || lemma || entry.tr || entry.s || ''}`}
      aria-hidden={researchActive ? 'true' : undefined}
      className={`lexicon-popup-v2${isMobile ? ' lexicon-popup-v2--mobile momentum-scroll' : ''}`}
      style={{
        left,
        top,
        width,
        height: isMobile ? undefined : height,
        maxHeight: isMobile ? height : undefined,
        zIndex: resolvedZIndex,
        pointerEvents: researchActive ? 'none' : 'auto',
        opacity: researchActive ? 0.72 : 1,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="lexicon-titlebar" onMouseDown={onDragStart}>
        <div className="lexicon-title-left">
          <div className={`lexicon-title-lemma${isHebrew ? ' is-hebrew' : ''}`} data-testid="popup-headword">{lemma}</div>
          <div className="lexicon-title-translit">
            {entry.tr && <span>{entry.tr}</span>}
            {lexicalRecord?.translit && <><span className="lexicon-dot">·</span><span>원형 학술 음역: {lexicalRecord.translit}</span></>}
            {koreanTranslit && <><span className="lexicon-dot">·</span><span>원형 한글 음역: <span data-testid="popup-translit-ko">{koreanTranslit}</span></span></>}
            {entry.s && <><span className="lexicon-dot">·</span><span>{entry.s}</span></>}
          </div>
          <span className="lexicon-source-badge">Source: <span data-testid="popup-source-badge">{isHebrew ? 'BDB' : "Strong's"}</span></span>
        </div>
        <button className="lexicon-close" onClick={onClose} onMouseDown={(event) => event.stopPropagation()} title="닫기 (Esc)">×</button>
      </header>

      <div className="lexicon-topmeta" data-testid="popup-meta-strip">
        {metaCells.map(([label, value]) => (
          <div className="lexicon-meta-cell" key={label}>
            <div className="lexicon-meta-key">{label}</div>
            <div className={`lexicon-meta-value${label === 'Lemma' && isHebrew ? ' is-hebrew' : ''}`}>{value}</div>
          </div>
        ))}
      </div>

      {translitNote && (
        <div className="lexicon-translit-note" data-testid="popup-translit-note">
          <span className="lexicon-translit-note__variants">
            다른 표기: {translitNote.variants.join(' · ')}
          </span>
          <p className="lexicon-translit-note__text">{translitNote.note}</p>
        </div>
      )}

      <nav className="lexicon-tabs" aria-label="원어 사전 탭">
        {[
          ['def', '사전 정의'],
          ['usage', '관련 구절'],
          ['analysis', '형태·원어 분석'],
        ].map(([key, label]) => (
          <button key={key} className={`lexicon-tab${tab === key ? ' is-active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>

      <div className={`lexicon-content${threeColumn ? ' is-three-column' : ''}`}>
        {threeColumn && (
          <aside className="lexicon-side lexicon-side--left" data-testid="lexicon-morph-summary">
            <h4>형태 정보</h4>
            <dl>
              {leftFields.map(([label, value]) => (
                <div className="lexicon-side-field" key={`${label}-${String(value)}`}>
                  <dt>{label}</dt>
                  <dd className={isHebrew && (label === '사전 원형' || label === '실제 어형') ? 'is-hebrew' : ''}>{value}</dd>
                </div>
              ))}
            </dl>
            {isHebrew && (
              <div className="lexicon-side-status">
                <strong>형태 표시 원칙</strong><br />
                실제 본문 어형은 관사·전치사·접속사·접미 요소를 포함한 표면형으로 보존하고, 사전 표제어와 분리해서 표시합니다.
              </div>
            )}
          </aside>
        )}

        <main className="lexicon-main" data-modal-scroll-region="true">
          {tab === 'def' && (
            <section className="lexicon-tab-panel" data-panel="definition">
              <div className="lexicon-section-title">
                <strong>{isHebrew ? '영문 BDB 원문 · 구조 보기' : "영문 Greek Strong's · 원문 보기"}</strong>
                <span>{isHebrew ? 'BDB 1906 · Source hierarchy preserved' : 'Current Greek English lexical source'}</span>
              </div>

              {defLoading && <div className="lexicon-empty">불러오는 중…</div>}
              {defError && <div className="lexicon-error">⚠️ {defError}</div>}
              {!defLoading && !defError && !definition && (
                <div className="lexicon-empty">
                  정의를 찾을 수 없습니다. {strongHref && <a href={strongHref} target="_blank" rel="noreferrer">BibleHub에서 보기 ↗</a>}
                </div>
              )}

              {!defLoading && !defError && isHebrew && definition?.bdbUnavailable && (
                <div className="lexicon-bdb-failure" data-testid="bdb-failure-panel">
                  <strong>⚠️ BDB 사전 로드 실패</strong>
                  <p>Hebrew 정의를 BDB에서 불러오지 못했습니다. 네트워크 또는 dictionary provider 상태를 확인한 뒤 다시 시도해 주세요.</p>
                  <button data-testid="bdb-retry" onClick={() => { evictStrongDefinitionCache(entry.s); setDefReloadNonce((nonce) => nonce + 1); }}>다시 시도</button>
                  {strongHref && <a href={strongHref} target="_blank" rel="noreferrer">BibleHub에서 열기 ↗</a>}
                </div>
              )}

              {!defLoading && !defError && definition && !(isHebrew && definition.bdbUnavailable) && (
                <>
                  <LexiconDefinitionTree nodes={definition.nodes || []} isHebrew={isHebrew} flat={!isHebrew && definition.source === 'local'} />
                  {(definition.meta?.originKo || definition.meta?.twot || definition.meta?.partOfSpeech || definition.meta?.kjvUsage) && (
                    <div className="lexicon-definition-meta" data-testid="lexicon-definition-meta">
                      {definition.meta.originKo && <div><b>Origin:</b> <span dangerouslySetInnerHTML={{ __html: linkifyDefinition(definition.meta.originKo, isHebrew) }} /></div>}
                      {definition.meta.twot && <div><b>TWOT entry:</b> <span dangerouslySetInnerHTML={{ __html: linkifyDefinition(`TWOT ${definition.meta.twot}`, isHebrew) }} /></div>}
                      {definition.meta.partOfSpeech && <div><b>Part(s) of speech:</b> {definition.meta.partOfSpeech}</div>}
                      {!isHebrew && definition.meta.kjvUsage && <div><b>KJV usage:</b> <span dangerouslySetInnerHTML={{ __html: linkifyDefinition(definition.meta.kjvUsage, isHebrew) }} /></div>}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {tab === 'usage' && (
            <section className="lexicon-tab-panel" data-panel="usage">
              <div className="lexicon-section-title">
                <strong>관련 구절 · {entry.s} {lemma}</strong>
                <span>{bookId ? `${getBook(bookId)?.ko || bookId} 범위 · 실제 본문 어형 표시` : '책 미선택'}</span>
              </div>
              {!bookId && <div className="lexicon-empty">구절 노드를 선택하면 해당 책에서의 관련 구절을 볼 수 있습니다.</div>}
              {usageLoading && <div className="lexicon-empty">🔍 관련 구절 검색 중…</div>}
              {usageError && <div className="lexicon-error">⚠️ {usageError}</div>}
              {!usageLoading && Array.isArray(usages) && usages.length === 0 && !usageError && bookId && (
                <div className="lexicon-empty">이 책에서 관련 구절을 찾지 못했습니다.</div>
              )}
              {Array.isArray(usages) && usages.length > 0 && (
                <>
                  <div className="lexicon-usage-count">{getBook(bookId)?.ko || bookId} · 총 {usages.length}회 사용</div>
                  <div className="lexicon-usage-list">
                    {usages.map((usage, index) => (
                      <UsageCard
                        key={`${usage.ch}-${usage.v}-${index}`}
                        entry={usage}
                        bookId={bookId}
                        isHebrew={isHebrew}
                        onAdd={onAddVerse ? () => onAddVerse({ bookId, chapter: usage.ch, verseStart: usage.v, verseEnd: usage.v }, null) : null}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {tab === 'analysis' && (
            <section className="lexicon-tab-panel" data-panel="analysis" data-testid="morph-tab">
              <div className="lexicon-section-title">
                <strong>형태·원어 분석 · {lemma}</strong>
                <span>실제 표면형 · 형태소 구성 · 문법 · 원어 연구</span>
              </div>

              <div className="lexicon-morph-grid">
                <MorphCard label="사전 원형" languageClass={isHebrew ? 'is-hebrew' : ''}>{lemma || '—'}</MorphCard>
                <MorphCard label="실제 어형" languageClass={isHebrew ? 'is-hebrew' : ''}>{segmentedSurfaceForm || '—'}</MorphCard>
                {lexicalRecord?.translit && <MorphCard label="원형 학술 음역">{lexicalRecord.translit}</MorphCard>}
                {koreanTranslit && <MorphCard label="원형 한글 음역">{koreanTranslit}</MorphCard>}
                {entry.tr && <MorphCard label="어형 학술 음역">{entry.tr}</MorphCard>}
                {surfaceKoreanTranslit && <MorphCard label="어형 한글 음역">{surfaceKoreanTranslit}</MorphCard>}
                <MorphCard label="품사">{partOfSpeech}</MorphCard>
                <MorphCard label="문법 분석"><span data-testid="morph-humanized">{fullMorphHuman || '—'}</span></MorphCard>
              </div>

              {isHebrew && (
                <div className="lexicon-morph-detail" data-testid="morph-composition-panel" style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', marginBottom: 10 }}>
                    <b>형태 구성</b>
                    <span style={{ color: '#64748b', fontSize: 11 }}>
                      {hebrewComposition.length > 1 ? `${hebrewComposition.length}개 형태소 결합` : '단일 형태'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {hebrewComposition.map((part, index) => (
                      <div
                        key={`${part.form}-${part.code}-${index}`}
                        data-testid="morph-composition-row"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(92px, auto) minmax(0, 1fr) auto',
                          gap: 10,
                          alignItems: 'center',
                          padding: '9px 10px',
                          border: '1px solid #e0e6ef',
                          borderRadius: 10,
                          background: '#fff',
                        }}
                      >
                        <span className="is-hebrew" style={{ fontSize: 22, fontWeight: 700, direction: 'rtl' }}>{part.form || '—'}</span>
                        <span style={{ fontSize: 12, lineHeight: 1.5 }}>{part.human || '형태 정보 없음'}</span>
                        {part.code && <code style={{ fontSize: 10 }}>{part.code}</code>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                className={`lexicon-morph-detail-toggle${morphDetailOpen ? ' is-open' : ''}`}
                onClick={() => setMorphDetailOpen((open) => !open)}
                aria-expanded={morphDetailOpen}
              >
                형태론 자세히보기 <span>{morphDetailOpen ? '−' : '+'}</span>
              </button>

              {morphDetailOpen && (
                <div className="lexicon-morph-detail" data-testid="morph-detail-panel">
                  <div><b>사전 표제어:</b> <span className={isHebrew ? 'is-hebrew' : ''}>{lemma || '—'}</span></div>
                  <div><b>본문 표면형:</b> <span className={isHebrew ? 'is-hebrew' : ''}>{segmentedSurfaceForm || '—'}</span></div>
                  {entry.m && <div><b>raw morph code:</b> <code>{entry.m}</code></div>}
                  {entry.w && <div><b>원본 분절 토큰:</b> <code>{entry.w}</code></div>}
                  {isHebrew && (
                    <div className="lexicon-morph-detail-note">
                      사전 표제어는 lexical morpheme만 사용하고, 실제 본문 어형은 접속사·전치사·정관사·접미 요소를 포함한 표면형을 보존합니다. 각 형태소의 문법 설명은 원자료 morphology segment와 같은 순서로 대응시킵니다.
                    </div>
                  )}
                </div>
              )}

              {isHebrew && morphFields.some((field) => field.label === '어간 (Binyan)') && (
                <div className="lexicon-morph-note">
                  <strong>동사 어간:</strong> Qal/Piel/Pual 등은 사전형에서 추정하지 않고 현재 클릭한 토큰의 morphology code에 기록된 값만 표시합니다.
                </div>
              )}

              <div
                className="lexicon-research-panel"
                data-testid="original-language-analysis-tab"
                style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e0e6ef' }}
              >
                <div className="lexicon-section-title">
                  <strong>원어 연구</strong>
                  <span>용례 · 구문 · 병렬 본문 · 원어 브릿지</span>
                </div>
                <OriginalLanguageResearchActions
                  entry={{ ...entry, w: surfaceForm || entry.w, l: lemma || entry.l }}
                  anchor={anchor}
                  passage={passage}
                  isHebrew={isHebrew}
                  onActiveChange={setResearchActive}
                />
              </div>
            </section>
          )}
        </main>

        {threeColumn && (
          <aside className="lexicon-side lexicon-side--right">
            <h4>외부 링크</h4>
            <div className="lexicon-linkbox">
              {strongHref && <a href={strongHref} target="_blank" rel="noreferrer">BibleHub · {entry.s} ↗</a>}
              {definition?.meta?.twot && <div className="lexicon-link-static">TWOT · {definition.meta.twot}</div>}
              <div className="lexicon-link-static">Strong's Concordance · {entry.s}</div>
            </div>
            <div className="lexicon-side-status">
              <strong>표시 정책</strong><br />
              {isHebrew
                ? 'BDB 원자료의 parent/child 관계를 보존하고 화면 계층 표지만 A. → 1. → a. 형식으로 정규화합니다.'
                : 'Greek source가 flat이면 flat으로 표시하고, 원자료에 없는 A./1./a. 계층을 만들지 않습니다.'}
            </div>
          </aside>
        )}
      </div>

      <details className="lexicon-rights" data-testid="provenance-toggle">
        <summary><span>ⓘ 출처 · 저작권 · 재사용 근거</span><span className="lexicon-rights-chevron">⌄</span></summary>
        <div className="lexicon-rights-panel" data-testid="provenance-panel">
          {isHebrew ? (
            <>
              <RightsRow label="Lexical work"><strong>Brown–Driver–Briggs Hebrew and English Lexicon (1906)</strong> · Public Domain</RightsRow>
              <RightsRow label="Runtime provider"><strong>Bolls.life BDBT</strong> · provider only; BDB 재사용 권리의 근거로 간주하지 않음</RightsRow>
              <RightsRow label="Morph / concordance"><strong>STEPBible.data</strong> · CC BY 4.0 · <a href="https://stepbible.github.io/STEPBible-Data/" target="_blank" rel="noreferrer">STEP Bible attribution ↗</a></RightsRow>
              <RightsRow label="UI transformation">원자료 의미 순서와 parent/child 관계를 보존하고 표시 계층 표지만 A. → 1. → a. 형식으로 정규화</RightsRow>
            </>
          ) : (
            <>
              <RightsRow label="Lexical source">현재 저장소의 English Greek Strong's 청크 데이터</RightsRow>
              <RightsRow label="Morph / concordance"><strong>STEPBible.data</strong> · CC BY 4.0 · <a href="https://stepbible.github.io/STEPBible-Data/" target="_blank" rel="noreferrer">STEP Bible attribution ↗</a></RightsRow>
              <RightsRow label="UI transformation">원자료가 flat이면 flat으로 유지하며 없는 계층을 생성하지 않음</RightsRow>
            </>
          )}
          <div className="lexicon-rights-note"><strong>권리 원칙:</strong> FREE ACCESS ≠ REUSE PERMISSION. 실제 재사용 표기는 프로젝트 C0 Rights evidence가 확인한 범위만 사용합니다.</div>
        </div>
      </details>

      <div className="lexicon-footer">Lexicon Viewer v2 · {entry.s} {lemma} · Source: {source}</div>

      {!isMobile && !researchActive && (
        <>
          <div data-testid="resize-handle-top" onMouseDown={onResizeStart({ top: true })} style={resizeHandleStyle('top')} />
          <div data-testid="resize-handle-bottom" onMouseDown={onResizeStart({ bottom: true })} style={resizeHandleStyle('bottom')} />
          <div data-testid="resize-handle-left" onMouseDown={onResizeStart({ left: true })} style={resizeHandleStyle('left')} />
          <div data-testid="resize-handle-right" onMouseDown={onResizeStart({ right: true })} style={resizeHandleStyle('right')} />
          <div data-testid="resize-handle-nw" onMouseDown={onResizeStart({ top: true, left: true })} style={resizeHandleStyle('nw')} />
          <div data-testid="resize-handle-ne" onMouseDown={onResizeStart({ top: true, right: true })} style={resizeHandleStyle('ne')} />
          <div data-testid="resize-handle-sw" onMouseDown={onResizeStart({ bottom: true, left: true })} style={resizeHandleStyle('sw')} />
          <div data-testid="resize-handle-se" onMouseDown={onResizeStart({ bottom: true, right: true })} style={resizeHandleStyle('se')} />
        </>
      )}
    </div>
  );

  return createPortal(
    <>
      {isMobile && <div className="lexicon-mobile-backdrop" onClick={researchActive ? undefined : onClose} style={{ zIndex: resolvedZIndex - 1, pointerEvents: researchActive ? 'none' : 'auto' }} />}
      {popup}
    </>,
    document.body,
  );
}

function MorphCard({ label, children, mono = false, languageClass = '' }) {
  return (
    <div className="lexicon-morph-card">
      <h5>{label}</h5>
      <div className={`lexicon-morph-value${mono ? ' is-mono' : ''}${languageClass ? ` ${languageClass}` : ''}`}>{children}</div>
    </div>
  );
}

function UsageCard({ entry, bookId, isHebrew, onAdd }) {
  const koName = getBook(bookId)?.ko || bookId;
  const morphKo = entry.m
    ? (isHebrew ? humanizeHebrewMorphCode(entry.m) : humanizeMorph(entry.m))
    : null;
  const displayForm = displaySurfaceForm(entry.w, isHebrew) || entry.w || '';
  return (
    <article className="lexicon-usage-card" data-testid="usage-row">
      <div className="lexicon-usage-head">
        <button className="lexicon-usage-ref" onClick={onAdd || undefined} disabled={!onAdd} title={onAdd ? '이 구절을 캔버스에 추가' : undefined}>{koName} {entry.ch}:{entry.v}</button>
        <div className={`lexicon-usage-form${isHebrew ? ' is-hebrew' : ''}`}>{displayForm}</div>
      </div>
      <div className="lexicon-usage-meta">
        {morphKo && <span className="lexicon-chip" data-testid="usage-morph-human">{morphKo}</span>}
        {entry.m && <span className="lexicon-chip is-mono" data-testid="usage-morph-raw">{entry.m}</span>}
        {onAdd && <button className="lexicon-add-verse" onClick={onAdd} title="이 구절을 캔버스에 추가">+ 추가</button>}
      </div>
    </article>
  );
}

function RightsRow({ label, children }) {
  return (
    <div className="lexicon-rights-row">
      <div className="lexicon-rights-key">{label}</div>
      <div className="lexicon-rights-value">{children}</div>
    </div>
  );
}
