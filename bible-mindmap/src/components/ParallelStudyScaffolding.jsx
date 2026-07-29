import { useEffect, useMemo, useRef, useState } from 'react';
import { RESEARCH_LENSES } from '../data/researchLenses';
import { GUIDED_STUDIES } from '../data/guidedStudies';
import { PARALLEL_ONBOARDING } from '../data/onboardingScript';
import { RESEARCH_GLOSSARY } from '../data/researchGlossary';
import { RESEARCH_GLOSSARY_CONTEXT } from '../data/researchGlossaryContext';
import { SYNOPTIC_PROMPT_CARDS } from '../data/synopticPromptCards';
import { CITATION_PROMPT_CARDS } from '../data/citationPromptCards';
import { CITATIONS } from '../data/citations';

const DIFF_BADGE = {
  beginner: { label: '입문', bg: '#dcfce7', color: '#166534' },
  intermediate: { label: '중급', bg: '#fef3c7', color: '#92400e' },
  advanced: { label: '고급', bg: '#fee2e2', color: '#991b1b' },
};

const CITATION_TYPE_LABEL = {
  'formula-quotation': '성취 공식 인용',
  'free-quotation': '자유 인용',
  paraphrase: '재진술',
  allusion: '인유·암시',
  echo: '반향',
  typology: '유형론',
};

const GLOSSARY_INDEX = (() => {
  const idx = new Map();
  for (const g of [...RESEARCH_GLOSSARY, ...RESEARCH_GLOSSARY_CONTEXT]) {
    if (!idx.has(g.term)) idx.set(g.term, g);
    if (g.alsoKnownAs) {
      for (const alt of g.alsoKnownAs.split('·').map((s) => s.trim())) {
        if (alt && !idx.has(alt)) idx.set(alt, g);
      }
    }
  }
  return idx;
})();

const GLOSSARY_REGEX = (() => {
  const terms = [...GLOSSARY_INDEX.keys()].sort((a, b) => b.length - a.length);
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(${escaped.join('|')})`, 'g');
})();

export function findGuidedStudy(id, list = GUIDED_STUDIES) {
  return list.find((s) => s.id === id) || null;
}

export function findLens(id, list = RESEARCH_LENSES) {
  return list.find((l) => l.id === id) || null;
}

export function findCitationCardForAnchor(anchor) {
  if (!anchor) return null;
  for (const c of CITATIONS) {
    if (c.citing.book === anchor.book
        && c.citing.chapter === anchor.chapter
        && c.citing.verseStart <= anchor.verseEnd
        && c.citing.verseEnd >= anchor.verseStart) {
      const card = CITATION_PROMPT_CARDS[c.id];
      if (card) return { citation: c, card };
    }
    for (const source of c.sources) {
      if (source.book === anchor.book
          && source.chapter === anchor.chapter
          && source.verseStart <= anchor.verseEnd
          && source.verseEnd >= anchor.verseStart) {
        const card = CITATION_PROMPT_CARDS[c.id];
        if (card) return { citation: c, card };
      }
    }
  }
  return null;
}

export function GlossaryText({ text, style }) {
  const [active, setActive] = useState(null);
  const [anchorRect, setAnchorRect] = useState(null);
  const nodes = useMemo(() => {
    if (!text) return [];
    const parts = text.split(GLOSSARY_REGEX);
    return parts.map((part, i) => {
      const entry = GLOSSARY_INDEX.get(part);
      if (!entry) return { key: i, text: part };
      return { key: i, text: part, entry };
    });
  }, [text]);

  const openTooltip = (e, entry) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchorRect({ x: rect.left, y: rect.bottom });
    setActive(entry);
  };
  const closeTooltip = () => { setActive(null); setAnchorRect(null); };

  return (
    <span style={style}>
      {nodes.map((n) => n.entry ? (
        <span
          key={n.key}
          data-glossary-term={n.entry.id}
          onMouseEnter={(e) => openTooltip(e, n.entry)}
          onMouseLeave={closeTooltip}
          onClick={(e) => openTooltip(e, n.entry)}
          style={{
            borderBottom: '1px dotted #64748b', cursor: 'help',
            color: '#334155', textUnderlineOffset: 3,
          }}
        >{n.text}</span>
      ) : <span key={n.key}>{n.text}</span>)}
      {active && anchorRect && (
        <div
          role="tooltip"
          style={{
            position: 'fixed', left: Math.min(anchorRect.x, window.innerWidth - 300),
            top: anchorRect.y + 6, zIndex: 3400, width: 280,
            background: '#0f172a', color: '#f8fafc', padding: 10, borderRadius: 8,
            boxShadow: '0 8px 24px rgba(15,23,42,.35)', fontSize: 11.5, lineHeight: 1.55,
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 3 }}>{active.term}</div>
          {active.alsoKnownAs && <div style={{ opacity: .7, fontSize: 10, marginBottom: 5 }}>{active.alsoKnownAs}</div>}
          <div>{active.shortDef}</div>
          {active.example && <div style={{ marginTop: 5, fontStyle: 'italic', opacity: .85 }}>예 · {active.example}</div>}
          {active.cautionNote && <div style={{ marginTop: 5, color: '#fbbf24' }}>⚠ {active.cautionNote}</div>}
        </div>
      )}
    </span>
  );
}

export function GuidedCourseCarousel({ activeCourseId, onSelectCourse, isMobile, courses = GUIDED_STUDIES, marker = 'data-guided-courses', headerLabel = '가이드 학습 코스', headerNote = '· 25-50분 안내형 연구' }) {
  const dataMarker = { [marker]: '' };
  return (
    <section {...dataMarker} style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>🎓</span>
        <strong style={{ fontSize: 11, color: '#334155' }}>{headerLabel}</strong>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{headerNote}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'thin' }}>
        {courses.map((course) => {
          const active = course.id === activeCourseId;
          const diff = DIFF_BADGE[course.difficulty];
          return (
            <button
              key={course.id}
              type="button"
              onClick={() => onSelectCourse(active ? null : course)}
              style={{
                flex: '0 0 auto', width: isMobile ? 200 : 220,
                textAlign: 'left', padding: '9px 10px',
                borderRadius: 10, cursor: 'pointer',
                border: active ? '2px solid #0f766e' : '1px solid #e2e8f0',
                background: active ? '#ecfeff' : '#fff',
                boxShadow: active ? '0 2px 8px rgba(15,118,110,.25)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <span style={{ fontSize: 15 }}>{course.coverEmoji}</span>
                <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                  background: diff.bg, color: diff.color }}>{diff.label}</span>
                <span style={{ fontSize: 9.5, color: '#94a3b8' }}>·{course.estimatedMinutes}분</span>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.35, marginBottom: 3 }}>
                {course.title}
              </div>
              <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>{course.subtitle}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ActiveCoursePanel({ course, currentStepIdx, onStepClick, onExit }) {
  if (!course) return null;
  const diff = DIFF_BADGE[course.difficulty];
  return (
    <section style={{
      padding: 12, borderRadius: 10, marginBottom: 10,
      background: 'linear-gradient(135deg,#f0fdfa,#ecfeff)',
      border: '1px solid #99f6e4',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{course.coverEmoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 800,
              background: diff.bg, color: diff.color }}>{diff.label}</span>
            <span style={{ fontSize: 10, color: '#64748b' }}>· {course.estimatedMinutes}분</span>
          </div>
          <strong style={{ display: 'block', fontSize: 13, color: '#134e4a' }}>{course.title}</strong>
          <div style={{ fontSize: 10.5, color: '#0f766e', marginTop: 2 }}>{course.subtitle}</div>
        </div>
        <button type="button" onClick={onExit} aria-label="코스 종료"
          style={{ border: 'none', background: 'transparent', color: '#0f766e', fontSize: 11,
            cursor: 'pointer', padding: 4 }}>종료</button>
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: '#0f766e', marginBottom: 4 }}>학습 목표</div>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#134e4a', lineHeight: 1.55 }}>
        {course.learningGoals.map((g, i) => <li key={i}><GlossaryText text={g} /></li>)}
      </ul>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: '#0f766e', marginTop: 8, marginBottom: 4 }}>진행 스텝</div>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {course.steps.map((step, i) => {
          const active = i === currentStepIdx;
          const done = i < currentStepIdx;
          return (
            <li key={i}>
              <button type="button" onClick={() => onStepClick(i)}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  padding: '7px 9px', borderRadius: 7, fontSize: 11, lineHeight: 1.5,
                  background: active ? '#0f766e' : done ? '#ccfbf1' : '#fff',
                  color: active ? '#fff' : done ? '#0f766e' : '#334155',
                  border: `1px solid ${active ? '#0f766e' : done ? '#5eead4' : '#e2e8f0'}`,
                }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{done ? '✓ ' : ''}{step.title}</div>
                <div style={{ opacity: active ? .95 : .8 }}>{step.prompt}</div>
              </button>
            </li>
          );
        })}
      </ol>
      <div style={{
        marginTop: 8, padding: '7px 9px', borderRadius: 7,
        background: '#134e4a', color: '#ecfeff', fontSize: 10.5, lineHeight: 1.6,
      }}>
        <b>핵심 요지 · </b><GlossaryText text={course.keyTakeaway} style={{ color: '#ecfeff' }} />
      </div>
    </section>
  );
}

export function LensPicker({ selectedLensId, onSelect, recommendedIds = [], lenses = RESEARCH_LENSES, marker = 'data-research-lens-picker' }) {
  const dataMarker = { [marker]: '' };
  return (
    <section {...dataMarker} style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: 13 }}>🔬</span>
        <strong style={{ fontSize: 11, color: '#334155' }}>연구 렌즈</strong>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>· 무엇에 주목할지 선택</span>
      </div>
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 4 }}>
        {lenses.map((lens) => {
          const active = lens.id === selectedLensId;
          const recommended = recommendedIds.includes(lens.id);
          return (
            <button key={lens.id} type="button"
              onClick={() => onSelect(active ? null : lens.id)}
              title={lens.oneLiner}
              style={{
                flex: '0 0 auto', minHeight: 36, padding: '6px 10px', borderRadius: 8,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                border: active ? `2px solid ${lens.tone}` : `1px solid ${recommended ? lens.tone : '#e2e8f0'}`,
                background: active ? lens.tone : recommended ? `${lens.tone}12` : '#fff',
                color: active ? '#fff' : lens.tone,
                fontSize: 11, fontWeight: active ? 800 : 700,
                boxShadow: active ? `0 2px 6px ${lens.tone}44` : 'none',
              }}
            >
              <span>{lens.icon}</span>
              <span>{lens.label}</span>
              {recommended && !active && <span style={{ fontSize: 9, opacity: .8 }}>★</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function LensDetailPanel({ lens }) {
  if (!lens) return null;
  return (
    <section style={{
      padding: 11, borderRadius: 10, marginBottom: 10,
      background: `${lens.tone}0d`, border: `1px solid ${lens.tone}44`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 15 }}>{lens.icon}</span>
        <strong style={{ fontSize: 12, color: lens.tone }}>{lens.label}</strong>
        <span style={{ fontSize: 10, color: '#64748b' }}>· {lens.oneLiner}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: lens.tone, marginBottom: 3 }}>관찰 프롬프트</div>
          <ol style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, color: '#334155', lineHeight: 1.55 }}>
            {lens.prompts.map((p, i) => <li key={i}><GlossaryText text={p} /></li>)}
          </ol>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: lens.tone, marginBottom: 3 }}>단계별 워크플로우</div>
          <ol style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, color: '#334155', lineHeight: 1.55, listStyle: 'none', paddingLeft: 0 }}>
            {lens.workflow.map((w, i) => <li key={i}>{w}</li>)}
          </ol>
        </div>
      </div>
      <div style={{
        marginTop: 8, padding: '6px 8px', borderRadius: 6,
        background: '#fef3c7', color: '#92400e', fontSize: 10, lineHeight: 1.5,
      }}>
        ⚠ <GlossaryText text={lens.watchOut} style={{ color: '#92400e' }} />
      </div>
      <div style={{ marginTop: 6, fontSize: 9.5, color: '#64748b' }}>
        학술 용어 · <GlossaryText text={lens.scholarTerm} />
      </div>
    </section>
  );
}

export function SynopticCard({ setId }) {
  if (!setId) return null;
  const card = SYNOPTIC_PROMPT_CARDS[setId];
  if (!card) return null;
  return (
    <section style={{
      padding: 11, borderRadius: 10, marginTop: 12,
      background: '#fff7ed', border: '1px solid #fdba74',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>📖</span>
        <strong style={{ fontSize: 12, color: '#9a3412' }}>공관 세트 관찰 카드</strong>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#9a3412', marginBottom: 3 }}>연구 질문</div>
          <ol style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, color: '#7c2d12', lineHeight: 1.55 }}>
            {card.researchQuestions.map((q, i) => <li key={i}><GlossaryText text={q} /></li>)}
          </ol>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#9a3412', marginBottom: 3 }}>예상 발견</div>
          <ol style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, color: '#7c2d12', lineHeight: 1.55 }}>
            {card.expectedFindings.map((f, i) => <li key={i}><GlossaryText text={f} /></li>)}
          </ol>
        </div>
      </div>
      <div style={{
        marginTop: 8, padding: '6px 8px', borderRadius: 6,
        background: '#fed7aa', color: '#7c2d12', fontSize: 10, lineHeight: 1.5,
      }}>
        → 다음 · <GlossaryText text={card.tryNext} style={{ color: '#7c2d12' }} />
      </div>
    </section>
  );
}

export function CitationCard({ anchor }) {
  const match = useMemo(() => findCitationCardForAnchor(anchor), [anchor]);
  if (!match) return null;
  const { citation, card } = match;
  const typeLabel = CITATION_TYPE_LABEL[card.citationType] || card.citationType;
  return (
    <section style={{
      padding: 11, borderRadius: 10, marginTop: 12,
      background: '#eef2ff', border: '1px solid #a5b4fc',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14 }}>🧾</span>
        <strong style={{ fontSize: 12, color: '#3730a3' }}>인용 관찰 카드</strong>
        <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 800,
          background: '#3730a3', color: '#fff' }}>{typeLabel}</span>
        {citation.note && <span style={{ fontSize: 10, color: '#4338ca' }}>· {citation.note}</span>}
      </div>
      <div style={{ marginBottom: 8, padding: '6px 8px', borderRadius: 6,
        background: '#e0e7ff', color: '#312e81', fontSize: 10.5, lineHeight: 1.6 }}>
        <b>본문 전승 </b><GlossaryText text={card.lxxVsMt} style={{ color: '#312e81' }} />
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#3730a3', marginBottom: 3 }}>이 인용에서 관찰할 것</div>
      <ol style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, color: '#312e81', lineHeight: 1.55 }}>
        {card.observeThis.map((o, i) => <li key={i}><GlossaryText text={o} /></li>)}
      </ol>
      <div style={{
        marginTop: 8, padding: '6px 8px', borderRadius: 6,
        background: '#c7d2fe', color: '#312e81', fontSize: 10, lineHeight: 1.5,
      }}>
        <b>신학적 지렛대 · </b><GlossaryText text={card.theologicalPayoff} style={{ color: '#312e81' }} />
      </div>
    </section>
  );
}

export function useOnboarding(onboarding = PARALLEL_ONBOARDING, prefix = 'parallel') {
  const lsKey = `${prefix}-onboarding-v${onboarding.version}-dismissed`;
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !window.localStorage.getItem(lsKey);
  });
  const dismiss = () => {
    if (typeof window !== 'undefined') window.localStorage.setItem(lsKey, '1');
    setVisible(false);
  };
  const reopen = () => setVisible(true);
  return { visible, dismiss, reopen };
}

export function OnboardingOverlay({ onDone, onboarding = PARALLEL_ONBOARDING, marker = 'data-parallel-onboarding' }) {
  const [idx, setIdx] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const step = onboarding.steps[idx];

  useEffect(() => {
    const el = document.querySelector(step.targetSelector);
    if (!el) { setTargetRect(null); return; }
    const rect = el.getBoundingClientRect();
    setTargetRect({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
    try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch {}
  }, [step.targetSelector]);

  const next = () => {
    if (idx + 1 >= onboarding.steps.length) onDone();
    else setIdx(idx + 1);
  };

  const dataMarker = { [marker]: '' };
  return (
    <div
      {...dataMarker}
      style={{
        position: 'fixed', inset: 0, zIndex: 3300,
        background: 'rgba(15,23,42,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onDone}
    >
      {targetRect && (
        <div style={{
          position: 'fixed', left: targetRect.x - 6, top: targetRect.y - 6,
          width: targetRect.w + 12, height: targetRect.h + 12,
          border: '3px solid #fbbf24', borderRadius: 10, boxShadow: '0 0 0 9999px rgba(15,23,42,.55)',
          pointerEvents: 'none', transition: 'all .25s ease',
        }} />
      )}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 1, width: 'min(360px, 92vw)',
          background: '#fff', borderRadius: 12, padding: 18,
          boxShadow: '0 24px 60px rgba(15,23,42,.4)',
        }}>
        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>
          {idx + 1} / {onboarding.steps.length}
        </div>
        <strong style={{ display: 'block', fontSize: 15, color: '#0f172a', marginBottom: 6 }}>{step.title}</strong>
        <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.6, marginBottom: 12 }}>
          <GlossaryText text={step.body} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={onDone}
            style={{ border: 'none', background: 'transparent', color: '#64748b', fontSize: 11, cursor: 'pointer' }}
          >건너뛰기</button>
          <button type="button" onClick={next}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: 8,
              background: '#0f766e', color: '#fff', fontWeight: 700, fontSize: 12,
              cursor: 'pointer', minHeight: 40,
            }}
          >{step.cta}</button>
        </div>
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
          {(onboarding.emptyStateHints || []).map((h, i) => (
            <div key={i} style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.5 }}>💡 {h}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
