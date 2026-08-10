import { useEffect, useMemo, useState } from 'react';
import { lexiconApprovalLoader } from '../data/lexiconApprovalLoader';

function toOutlineLetter(index) {
  let current = Number(index);
  if (!Number.isInteger(current) || current < 1) return '';
  let label = '';
  while (current > 0) {
    current -= 1;
    label = String.fromCharCode(97 + (current % 26)) + label;
    current = Math.floor(current / 26);
  }
  return label;
}

function outlineMarker(nodeId, depth = 0) {
  const segments = String(nodeId ?? '').split('.');
  const index = Number.parseInt(segments[segments.length - 1], 10);
  if (!Number.isInteger(index) || index < 1) return String(nodeId ?? '');
  return `${depth % 2 === 0 ? index : toOutlineLetter(index)}.`;
}

function buildDefinitionTree(senses) {
  const ordered = [...(senses || [])].sort((a, b) => a.order - b.order);
  const nodes = new Map(ordered.map((sense) => [sense.id, { ...sense, children: [] }]));
  const roots = [];
  for (const sense of ordered) {
    const node = nodes.get(sense.id);
    if (sense.parentId && nodes.has(sense.parentId)) nodes.get(sense.parentId).children.push(node);
    else roots.push(node);
  }
  return roots;
}

function DefinitionNode({ node, depth, fs }) {
  return (
    <div style={{ marginTop: depth === 0 ? 0 : 5 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '2.2em minmax(0,1fr)', gap: 5,
        paddingLeft: depth * 13, alignItems: 'start',
      }}>
        <span style={{
          color: depth === 0 ? '#92400e' : '#64748b', fontFamily: 'monospace',
          fontSize: Math.max(9, fs - 2), fontWeight: 700, lineHeight: 1.65,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {outlineMarker(node.id, depth)}
        </span>
        <span style={{
          color: '#1e293b', fontSize: depth === 0 ? fs : Math.max(10, fs - 1),
          fontWeight: depth <= 1 ? 700 : 500, lineHeight: 1.65, wordBreak: 'keep-all',
        }}>
          {node.translationKo}
        </span>
      </div>
      {node.children?.map((child) => (
        <DefinitionNode key={child.id} node={child} depth={depth + 1} fs={fs} />
      ))}
    </div>
  );
}

export default function ApprovedKoreanLexiconPane({ strong, fs = 13 }) {
  const [approvedEntry, setApprovedEntry] = useState(null);
  const [loading, setLoading] = useState(Boolean(strong));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setApprovedEntry(null);
    setFailed(false);
    if (!strong) {
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    lexiconApprovalLoader.loadApprovedEntry(strong)
      .then((entry) => {
        if (cancelled) return;
        setApprovedEntry(entry);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [strong]);

  const definitionTree = useMemo(
    () => buildDefinitionTree(approvedEntry?.approvedSenseTree),
    [approvedEntry],
  );

  const identity = approvedEntry?.identity || {};
  const senseCount = approvedEntry?.approvedSenseTree?.length || 0;

  return (
    <section
      aria-label={`${strong || ''} 한글 승인 사전`}
      data-word-search-korean-lexicon={strong || ''}
      style={{
        minWidth: 0, minHeight: 0, height: '100%', overflowY: 'auto',
        padding: '12px 14px', boxSizing: 'border-box', background: '#fffdf5',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        paddingBottom: 9, marginBottom: 10, borderBottom: '1px solid #fde68a',
      }}>
        <strong style={{ color: '#92400e', fontSize: Math.max(11, fs - 1) }}>한글 사전</strong>
        {approvedEntry && (
          <span style={{
            padding: '2px 6px', borderRadius: 99, background: '#f0fdf4', color: '#166534',
            border: '1px solid #bbf7d0', fontSize: Math.max(8, fs - 4), fontWeight: 800,
          }}>
            ✓ 승인본
          </span>
        )}
      </div>

      {loading && (
        <div style={{ color: '#94a3b8', fontSize: Math.max(10, fs - 1) }}>한글 사전 조회 중…</div>
      )}

      {!loading && !approvedEntry && (
        <div style={{
          padding: '12px 10px', borderRadius: 8, background: '#f8fafc',
          border: '1px solid #e2e8f0', color: '#64748b',
          fontSize: Math.max(10, fs - 1), lineHeight: 1.65,
        }}>
          {failed
            ? '승인 한글 사전을 불러오지 못했습니다. 영어 원사전은 그대로 사용할 수 있습니다.'
            : '아직 사람 승인된 한글 사전 항목이 없습니다. 승인된 Strong만 이 영역에 표시됩니다.'}
        </div>
      )}

      {approvedEntry && (
        <>
          <div style={{ marginBottom: 11 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
              <span style={{
                color: '#92400e', fontSize: fs + 5, fontWeight: 800,
                fontFamily: strong?.startsWith('H') ? '"Ezra SIL","SBL BibLit","Noto Serif Hebrew",serif' : '"SBL BibLit","Gentium Plus",serif',
              }}>
                {identity.lemma}
              </span>
              {identity.transliteration?.korean && (
                <span style={{ color: '#64748b', fontSize: Math.max(10, fs - 1), fontWeight: 700 }}>
                  {identity.transliteration.korean}
                </span>
              )}
            </div>
            <div style={{ marginTop: 3, color: '#94a3b8', fontSize: Math.max(9, fs - 3) }}>
              Approval Registry · {identity.canonicalStrong || strong} · 승인 의미 {senseCount}개
            </div>
          </div>

          <div data-testid="word-search-approved-korean-sense-tree">
            {definitionTree.map((node) => (
              <DefinitionNode key={node.id} node={node} depth={0} fs={fs} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
