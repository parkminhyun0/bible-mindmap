import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchStrongDefinition, fetchStrongConcordance, humanizeMorph, linkifyDefinition, evictStrongDefinitionCache } from '../utils/lexicon';
import { getBook } from '../data/bibleBooks';
import { useCanvas } from '../context/CanvasContext';
import useMobile from '../hooks/useMobile';
import OriginalLanguageResearchActions from './OriginalLanguageResearchActions';
import { KOREAN_GLOSS } from '../data/koreanGloss';
import LexiconDefinitionTree from './LexiconDefinitionTree';
import './LexiconPopup.css';

const POPUP_MIN_WIDTH = 340;
const POPUP_MIN_HEIGHT = 300;
const POPUP_VIEWPORT_MARGIN = 12;
const DEFAULT_DESKTOP_WIDTH = 760;
const DEFAULT_DESKTOP_HEIGHT = 620;
const THREE_COLUMN_MIN_WIDTH = 720;

function clampSize(width, height, vw, vh) {
  const maxW = Math.max(POPUP_MIN_WIDTH, vw - POPUP_VIEWPORT_MARGIN * 2);
  const maxH = Math.max(POPUP_MIN_HEIGHT, vh - POPUP_VIEWPORT_MARGIN * 2);
  return {
    width: Math.min(Math.max(POPUP_MIN_WIDTH, width), maxW),
    height: Math.min(Math.max(POPUP_MIN_HEIGHT, height), maxH),
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

function morphologyFields(human) {
  if (!human) return [];
  if (human.includes(' | ')) return [{ label: '형태 분석', value: human }];
  const parts = human.split(' · ').filter(Boolean);
  if (!parts.length) return [];
  const pos = parts[0];
  if (pos === '동사' && parts.length >= 4) {
    // Hebrew: 동사 · Binyan · aspect · person · gender · number
    // Greek:  동사 · tense · voice · mood · person · number
    const looksHebrewStem = ['Qal', 'Niphal', 'Piel', 'Pual', 'Hiphil', 'Hophal', 'Hithpael'].includes(parts[1]);
    const labels = looksHebrewStem
      ? ['품사', '어간 (Binyan)', '시상', '인칭', '성', '수']
      : ['품사', '시제', '태', '법', '인칭', '수'];
    return parts.map((value, index) => ({ label: labels[index] || `형태 ${index}`, value }));
  }
  if (pos === '명사' && parts.length >= 3) {
    const stateLike = parts[parts.length - 1] === '독립형' || parts[parts.length - 1] === '연계형';
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
    };
    window.addEventListener('resize', onWindowResize);
    return () => window.removeEventListener('resize', onWindowResize);
  }, []);

  const onDragStart = (event) => {
    if (isMobile || researchActive || event.button !== 0) return;
    event.preventDefault();
    dragState.current = {
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startX: dragOffset.x,
      startY: dragOffset.y,
    };
    const onMove = (moveEvent) => {
      if (!dragState.current) return;
      setDragOffset({
        x: dragState.current.startX + moveEvent.clientX - dragState.current.startMouseX,
        y: dragState.current.startY + moveEvent.clientY - dragState.current.startMouseY,
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
    const start = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      width: popupSize.width,
      height: popupSize.height,
      offsetX: dragOffset.x,
      offsetY: dragOffset.y,
    };
    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - start.mouseX;
      const dy = moveEvent.clientY - start.mouseY;
      let width = start.width;
      let height = start.height;
      let offsetX = start.offsetX;
      let offsetY = start.offsetY;
      if (edges.right) width = start.width + dx;
      if (edges.bottom) height = start.height + dy;
      if (edges.left) { width = start.width - dx; offsetX = start.offsetX + dx; }
      if (edges.top) { height = start.height - dy; offsetY = start.offsetY + dy; }
      const clamped = clampSize(width, height, window.innerWidth, window.innerHeight);
      if (edges.left && clamped.width !== width) offsetX = start.offsetX + (start.width - clamped.width);
      if (edges.top && clamped.height !== height) offsetY = start.offsetY + (start.height - clamped.height);
      setPopupSize(clamped);
      setDragOffset({ x: offsetX, y: offsetY });
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
  const morphHuman = humanizeMorph(entry.m);
  const morphFields = morphologyFields(morphHuman);
  const glossKey = normalizedStrong(entry.s);
  const koreanGloss = (glossKey && KOREAN_GLOSS[glossKey]) || (entry.s && KOREAN_GLOSS[entry.s]) || null;
  const koreanTranslit = entry.translitKo || koreanGloss?.translitKo || null;
  const lemma = entry.l || entry.w || '';
  const partOfSpeech = definition?.meta?.partOfSpeech || morphFields.find((field) => field.label === '품사')?.value || '—';
  const source = sourceLabel(isHebrew);
  const strongHref = externalStrongHref(entry.s, isHebrew);

  const width = isMobile ? vw : popupSize.width;
  const height = isMobile ? Math.round(vh * 0.88) : popupSize.height;
  const margin = POPUP_VIEWPORT_MARGIN;
  const baseLeft = isMobile ? 0 : Math.max(margin, Math.min((anchor?.x ?? vw / 2) - width / 2, vw - width - margin));
  const baseTop = isMobile ? vh - height : Math.max(margin, Math.min((anchor?.y ?? vh / 2) + 8, vh - height - margin));
  const left = isMobile ? 0 : baseLeft + dragOffset.x;
  const top = isMobile ? baseTop : baseTop + dragOffset.y;
  const resolvedZIndex = researchActive ? Math.min(zIndex ?? 2501, 1200) : (zIndex ?? 2501);
  const threeColumn = !isMobile && popupSize.width >= THREE_COLUMN_MIN_WIDTH;

  const metaCells = [
    ['Strong', entry.s || '—'],
    ['Lemma', lemma || '—'],
    ['Academic translit.', entry.tr || '—'],
    ['한글 음역', koreanTranslit || '—'],
    ['Part of speech', partOfSpeech],
  ];

  const leftFields = [
    ['사전형', lemma],
    ['학술 음역 (SBL)', entry.tr],
    ['한글 음역', koreanTranslit],
    ['표기 기준', 'SBL 학술 음역 / 검증된 한글 음역 병기'],
    ...morphFields.map((field) => [field.label, field.value]),
    ['raw code', entry.m],
    ['대표 어형', entry.w],
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
          <div className={`lexicon-title-lemma${isHebrew ? ' is-hebrew' : ''}`}>{lemma}</div>
          <div className="lexicon-title-translit">
            {entry.tr && <span>{entry.tr}</span>}
            {koreanTranslit && <><span className="lexicon-dot">·</span><span>한글 음역: <span data-testid="popup-translit-ko">{koreanTranslit}</span></span></>}
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

      <nav className="lexicon-tabs" aria-label="원어 사전 탭">
        {[
          ['def', '사전 정의'],
          ['usage', '관련 구절'],
          ['morph', '형태 분석'],
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
                  <dd className={isHebrew && (label === '사전형' || label === '대표 어형') ? 'is-hebrew' : ''}>{value}</dd>
                </div>
              ))}
            </dl>
            {isHebrew && (
              <div className="lexicon-side-status">
                <strong>형태 표시 원칙</strong><br />
                동사는 실제 토큰 morph code에서 Qal · Niphal · Piel · Pual · Hiphil · Hophal · Hithpael 등을 표시하고, 명사는 성·수·상태를 표시합니다.
              </div>
            )}
          </aside>
        )}

        <main className="lexicon-main" data-modal-scroll-region="true">
          {tab === 'def' && (
            <section className="lexicon-tab-panel" data-panel="definition">
              <div className="lexicon-section-title">
                <strong>{isHebrew ? '영문 BDB 원문 · 구조 보기' : "영문 Greek Strong's · 원문 보기"}</strong>
                <span>{isHebrew ? 'Brown–Driver–Briggs · Source: BDB' : "Current Greek English lexical source"}</span>
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
                      {definition.meta.originKo && <div><b>어원:</b> <span dangerouslySetInnerHTML={{ __html: linkifyDefinition(definition.meta.originKo, isHebrew) }} /></div>}
                      {definition.meta.twot && <div><b>TWOT entry:</b> <span dangerouslySetInnerHTML={{ __html: linkifyDefinition(`TWOT ${definition.meta.twot}`, isHebrew) }} /></div>}
                      {definition.meta.partOfSpeech && <div><b>Part(s) of speech:</b> {definition.meta.partOfSpeech}</div>}
                      {!isHebrew && definition.meta.kjvUsage && <div><b>KJV 용례:</b> <span dangerouslySetInnerHTML={{ __html: linkifyDefinition(definition.meta.kjvUsage, isHebrew) }} /></div>}
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
                <span>{bookId ? `${getBook(bookId)?.ko || bookId} 범위` : '책 미선택'}</span>
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

          {tab === 'morph' && (
            <section className="lexicon-tab-panel" data-panel="morphology" data-testid="morph-tab">
              <div className="lexicon-section-title">
                <strong>형태 분석 · {lemma}</strong>
                <span>클릭한 실제 토큰 형태</span>
              </div>
              <div className="lexicon-morph-grid">
                <MorphCard label="사전형" languageClass={isHebrew ? 'is-hebrew' : ''}>{lemma || '—'}</MorphCard>
                {koreanTranslit && <MorphCard label="한글 음역">{koreanTranslit}</MorphCard>}
                {entry.tr && <MorphCard label="학술 음역">{entry.tr}</MorphCard>}
                <MorphCard label="품사">{partOfSpeech}</MorphCard>
                {morphFields.filter((field) => field.label !== '품사').map((field) => (
                  <MorphCard label={field.label} key={`${field.label}-${field.value}`}>{field.value}</MorphCard>
                ))}
                <MorphCard label="형태 분석"><span data-testid="morph-humanized">{morphHuman || '—'}</span></MorphCard>
                {entry.m && <MorphCard label="raw code" mono>{entry.m}</MorphCard>}
                {entry.w && <MorphCard label="실제 어형" languageClass={isHebrew ? 'is-hebrew' : ''}>{entry.w}</MorphCard>}
              </div>
              {isHebrew && morphFields.some((field) => field.label === '어간 (Binyan)') && (
                <div className="lexicon-morph-note">
                  <strong>동사 어간:</strong> Qal/Piel/Pual 등은 사전형에서 추정하지 않고, 현재 클릭한 토큰의 morphology code에 기록된 값만 표시합니다.
                </div>
              )}
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
            <details className="lexicon-research-details">
              <summary>연구 도구</summary>
              <OriginalLanguageResearchActions
                entry={entry}
                anchor={anchor}
                passage={passage}
                isHebrew={isHebrew}
                onActiveChange={setResearchActive}
              />
            </details>
          </aside>
        )}
      </div>

      {!threeColumn && (
        <details className="lexicon-research-details lexicon-research-details--bottom">
          <summary>연구 도구</summary>
          <OriginalLanguageResearchActions
            entry={entry}
            anchor={anchor}
            passage={passage}
            isHebrew={isHebrew}
            onActiveChange={setResearchActive}
          />
        </details>
      )}

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
  const morphKo = entry.m ? humanizeMorph(entry.m) : null;
  return (
    <article className="lexicon-usage-card" data-testid="usage-row">
      <div className="lexicon-usage-head">
        <button className="lexicon-usage-ref" onClick={onAdd || undefined} disabled={!onAdd} title={onAdd ? '이 구절을 캔버스에 추가' : undefined}>{koName} {entry.ch}:{entry.v}</button>
        <div className={`lexicon-usage-form${isHebrew ? ' is-hebrew' : ''}`}>{entry.w}</div>
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
