import { useEffect, useMemo, useState } from 'react';
import { fetchStrongDefinition } from '../utils/lexicon.js';
import { analyzeHebrewMorphologyMeaning } from '../utils/hebrewMeaningAnalysis.js';

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

  if (!strong?.startsWith('H') || !code?.startsWith('H')) return null;

  const bdbReady = definition?.source === 'bdbt' && !definition?.bdbUnavailable;

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

      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #dbe5f0', color: '#64748b', fontSize: 9.5, lineHeight: 1.6 }} data-testid="meaning-analysis-caution">
        <strong style={{ color: '#475569' }}>해석 원칙:</strong> {analysis.caution} 현재 절에서 어느 sense가 실제로 선택되는지는 형태론뿐 아니라 구문·주어/동사 일치·앞뒤 문맥까지 함께 확인합니다.
      </div>
    </section>
  );
}
