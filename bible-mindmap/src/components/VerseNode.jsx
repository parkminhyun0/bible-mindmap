import { useState, useMemo, useEffect, useRef } from 'react';
import { useReactFlow, useEdges } from '@xyflow/react';
import { fetchVerse } from '../api/bibleApi';
import { isOT } from '../data/bibleBooks';
import { loadVerseLexicon } from '../utils/lexicon';
import LexiconPopup from './LexiconPopup';
import BackgroundNodeFrame from './BackgroundNodeFrame';
import PassageAnnotationPin from './PassageAnnotationPin';
import useResearchAnnotations from '../research/useResearchAnnotations';

// 렉시콘 팝업 id — 같은 밀리초 중복 방지용 단조 증가 시퀀스
let _popupSeq = 0;

const EDGE_BADGE_CONFIG = [
  { type: 'citation',  label: '인용',  color: '#ef4444', bg: '#fef2f2' },
  { type: 'echo',      label: '반향',  color: '#ca8a04', bg: '#fefce8' },
  { type: 'parallel',  label: '평행',  color: '#3b82f6', bg: '#eff6ff' },
  { type: 'topic',     label: '주제',  color: '#8b5cf6', bg: '#f5f3ff' },
  { type: 'crossref',  label: '교차',  color: '#0ea5e9', bg: '#f0f9ff' },
  { type: 'relation',  label: '관계',  color: '#475569', bg: '#f1f5f9' },
];

const TABS = [
  { id: 'krv',      label: '개역한글' },
  { id: 'web',      label: 'WEB' },
  { id: 'original', label: '원어' },
];
// 구약(OT)에서는 LXX(칠십인역) 탭을 원어 앞에 추가 노출한다.
const TABS_OT = [
  { id: 'krv',      label: '개역한글' },
  { id: 'web',      label: 'WEB' },
  { id: 'lxx',      label: 'LXX' },
  { id: 'original', label: '원어' },
];

function collectTextNodes(root) {
  const nodes = [];
  const visit = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      nodes.push(node);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.dataset?.annotationPin === 'true') return;
    [...node.childNodes].forEach(visit);
  };
  [...root.childNodes].forEach(visit);
  return nodes;
}

function stripAnnotationMarkup(root) {
  root.querySelectorAll('[data-annotation-pin="true"]').forEach((pin) => pin.remove());
  root.querySelectorAll('mark[data-annotation-highlight="true"]').forEach((mark) => {
    mark.replaceWith(...mark.childNodes);
  });
  root.normalize();
}

function cleanEditableHtml(element) {
  const clone = element.cloneNode(true);
  stripAnnotationMarkup(clone);
  return clone.innerHTML;
}

function decorateAnnotatedHtml(html, annotations) {
  if (!html || annotations.length === 0) return html;
  const root = document.createElement('div');
  root.innerHTML = html;

  annotations.forEach((annotation) => {
    const selectedText = annotation.anchor?.selectedText?.trim();
    if (!selectedText) return;
    const textNodes = collectTextNodes(root);
    const fullText = textNodes.map((node) => node.textContent).join('');
    const start = fullText.indexOf(selectedText);
    if (start < 0) return;
    const end = start + selectedText.length;
    let cursor = 0;
    let startNode;
    let startOffset;
    let endNode;
    let endOffset;

    for (const node of textNodes) {
      const next = cursor + node.textContent.length;
      if (!startNode && start >= cursor && start < next) {
        startNode = node;
        startOffset = start - cursor;
      }
      if (endNode == null && end > cursor && end <= next) {
        endNode = node;
        endOffset = end - cursor;
        break;
      }
      cursor = next;
    }
    if (!startNode || !endNode) return;

    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const mark = document.createElement('mark');
    mark.dataset.annotationHighlight = 'true';
    mark.title = annotation.content
      ? `📌 ${annotation.content}`
      : '📌 이 문구에 개인 주석이 있습니다.';
    const color = /^#[0-9a-f]{6}$/i.test(annotation.color || '') ? annotation.color : '#eab308';
    mark.style.background = `${color}26`;
    mark.style.borderBottom = `2px solid ${color}`;
    mark.style.borderRadius = '3px';
    mark.style.padding = '0 1px';

    const fragment = range.extractContents();
    mark.append(fragment);
    const pin = document.createElement('span');
    pin.dataset.annotationPin = 'true';
    pin.contentEditable = 'false';
    pin.textContent = '📌';
    pin.title = mark.title;
    pin.style.fontSize = '0.72em';
    pin.style.marginInline = '2px';
    pin.style.verticalAlign = '0.2em';
    pin.style.direction = 'ltr';
    mark.append(pin);
    range.insertNode(mark);
  });

  return root.innerHTML;
}

export default function VerseNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const { annotationsForPassage } = useResearchAnnotations();
  const allEdges = useEdges();
  const borderColor = data.color || '#3b82f6';
  const fontSize = data.fontSize || 13;
  // 영역별 텍스트 크기 (편집 툴바 체크박스로 개별 조절) — 미지정 시 fontSize 기준 fallback
  const titleSize = data.fontSizeTitle ?? (fontSize + 1);
  const bodySize = data.fontSizeBody ?? fontSize;

  const hasMulti = !!data.bookId;

  // Count edges by type for this node
  const edgeCounts = useMemo(() => {
    const counts = {};
    allEdges.forEach((e) => {
      if (e.source === id || e.target === id) {
        counts[e.type] = (counts[e.type] || 0) + 1;
      }
    });
    return counts;
  }, [allEdges, id]);

  const activeBadges = EDGE_BADGE_CONFIG.filter((cfg) => edgeCounts[cfg.type] > 0);

  // 구약이면 LXX 탭 포함, 아니면 기본 3탭. translationTabIds는 프리로드·재시도용.
  const tabs = data.bookId && isOT(data.bookId) ? TABS_OT : TABS;
  const translationTabIds = tabs.map((t) => t.id);

  // data.activeTab을 단일 진실 출처로 사용 — NodeEditor와 양방향 동기화
  // 이전 저장 데이터가 제거된 탭을 가리키면 개역한글로 안전하게 되돌린다.
  const activeTab = tabs.some((tab) => tab.id === data.activeTab) ? data.activeTab : 'krv';
  const [tabLoading, setTabLoading] = useState({});
  const [tabErrors, setTabErrors]   = useState({});
  const retryingRef = useRef(new Set());
  const preloadGenerationRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleTabClick = (tabId) => {
    setNodes((nds) =>
      nds.map((n) => n.id === id ? { ...n, data: { ...n.data, activeTab: tabId } } : n)
    );
  };

  // 누락 역본은 동시에 요청하되, 각 역본이 도착하는 즉시 독립적으로 저장한다.
  // 느린 WEB 응답이 이미 준비된 개역한글·원어 탭의 표시를 막지 않도록 한다.
  useEffect(() => {
    if (!hasMulti) return;
    const missing = translationTabIds.filter(
      (tabId) => typeof data.translations?.[tabId] !== 'string',
    );
    if (missing.length === 0) return;

    const generation = preloadGenerationRef.current + 1;
    preloadGenerationRef.current = generation;
    let cancelled = false;

    setTabLoading((prev) => ({
      ...prev,
      ...Object.fromEntries(missing.map((tabId) => [tabId, true])),
    }));
    setTabErrors((prev) => {
      const next = { ...prev };
      missing.forEach((tabId) => delete next[tabId]);
      return next;
    });

    missing.forEach((tabId) => {
      fetchVerse(data.bookId, data.chapter, data.verseStart, data.verseEnd, tabId)
        .then((text) => {
          if (cancelled || !mountedRef.current || preloadGenerationRef.current !== generation) return;
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      ...(tabId === 'krv' ? { text } : {}),
                      translations: { ...n.data.translations, [tabId]: text },
                    },
                  }
                : n,
            ),
          );
        })
        .catch((error) => {
          if (cancelled || !mountedRef.current || preloadGenerationRef.current !== generation) return;
          setTabErrors((prev) => ({
            ...prev,
            [tabId]: error.message || '본문을 불러오지 못했습니다.',
          }));
        })
        .finally(() => {
          if (cancelled || !mountedRef.current || preloadGenerationRef.current !== generation) return;
          setTabLoading((prev) => ({ ...prev, [tabId]: false }));
        });
    });

    return () => {
      cancelled = true;
      preloadGenerationRef.current += 1;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.bookId, data.chapter, data.verseStart, data.verseEnd, id]);

  const retryTranslation = (tabId) => {
    if (!translationTabIds.includes(tabId) || retryingRef.current.has(tabId)) return;
    retryingRef.current.add(tabId);
    setTabErrors((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    setTabLoading((prev) => ({ ...prev, [tabId]: true }));

    fetchVerse(data.bookId, data.chapter, data.verseStart, data.verseEnd, tabId)
      .then((text) => {
        if (!mountedRef.current) return;
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    ...(tabId === 'krv' ? { text } : {}),
                    translations: { ...n.data.translations, [tabId]: text },
                  },
                }
              : n,
          ),
        );
      })
      .catch((error) => {
        if (mountedRef.current) {
          setTabErrors((prev) => ({
            ...prev,
            [tabId]: error.message || '본문을 불러오지 못했습니다.',
          }));
        }
      })
      .finally(() => {
        retryingRef.current.delete(tabId);
        if (mountedRef.current) {
          setTabLoading((prev) => ({ ...prev, [tabId]: false }));
        }
      });
  };

  let displayText = '';
  let isLoading   = false;

  if (!hasMulti) {
    displayText = data.text || '';
  } else {
    const t = data.translations?.[activeTab];
    if (typeof t === 'string') {
      displayText = t;
    } else if (tabErrors[activeTab]) {
      displayText = '';
    } else if (tabLoading[activeTab]) {
      isLoading = true;
    } else {
      // Fall back to data.text for KRV if translations.krv not loaded yet
      displayText = activeTab === 'krv' && data.text ? data.text : '';
    }
  }

  // 구약 원어는 히브리어(RTL), 신약은 헬라어(LTR)
  const isRTL = activeTab === 'original' && !!data.bookId && isOT(data.bookId);

  // ── Lexicon (원어 탭 전용) ─────────────────────────────────────────
  const [lexEntries, setLexEntries] = useState([]);
  const [popups, setPopups] = useState([]);
  const annotationRootRef = useRef(null);
  const editableRef = useRef(null);
  const [inlineEditing, setInlineEditing] = useState(false);
  const [selectionPin, setSelectionPin] = useState(null);
  const passage = useMemo(() => ({
    bookId: data.bookId,
    chapter: data.chapter,
    verseStart: data.verseStart,
    verseEnd: data.verseEnd || data.verseStart,
  }), [data.bookId, data.chapter, data.verseStart, data.verseEnd]);
  const passageAnnotations = annotationsForPassage(passage);
  const wholePassageAnnotations = passageAnnotations.filter(
    (annotation) => !annotation.anchor?.selectedText?.trim(),
  );
  const selectedTextAnnotations = passageAnnotations.filter((annotation) => {
    if (!annotation.anchor?.selectedText?.trim()) return false;
    return !annotation.anchor.translationId || annotation.anchor.translationId === activeTab;
  });
  const annotationSignature = selectedTextAnnotations
    .map((annotation) => `${annotation.id}:${annotation.updatedAt}:${annotation.anchor.selectedText}`)
    .join('|');

  useEffect(() => {
    const editable = editableRef.current;
    if (!editable || document.activeElement === editable) return;
    const decorated = decorateAnnotatedHtml(displayText, selectedTextAnnotations);
    if (editable.innerHTML !== decorated) editable.innerHTML = decorated;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayText, activeTab, inlineEditing, annotationSignature]);

  const saveInlineText = () => {
    const html = editableRef.current ? cleanEditableHtml(editableRef.current) : '';
    setNodes((nodes) => nodes.map((node) => {
      if (node.id !== id) return node;
      if (!hasMulti) return { ...node, data: { ...node.data, text: html } };
      return {
        ...node,
        data: {
          ...node.data,
          translations: { ...node.data.translations, [activeTab]: html },
          ...(activeTab === 'krv' ? { text: html } : {}),
        },
      };
    }));
  };

  const revealSelectionPin = () => {
    requestAnimationFrame(() => {
      const selection = window.getSelection?.();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        setSelectionPin(null);
        return;
      }
      const range = selection.getRangeAt(0);
      const root = annotationRootRef.current;
      if (!root?.contains(range.commonAncestorContainer)) {
        setSelectionPin(null);
        return;
      }
      const rangeRect = range.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      setSelectionPin({
        left: Math.max(4, Math.min(rangeRect.left - rootRect.left, rootRect.width - 86)),
        top: Math.max(36, rangeRect.top - rootRect.top - 34),
      });
    });
  };

  useEffect(() => {
    // 원어(TAGNT/TAHOT) 또는 LXX(칠십인역) 탭에서 단어별 어형/사전 데이터를 로드한다.
    if ((activeTab !== 'original' && activeTab !== 'lxx') || !data.bookId) return;
    let cancelled = false;
    const langOverride = activeTab === 'lxx' ? 'lxx' : undefined;
    loadVerseLexicon(data.bookId, data.chapter, data.verseStart, data.verseEnd, langOverride)
      .then((entries) => { if (!cancelled) setLexEntries(entries || []); })
      .catch(() => { if (!cancelled) setLexEntries([]); });
    return () => { cancelled = true; };
  }, [activeTab, data.bookId, data.chapter, data.verseStart, data.verseEnd]);

  // lexEntries(STEPBible 원문 단어)를 직접 chip으로 렌더링
  const renderOriginalWithLexicon = () => {
    if (!selected) return null;
    return lexEntries.map((e, i) => (
      <span key={i}>
        <span
          onClick={(ev) => {
            ev.stopPropagation();
            const rect = ev.currentTarget.getBoundingClientRect();
            setPopups(prev => [...prev, { id: ++_popupSeq, entry: e, anchor: { x: rect.left + rect.width / 2, y: rect.bottom } }]);
          }}
          className="nodrag"
          style={{ cursor: 'pointer', borderBottom: '1px dotted #8b5cf6' }}
          title={`${e.tr || ''} · ${e.s || ''} · ${e.g || ''} — 클릭: 어형 카드`}
        >
          {e.w}
        </span>
        {' '}
      </span>
    ));
  };

  return (
    <BackgroundNodeFrame
      id={id}
      selected={selected}
      title="성경 본문"
      icon="📖"
      accent={borderColor}
      headerBackground={isOT(data.bookId) ? '#fef3c7' : '#dbeafe'}
      nodeKind="verse"
      minWidth={430}
      minHeight={60}
      headerActions={hasMulti ? (
        <PassageAnnotationPin
          passage={passage}
          referenceLabel={data.reference}
          translationId={activeTab}
          selectionRootRef={annotationRootRef}
          showLabel
          prominent
        />
      ) : null}
    >
      <div ref={annotationRootRef} data-annotation-root style={{ position: 'relative' }}>
      {/* Header */}
      <div
        style={{
          fontWeight: 700,
          fontSize: titleSize,
          color: borderColor,
          marginBottom: activeBadges.length > 0 ? 4 : 6,
          borderBottom: activeBadges.length > 0 ? 'none' : `1px solid ${borderColor}30`,
          paddingBottom: activeBadges.length > 0 ? 0 : 4,
        }}
      >
        📖 {data.reference}
      </div>

      {wholePassageAnnotations.length > 0 && (
        <div
          title="이 본문 범위 전체에 개인 주석이 있습니다."
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            margin: '-1px 0 7px', padding: '3px 8px',
            border: '1px solid #fbbf24', borderRadius: 10,
            background: '#fffbeb', color: '#92400e',
            fontSize: 10, fontWeight: 800,
          }}
        >
          📌 이 구절에 주석 {wholePassageAnnotations.length}개
        </div>
      )}

      {/* Edge count badges */}
      {activeBadges.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6,
          paddingBottom: 4, borderBottom: `1px solid ${borderColor}30`,
        }}>
          {activeBadges.map((cfg) => (
            <span
              key={cfg.type}
              title={`${cfg.label} ${edgeCounts[cfg.type]}개`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 2,
                padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                color: cfg.color, background: cfg.bg,
                border: `1px solid ${cfg.color}40`,
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: cfg.color, display: 'inline-block', flexShrink: 0,
              }} />
              {cfg.label} {edgeCounts[cfg.type]}
            </span>
          ))}
        </div>
      )}

      {/* Translation tabs */}
      {hasMulti && (
        <div
          role="tablist"
          aria-label="성경 역본 선택"
          style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}
        >
          {tabs.map((t) => (
            <button
              type="button"
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => handleTabClick(t.id)}
              style={{
                minWidth: t.id === 'krv' ? 116 : 82,
                minHeight: 44,
                padding: '9px 16px',
                fontSize: 20,
                lineHeight: 1.15,
                fontWeight: activeTab === t.id ? 750 : 650,
                letterSpacing: '-0.02em',
                border: activeTab === t.id
                  ? '1px solid #0071e3'
                  : '1px solid rgba(60, 60, 67, 0.24)',
                borderRadius: 12,
                cursor: 'pointer',
                background: activeTab === t.id ? '#007aff' : '#f2f2f7',
                color: activeTab === t.id ? '#fff' : '#1d1d1f',
                boxShadow: activeTab === t.id
                  ? '0 3px 10px rgba(0, 122, 255, 0.28), inset 0 1px rgba(255,255,255,0.24)'
                  : '0 1px 3px rgba(0, 0, 0, 0.10), inset 0 1px rgba(255,255,255,0.86)',
                opacity: tabErrors[t.id] ? 0.5 : 1,
                whiteSpace: 'nowrap',
                writingMode: 'horizontal-tb',
                wordBreak: 'keep-all',
                flexShrink: 0,
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Pretendard", "Noto Sans KR", sans-serif',
                transition: 'background-color .16s ease, color .16s ease, box-shadow .16s ease, transform .16s ease',
              }}
            >
              {t.label}
              {tabLoading[t.id] && ' …'}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {tabErrors[activeTab] ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: '#dc2626', fontSize: 11 }}>{tabErrors[activeTab]}</span>
          <button
            type="button"
            className="nodrag"
            onClick={(event) => {
              event.stopPropagation();
              retryTranslation(activeTab);
            }}
            style={{
              padding: '3px 8px', border: '1px solid #fecaca', borderRadius: 4,
              background: '#fef2f2', color: '#b91c1c', fontSize: 10, cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      ) : isLoading ? (
        <div style={{ color: '#94a3b8', fontSize: 12 }}>불러오는 중…</div>
      ) : (activeTab === 'original' || activeTab === 'lxx') && selected && lexEntries.length > 0 ? (
        <div
          onMouseUp={revealSelectionPin}
          style={{ color: '#1e293b', fontSize: bodySize, direction: isRTL ? 'rtl' : 'ltr', fontFamily: isRTL ? '"SBL BibLit", "Ezra SIL", serif' : '"Gentium Plus", Cardo, serif' }}
        >
          {renderOriginalWithLexicon()}
          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>
            💡 밑줄 단어 클릭 → 어형 분석
          </div>
        </div>
      ) : (activeTab !== 'original' && activeTab !== 'lxx') ? (
        <div
          ref={editableRef}
          className="rich-text-display nodrag nopan"
          contentEditable
          suppressContentEditableWarning
          spellCheck={activeTab === 'web'}
          onFocus={() => {
            stripAnnotationMarkup(editableRef.current);
            setSelectionPin(null);
            setInlineEditing(true);
          }}
          onBlur={() => {
            saveInlineText();
            setInlineEditing(false);
          }}
          onInput={saveInlineText}
          onMouseUp={revealSelectionPin}
          onKeyUp={revealSelectionPin}
          style={{
            color: '#1e293b',
            fontSize: bodySize,
            direction: isRTL ? 'rtl' : 'ltr',
            minHeight: 28,
            padding: '6px 7px',
            margin: '-6px -7px',
            borderRadius: 6,
            outline: inlineEditing ? '2px solid #93c5fd' : '1px solid transparent',
            background: inlineEditing ? '#f8fbff' : 'transparent',
            cursor: 'text',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
          title="클릭하여 본문을 바로 편집하거나 문구를 선택해 주석을 추가하세요"
        />
      ) : (
        displayText ? (
          <div
            className="rich-text-display nodrag nopan"
            onMouseUp={revealSelectionPin}
            style={{
              color: displayText.startsWith('(') ? '#94a3b8' : '#1e293b',
              fontSize: bodySize,
              direction: isRTL ? 'rtl' : 'ltr',
              fontFamily: isRTL ? '"SBL BibLit", "Ezra SIL", serif' : '"Gentium Plus", Cardo, serif',
            }}
            dangerouslySetInnerHTML={{
              __html: decorateAnnotatedHtml(displayText, selectedTextAnnotations),
            }}
          />
        ) : (
          <span style={{ color: '#cbd5e1', fontSize: 11 }}>탭을 클릭하면 본문을 불러옵니다</span>
        )
      )}

      {selectedTextAnnotations.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {selectedTextAnnotations.map((annotation) => (
            <span
              key={annotation.id}
              title={annotation.content || '선택 문구 개인 주석'}
              style={{
                maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                padding: '2px 7px', borderRadius: 9,
                background: '#fef9c3', color: '#854d0e',
                border: '1px solid #fde68a', fontSize: 9, fontWeight: 700,
              }}
            >
              📌 “{annotation.anchor.selectedText}”
            </span>
          ))}
        </div>
      )}

      {selectionPin && hasMulti && (
        <div
          className="nodrag nopan"
          style={{
            position: 'absolute',
            left: selectionPin.left,
            top: selectionPin.top,
            zIndex: 20,
          }}
        >
          <PassageAnnotationPin
            passage={passage}
            referenceLabel={data.reference}
            translationId={activeTab}
            selectionRootRef={annotationRootRef}
            compact
            showLabel
            label="선택 주석"
            prominent
          />
        </div>
      )}

      {popups.map((p) => (
        <LexiconPopup
          key={p.id}
          entry={p.entry}
          anchor={p.anchor}
          bookId={data.bookId}
          onClose={() => setPopups((prev) => prev.filter((x) => x.id !== p.id))}
        />
      ))}
      </div>
    </BackgroundNodeFrame>
  );
}
