import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchAllTranslations } from '../api/bibleApi';
import { getBook, isOT } from '../data/bibleBooks';
import {
  PARALLEL_DIFF_LEGEND,
  canCompareOriginalLanguages,
  compareParallelTexts,
  tokenizeParallelText,
} from '../utils/parallelDiff';
import { formatReference, parseReference } from '../utils/citationDetector';
import {
  PARALLEL_KIND,
  buildParallelSuggestions,
  getParallelEmphasis,
  parallelRefKey,
} from '../data/parallelStudy';
import useMobile from '../hooks/useMobile';

const TRANSLATION_TABS = [
  { id: 'krv', label: '개역한글' },
  { id: 'esv', label: 'ESV' },
  { id: 'original', label: '원어' },
];

const STATUS_STYLE = {
  common: { background: '#dcfce7', color: '#166534' },
  addition: { background: '#dbeafe', color: '#1d4ed8' },
  moved: { background: '#fef3c7', color: '#92400e' },
};

function normalizeInitialRef(initialRef) {
  if (!initialRef) return null;
  if (initialRef.book) {
    return {
      book: initialRef.book,
      chapter: initialRef.chapter,
      verseStart: initialRef.verseStart,
      verseEnd: initialRef.verseEnd ?? initialRef.verseStart,
    };
  }
  if (initialRef.bookId) {
    const chapter = initialRef.chapter || initialRef.ch || 1;
    const verseStart = initialRef.verseStart || initialRef.verse || 1;
    return {
      book: initialRef.bookId,
      chapter,
      verseStart,
      verseEnd: initialRef.verseEnd || verseStart,
    };
  }
  if (initialRef.reference) return parseReference(initialRef.reference);
  return null;
}

function kindMeta(kind) {
  return PARALLEL_KIND[kind] || PARALLEL_KIND.crossref;
}

function textDirection(translationId, bookId) {
  return translationId === 'original' && isOT(bookId) ? 'rtl' : 'ltr';
}

function refLabel(value) {
  return formatReference(value) || `${value.book} ${value.chapter}:${value.verseStart}-${value.verseEnd}`;
}

function plainTokens(text) {
  return tokenizeParallelText(text).map((token) => ({ ...token, status: token.lexical ? 'plain' : 'punctuation' }));
}

function TokenText({ tokens, direction = 'ltr' }) {
  return (
    <div dir={direction} style={{ fontSize: 15, lineHeight: 1.95, color: '#1e293b', wordBreak: 'break-word' }}>
      {tokens.map((token) => {
        const semantic = STATUS_STYLE[token.status];
        const punctuation = token.status === 'punctuation';
        return (
          <span
            key={token.id}
            title={token.status === 'addition' ? '비교 본문에 추가' : token.status === 'moved' ? '어순 이동 후보' : undefined}
            style={{
              ...(semantic || {}),
              borderRadius: semantic ? 4 : 0,
              padding: semantic ? '1px 3px' : 0,
              marginRight: punctuation ? 0 : 3,
              boxDecorationBreak: 'clone',
              WebkitBoxDecorationBreak: 'clone',
            }}
          >
            {token.text}
          </span>
        );
      })}
    </div>
  );
}

function DiffSummary({ diff, disabledMessage }) {
  if (disabledMessage) {
    return (
      <div style={{ padding: '8px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 11.5, lineHeight: 1.55 }}>
        {disabledMessage}
      </div>
    );
  }
  if (!diff) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 5 }}>
      {[
        ['유사도', `${diff.similarity}%`],
        ['공통', diff.commonCount],
        ['추가', diff.additions.length],
        ['생략', diff.omissions.length],
      ].map(([label, value]) => (
        <div key={label} style={{ padding: '6px 5px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: 13, color: '#334155', fontWeight: 800, marginTop: 1 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function OmissionRow({ diff }) {
  if (!diff?.omissions?.length) return null;
  return (
    <div style={{ marginTop: 8, padding: '7px 8px', borderRadius: 8, background: '#fff1f2', border: '1px solid #fecdd3', fontSize: 10.5, color: '#9f1239', lineHeight: 1.55 }}>
      <b>기준 본문 대비 생략 후보</b>
      <div style={{ marginTop: 3 }}>{diff.omissions.slice(0, 18).join(' · ')}{diff.omissions.length > 18 ? ' …' : ''}</div>
    </div>
  );
}

function PassageColumn({ entry, text, anchorText, translationId, isAnchor, set, relation }) {
  const originalComparable = translationId !== 'original'
    || isAnchor
    || canCompareOriginalLanguages(entry.ref.book, relation?.anchorBook || entry.ref.book, isOT);
  const disabledMessage = !isAnchor && translationId === 'original' && !originalComparable
    ? '히브리어 OT ↔ 헬라어 NT는 문자열 일치로 공통·추가·생략을 판정하지 않습니다. 원문은 병렬 제시만 하고, 정경 관계 메모를 함께 확인하세요.'
    : null;

  const diff = !isAnchor && text && anchorText && !disabledMessage
    ? compareParallelTexts(anchorText, text)
    : null;
  const tokens = isAnchor || disabledMessage ? plainTokens(text) : diff?.comparisonTokens || [];
  const emphasis = getParallelEmphasis(set, entry.ref) || relation?.emphasis || null;
  const meta = relation?.kind ? kindMeta(relation.kind) : null;

  return (
    <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 13.5, color: isAnchor ? '#1d4ed8' : '#334155' }}>{entry.label}</strong>
          {isAnchor && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#1d4ed8', background: '#dbeafe', padding: '2px 6px', borderRadius: 999 }}>기준</span>}
          {!isAnchor && meta && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#475569', background: '#f1f5f9', padding: '2px 6px', borderRadius: 999 }}>{meta.label}</span>}
        </div>
        {!isAnchor && <div style={{ marginTop: 6 }}><DiffSummary diff={diff} disabledMessage={disabledMessage} /></div>}
      </div>

      <div style={{ padding: '9px 10px', borderRadius: 9, background: '#fff', border: '1px solid #e2e8f0', minHeight: 128 }}>
        {text ? <TokenText tokens={tokens} direction={textDirection(translationId, entry.ref.book)} /> : <span style={{ color: '#94a3b8', fontSize: 12 }}>본문을 불러오지 못했습니다.</span>}
        {!isAnchor && !disabledMessage && <OmissionRow diff={diff} />}
        {diff?.truncated && <div style={{ marginTop: 6, fontSize: 10, color: '#b45309' }}>긴 본문은 성능 보호를 위해 앞부분 260개 어휘를 기준으로 자동 비교했습니다.</div>}
      </div>

      {relation?.note && (
        <div style={{ padding: '8px 9px', borderRadius: 8, background: '#eff6ff', color: '#1e3a8a', fontSize: 11, lineHeight: 1.55 }}>
          <b>관계 메모</b> · {relation.note}
        </div>
      )}
      {emphasis && (
        <div style={{ padding: '8px 9px', borderRadius: 8, background: '#faf5ff', color: '#581c87', fontSize: 11, lineHeight: 1.55 }}>
          <b>curated 편집·신학 관찰</b> · {emphasis}
        </div>
      )}
    </section>
  );
}

export default function ParallelStudyModal({ initialRef, onClose }) {
  const isMobile = useMobile();
  const fallbackRef = { book: 'Mark', chapter: 1, verseStart: 2, verseEnd: 3 };
  const firstRef = normalizeInitialRef(initialRef) || fallbackRef;
  const [anchor, setAnchor] = useState(firstRef);
  const [input, setInput] = useState(refLabel(firstRef));
  const [inputError, setInputError] = useState('');
  const [translationId, setTranslationId] = useState('krv');
  const [suggestions, setSuggestions] = useState([]);
  const [setInfo, setSetInfo] = useState(null);
  const [selected, setSelected] = useState([{ ref: firstRef, label: refLabel(firstRef), relation: null }]);
  const [texts, setTexts] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeMobileKey, setActiveMobileKey] = useState(parallelRefKey(firstRef));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    buildParallelSuggestions(anchor, 14)
      .then(({ set, suggestions: nextSuggestions }) => {
        if (cancelled) return;
        setSetInfo(set);
        setSuggestions(nextSuggestions);
        const curated = nextSuggestions.filter((item) => item.kind !== 'crossref');
        const seeded = [
          { ref: anchor, label: refLabel(anchor), relation: null },
          ...curated.slice(0, set ? 3 : 2).map((item) => ({ ref: item.ref, label: item.reference, relation: item })),
        ];
        setSelected(seeded);
        setActiveMobileKey(parallelRefKey(seeded[1]?.ref || anchor));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [anchor]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const pairs = await Promise.all(selected.map(async (entry) => {
        const key = parallelRefKey(entry.ref);
        try {
          const result = await fetchAllTranslations(entry.ref.book, entry.ref.chapter, entry.ref.verseStart, entry.ref.verseEnd);
          return [key, result];
        } catch {
          return [key, { krv: null, esv: null, original: null }];
        }
      }));
      if (!cancelled) setTexts(Object.fromEntries(pairs));
    };
    load();
    return () => { cancelled = true; };
  }, [selected]);

  const anchorKey = parallelRefKey(anchor);
  const anchorText = texts[anchorKey]?.[translationId] || '';
  const selectedKeys = useMemo(() => new Set(selected.map((entry) => parallelRefKey(entry.ref))), [selected]);
  const activeMobileEntry = selected.find((entry) => parallelRefKey(entry.ref) === activeMobileKey)
    || selected.find((entry) => parallelRefKey(entry.ref) !== anchorKey)
    || selected[0];

  const applyReference = () => {
    const parsed = parseReference(input.trim());
    if (!parsed) {
      setInputError('예: 마가복음 1:2-3 형식으로 입력해 주세요.');
      return;
    }
    setInputError('');
    setAnchor(parsed);
    setInput(refLabel(parsed));
  };

  const toggleSuggestion = (item) => {
    const key = parallelRefKey(item.ref);
    if (selectedKeys.has(key)) {
      if (key === anchorKey) return;
      setSelected((items) => items.filter((entry) => parallelRefKey(entry.ref) !== key));
      return;
    }
    if (selected.length >= 4) return;
    setSelected((items) => [...items, { ref: item.ref, label: item.reference, relation: item }]);
    setActiveMobileKey(key);
  };

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="병렬 본문 연구"
      data-parallel-study
      style={{
        position: 'fixed', inset: 0, zIndex: 3200,
        background: isMobile ? '#f8fafc' : 'rgba(15,23,42,.46)',
        display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center',
        padding: isMobile ? 0 : 18,
      }}
    >
      <div style={{
        width: '100%', maxWidth: isMobile ? 'none' : 1220,
        height: isMobile ? '100dvh' : 'min(90vh, 880px)',
        background: '#f8fafc', borderRadius: isMobile ? 0 : 16,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        border: isMobile ? 'none' : '1px solid #cbd5e1',
        boxShadow: isMobile ? 'none' : '0 24px 70px rgba(15,23,42,.32)',
      }}>
        <header style={{
          padding: isMobile ? 'calc(env(safe-area-inset-top,0px) + 9px) 12px 9px' : '10px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
        }}>
          <span style={{ fontSize: 18 }}>⇄</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: 'block', color: '#172554', fontSize: 14 }}>병렬 본문 연구</strong>
            <span style={{ display: 'block', color: '#64748b', fontSize: 10.5, marginTop: 1 }}>공관복음 · 구약↔신약 · 인용·반향 · 관주 비교</span>
          </div>
          <button type="button" onClick={onClose} aria-label="병렬 본문 연구 닫기" style={{ width: 44, height: 44, border: 'none', borderRadius: 9, background: '#f1f5f9', color: '#334155', fontSize: 20, cursor: 'pointer' }}>×</button>
        </header>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: isMobile ? '12px 12px calc(env(safe-area-inset-bottom,0px) + 24px)' : '14px 16px 20px' }}>
          <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(260px,.75fr) minmax(360px,1.25fr)', gap: 10, marginBottom: 12 }}>
            <div style={{ padding: 10, borderRadius: 10, background: '#fff', border: '1px solid #e2e8f0' }}>
              <label htmlFor="parallel-anchor" style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#475569', marginBottom: 5 }}>기준 본문</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input id="parallel-anchor" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') applyReference(); }} style={{ minWidth: 0, flex: 1, minHeight: 42, borderRadius: 8, border: '1px solid #cbd5e1', padding: '8px 10px', fontSize: 13 }} />
                <button type="button" onClick={applyReference} style={{ minHeight: 42, border: 'none', borderRadius: 8, padding: '0 13px', background: '#1d4ed8', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>불러오기</button>
              </div>
              {inputError && <div style={{ marginTop: 5, color: '#dc2626', fontSize: 10.5 }}>{inputError}</div>}
              {setInfo && <div style={{ marginTop: 7, padding: '6px 8px', borderRadius: 7, background: '#eff6ff', color: '#1e40af', fontSize: 10.5 }}><b>curated 평행단락</b> · {setInfo.title}</div>}
            </div>

            <div style={{ padding: 10, borderRadius: 10, background: '#fff', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: '#475569', marginBottom: 6 }}>비교 본문 추천 · 최대 4본문</div>
              {loading ? <span style={{ color: '#94a3b8', fontSize: 11 }}>연관 본문을 찾는 중…</span> : suggestions.length === 0 ? <span style={{ color: '#94a3b8', fontSize: 11 }}>추천 본문이 없습니다. 기준 본문은 그대로 연구할 수 있습니다.</span> : (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {suggestions.slice(0, 10).map((item) => {
                    const selectedNow = selectedKeys.has(parallelRefKey(item.ref));
                    const meta = kindMeta(item.kind);
                    return <button key={item.key} type="button" onClick={() => toggleSuggestion(item)} disabled={!selectedNow && selected.length >= 4} title={item.note || meta.label} style={{ minHeight: 36, padding: '6px 9px', borderRadius: 8, cursor: 'pointer', border: selectedNow ? '1px solid #2563eb' : '1px solid #e2e8f0', background: selectedNow ? '#dbeafe' : '#f8fafc', color: selectedNow ? '#1e40af' : '#475569', fontSize: 10.5, fontWeight: selectedNow ? 800 : 600, opacity: !selectedNow && selected.length >= 4 ? .45 : 1 }}>{item.reference} · {meta.label}</button>;
                  })}
                </div>
              )}
            </div>
          </section>

          <section style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {TRANSLATION_TABS.map((tab) => <button key={tab.id} type="button" onClick={() => setTranslationId(tab.id)} style={{ minHeight: 36, padding: '6px 11px', border: 'none', borderRadius: 8, cursor: 'pointer', background: translationId === tab.id ? '#334155' : '#e2e8f0', color: translationId === tab.id ? '#fff' : '#475569', fontWeight: translationId === tab.id ? 800 : 600, fontSize: 11 }}>{tab.label}</button>)}
            <div style={{ flexBasis: isMobile ? '100%' : 'auto', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {PARALLEL_DIFF_LEGEND.map((item) => <span key={item.id} title={item.description} style={{ padding: '3px 7px', borderRadius: 999, fontSize: 9.5, fontWeight: 800, ...(item.id === 'common' ? STATUS_STYLE.common : item.id === 'addition' ? STATUS_STYLE.addition : item.id === 'moved' ? STATUS_STYLE.moved : { background: '#fff1f2', color: '#9f1239' }) }}>{item.label}</span>)}
            </div>
          </section>

          {isMobile ? (
            <section>
              <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 8 }}>
                {selected.map((entry) => {
                  const key = parallelRefKey(entry.ref);
                  const active = key === activeMobileKey;
                  return <button key={key} type="button" onClick={() => setActiveMobileKey(key)} style={{ whiteSpace: 'nowrap', minHeight: 40, padding: '7px 10px', borderRadius: 8, border: active ? '1px solid #2563eb' : '1px solid #e2e8f0', background: active ? '#dbeafe' : '#fff', color: active ? '#1e40af' : '#475569', fontSize: 11, fontWeight: active ? 800 : 600 }}>{key === anchorKey ? '기준 · ' : ''}{entry.label}</button>;
                })}
              </div>
              {activeMobileEntry && parallelRefKey(activeMobileEntry.ref) === anchorKey ? (
                <PassageColumn entry={activeMobileEntry} text={anchorText} anchorText={anchorText} translationId={translationId} isAnchor set={setInfo} relation={{ anchorBook: anchor.book }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <PassageColumn entry={selected[0]} text={anchorText} anchorText={anchorText} translationId={translationId} isAnchor set={setInfo} relation={{ anchorBook: anchor.book }} />
                  <div style={{ borderTop: '2px dashed #cbd5e1' }} />
                  <PassageColumn entry={activeMobileEntry} text={texts[parallelRefKey(activeMobileEntry.ref)]?.[translationId] || ''} anchorText={anchorText} translationId={translationId} isAnchor={false} set={setInfo} relation={{ ...(activeMobileEntry.relation || {}), anchorBook: anchor.book }} />
                </div>
              )}
            </section>
          ) : (
            <section style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, selected.length)}, minmax(0,1fr))`, gap: 10, alignItems: 'start' }}>
              {selected.map((entry, index) => {
                const key = parallelRefKey(entry.ref);
                return <PassageColumn key={key} entry={entry} text={texts[key]?.[translationId] || ''} anchorText={anchorText} translationId={translationId} isAnchor={index === 0} set={setInfo} relation={{ ...(entry.relation || {}), anchorBook: anchor.book }} />;
              })}
            </section>
          )}

          <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 8, background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 10.5, lineHeight: 1.55 }}>
            자동 비교는 문자열 정렬 보조 도구입니다. <b>공통·추가·생략·어순 표시는 해석 결론이 아니며</b>, 원문 형태론·구문·본문비평과 curated 관계 메모를 함께 확인해야 합니다. `curated` 표시는 사람이 작성한 관찰이고, OpenBible 관주는 별도의 연관 추천입니다.
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
