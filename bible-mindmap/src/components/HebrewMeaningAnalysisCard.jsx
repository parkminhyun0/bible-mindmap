import { useEffect, useMemo, useState } from 'react';
import { fetchStrongDefinition } from '../utils/lexicon.js';
import { analyzeHebrewMorphologyMeaning, hebrewStemGuidanceList } from '../utils/hebrewMeaningAnalysis.js';

function SourceBranch({ branch }) {
  return (
    <div
      style={{
        border: '1px solid #dfe5ee',
        borderRadius: 9,
        background: '#fff',
        padding: '9px 10px',
      }}
      data-testid="bdb-meaning-branch"
    >
      {branch.parentText && branch.depth > 0 && (
        <div style={{ marginBottom: 4, color: '#94a3b8', fontSize: 9, lineHeight: 1.45 }}>
          상위 분기 · {branch.parentText}
        </div>
      )}
      <div style={{ color: '#24324a', fontSize: 11, fontWeight: 700, lineHeight: 1.55 }}>
        {branch.text}
      </div>
      {branch.children?.length > 0 && (
        <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: '2px solid #d8e4f2' }}>
          {branch.children.map((child) => (
            <div key={child.id || child.text} style={{ marginTop: 4, color: '#526074', fontSize: 10, lineHeight: 1.5 }}>
              {child.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BinyanGuide({ currentStem, appliesToCurrentWord }) {
  const guides = useMemo(() => hebrewStemGuidanceList(), []);

  return (
    <details
      open={appliesToCurrentWord}
      data-testid="binyan-korean-guide"
      style={{ marginTop: 10, borderTop: '1px solid #dbe5f0', paddingTop: 8 }}
    >
      <summary style={{ cursor: 'pointer', color: '#334155', fontSize: 11, fontWeight: 850 }}>
        히브리어 7대 Binyan · 해석상 의미 변화 한글 가이드
      </summary>

      <div style={{ marginTop: 8, color: '#64748b', fontSize: 9.5, lineHeight: 1.6 }}>
        {appliesToCurrentWord
          ? '현재 동사의 어간을 강조해서 보여줍니다. 아래 설명은 각 Binyan의 일반적인 해석 경향이며, 실제 번역과 의미 선택은 해당 단어의 BDB stem/sense와 문맥을 우선합니다.'
          : '현재 단어는 동사가 아니므로 Binyan이 직접 적용되지 않습니다. 아래 내용은 히브리어 동사를 분석할 때 사용하는 비교 가이드입니다.'}
      </div>

      <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {guides.map((guide) => {
          const active = guide.stem === currentStem;
          return (
            <div
              key={guide.stem}
              data-testid={`binyan-guide-${guide.stem.toLowerCase()}`}
              style={{
                border: active ? '1px solid #8bb5e8' : '1px solid #e1e7ef',
                borderRadius: 9,
                background: active ? '#eef6ff' : '#fff',
                padding: '9px 10px',
                boxShadow: active ? '0 0 0 1px rgba(59,130,246,.05)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ color: '#17375f', fontSize: 11.5 }}>
                  {guide.ko} ({guide.stem})
                </strong>
                {active && (
                  <span style={{ padding: '2px 6px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontSize: 8.5, fontWeight: 850 }}>
                    현재 형태
                  </span>
                )}
              </div>
              <div style={{ marginTop: 6, color: '#475569', fontSize: 10.5, lineHeight: 1.65 }}>
                <b style={{ color: '#334155' }}>해석상 경향:</b> {guide.interpretation}
              </div>
              <div style={{ marginTop: 4, color: '#526074', fontSize: 10, lineHeight: 1.6 }}>
                <b style={{ color: '#475569' }}>의미 이동:</b> {guide.semanticShift}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, padding: '8px 9px', borderRadius: 8, background: '#fff8e8', border: '1px solid #f1dfb7', color: '#725414', fontSize: 9.5, lineHeight: 1.6 }}>
        <strong>주의:</strong> Binyan은 의미를 기계적으로 결정하는 공식이 아닙니다. 같은 어간이라도 어휘마다 의미가 달라질 수 있으므로, 이 가이드는 해석 방향을 이해하기 위한 보조 설명이고 최종 의미는 BDB의 실제 분기와 문장 구조를 확인합니다.
      </div>
    </details>
  );
}

export default function HebrewMeaningAnalysisCard({ strong, code }) {
  const [definition, setDefinition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!strong?.startsWith('H') || !code?.startsWith('H')) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchStrongDefinition(strong)
      .then((value) => {
        if (!cancelled) setDefinition(value);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason?.message || 'BDB 의미 분기 로드 실패');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [strong, code]);

  const analysis = useMemo(
    () => analyzeHebrewMorphologyMeaning(code, definition?.source === 'bdbt' ? definition.nodes : []),
    [code, definition],
  );

  const otherOverviewBranches = useMemo(() => {
    const selected = new Set((analysis.branches || []).map((branch) => branch.text));
    return (analysis.overviewBranches || []).filter((branch) => !selected.has(branch.text));
  }, [analysis]);

  if (!strong?.startsWith('H') || !code?.startsWith('H')) return null;

  const bdbReady = definition?.source === 'bdbt' && !definition?.bdbUnavailable;
  const isVerb = analysis.kind === 'verb';

  return (
    <section
      aria-label="히브리어 형태와 BDB 의미 변화 분석"
      data-testid="hebrew-meaning-analysis-card"
      style={{
        marginTop: 10,
        padding: '12px',
        borderRadius: 11,
        border: '1px solid #cddced',
        background: '#f8fbff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <strong style={{ color: '#17375f', fontSize: 12 }}>형태 → 의미 변화</strong>
        <span style={{ color: '#64748b', fontSize: 9, fontWeight: 700 }}>BDB source-linked</span>
      </div>

      <div style={{ marginTop: 8, padding: '9px 10px', borderRadius: 9, background: '#fff', border: '1px solid #e1e7ef' }}>
        <div style={{ color: '#64748b', fontSize: 9, fontWeight: 800 }}>현재 문법 형태</div>
        <div style={{ marginTop: 4, color: '#172033', fontSize: 12, fontWeight: 800, lineHeight: 1.55 }} data-testid="meaning-grammar-summary">
          {analysis.grammarSummary || code}
        </div>
        <div style={{ marginTop: 6, color: '#475569', fontSize: 11, lineHeight: 1.65 }} data-testid="meaning-form-explanation">
          {analysis.explanation}
        </div>
      </div>

      <BinyanGuide currentStem={analysis.stem || ''} appliesToCurrentWord={isVerb} />

      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <strong style={{ color: '#334155', fontSize: 11 }}>{analysis.sourceLabel}</strong>
          <span style={{ color: '#94a3b8', fontSize: 9 }}>사전 원문 분기 · 뜻 자동생성 아님</span>
        </div>

        {loading && <div style={{ color: '#64748b', fontSize: 10 }}>BDB 의미 분기를 연결하는 중…</div>}
        {error && <div style={{ color: '#b91c1c', fontSize: 10 }}>{error}</div>}
        {!loading && !error && !bdbReady && (
          <div style={{ padding: '8px 9px', borderRadius: 8, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: 10, lineHeight: 1.55 }}>
            BDB 원문을 확인하지 못해 의미 분기 연결을 보류했습니다. 일반 형태 기능만 참고하고, 사전 정의 탭에서 BDB를 다시 불러와 주세요.
          </div>
        )}
        {!loading && !error && bdbReady && analysis.branches.length === 0 && (
          <div style={{ color: '#64748b', fontSize: 10, lineHeight: 1.55 }}>
            현재 형태와 직접 연결되는 BDB 분기 표지를 찾지 못했습니다. 사전 정의 탭의 전체 sense 구조를 확인해 주세요.
          </div>
        )}
        {!loading && !error && bdbReady && analysis.branches.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {analysis.branches.map((branch) => <SourceBranch branch={branch} key={branch.id || branch.text} />)}
          </div>
        )}
      </div>

      {!loading && !error && bdbReady && otherOverviewBranches.length > 0 && (
        <details
          open={analysis.kind === 'nominal'}
          data-testid="bdb-other-senses"
          style={{ marginTop: 10, borderTop: '1px solid #dbe5f0', paddingTop: 8 }}
        >
          <summary style={{ cursor: 'pointer', color: '#475569', fontSize: 10.5, fontWeight: 800 }}>
            BDB의 다른 주요 의미 분기 · 비교하기
          </summary>
          <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {otherOverviewBranches.map((branch) => <SourceBranch branch={branch} key={`overview-${branch.id || branch.text}`} />)}
          </div>
        </details>
      )}

      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #dbe5f0', color: '#64748b', fontSize: 9.5, lineHeight: 1.6 }} data-testid="meaning-analysis-caution">
        <strong style={{ color: '#475569' }}>해석 원칙:</strong> {analysis.caution} 현재 절에서 어느 sense가 실제로 선택되는지는 형태론뿐 아니라 구문·주어/동사 일치·앞뒤 문맥까지 함께 확인합니다.
      </div>
    </section>
  );
}
