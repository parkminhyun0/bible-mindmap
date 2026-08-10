import { useMemo } from 'react';

function toBdbLetter(index) {
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

export function formatBdbOutlineMarker(nodeId, depth = 0) {
  const segments = String(nodeId ?? '').split('.');
  const index = Number.parseInt(segments[segments.length - 1], 10);
  if (!Number.isInteger(index) || index < 1) return String(nodeId ?? '');

  const marker = depth % 2 === 0 ? String(index) : toBdbLetter(index);
  return `${marker}.`;
}

function buildApprovedDefinitionTree(senses) {
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

function EvidenceBadge({ support }) {
  if (!support || support === 'direct') return null;
  const legacy = support === 'legacy-only';
  return (
    <span
      title={legacy ? '현재 공개 sourceText에 직접 대응되지 않아 기존 사람 승인 의미를 보존한 항목' : '둘 이상의 근거 조각을 결합해 대응한 항목'}
      style={{
        marginLeft: 6,
        padding: '1px 5px',
        borderRadius: 999,
        background: legacy ? '#fff7ed' : '#f1f5f9',
        color: legacy ? '#9a3412' : '#64748b',
        fontSize: 8,
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      {legacy ? '기존 승인 보존' : '결합 근거'}
    </span>
  );
}

function DefinitionNode({ node, depth = 0 }) {
  return (
    <div style={{ marginTop: depth === 0 ? 0 : 6 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2.4em minmax(0, 1fr)',
        gap: 6,
        paddingLeft: depth * 16,
        alignItems: 'start',
      }}>
        <span style={{
          color: depth === 0 ? '#92400e' : '#64748b',
          fontFamily: 'monospace',
          fontSize: depth === 0 ? 12 : 11,
          fontWeight: 700,
          lineHeight: 1.65,
          textAlign: 'left',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatBdbOutlineMarker(node.id, depth)}
        </span>
        <span style={{
          color: '#1e293b',
          fontSize: depth === 0 ? 14 : 13,
          fontWeight: depth <= 1 ? 700 : 500,
          lineHeight: 1.65,
          wordBreak: 'keep-all',
        }}>
          {node.translationKo}
          <EvidenceBadge support={node.evidenceSupport} />
        </span>
      </div>
      {node.children?.map((child) => (
        <DefinitionNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function MetadataCard({ label, children }) {
  if (children == null || children === '') return null;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '6.4em minmax(0, 1fr)',
      gap: 8,
      padding: '9px 0',
      borderTop: '1px solid #f1f5f9',
      alignItems: 'start',
    }}>
      <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>{label}</span>
      <span style={{ color: '#334155', fontSize: 12, lineHeight: 1.65, minWidth: 0 }}>{children}</span>
    </div>
  );
}

export default function LexiconTranslationDrawer({
  open,
  approvedEntry,
  enrichment = null,
  isMobile,
  popupRect,
  onClose,
  zIndex = 2502,
}) {
  const viewportWidth = popupRect?.viewportWidth || 1200;
  const popupLeft = popupRect?.left || 0;
  const popupWidth = popupRect?.width || 380;
  const popupMargin = popupRect?.margin || 12;
  const sideCapacity = Math.max(
    popupLeft - popupMargin - 8,
    viewportWidth - (popupLeft + popupWidth) - popupMargin - 8,
  );
  const stacked = isMobile || viewportWidth < 900 || sideCapacity < 300;

  const geometry = useMemo(() => {
    const {
      left = 0,
      top = 0,
      width = 380,
      maxHeight = 600,
      viewportWidth: currentViewportWidth = 1200,
      margin = 12,
    } = popupRect || {};

    if (stacked) return { left, top, width, height: maxHeight, opensLeft: false };

    const rightSpace = Math.max(0, currentViewportWidth - (left + width) - margin - 8);
    const leftSpace = Math.max(0, left - margin - 8);
    const opensLeft = leftSpace > rightSpace;
    const available = Math.max(opensLeft ? leftSpace : rightSpace, 300);
    const drawerWidth = Math.min(440, available);
    const drawerLeft = opensLeft
      ? Math.max(margin, left - drawerWidth - 8)
      : Math.min(currentViewportWidth - drawerWidth - margin, left + width + 8);

    return { left: drawerLeft, top, width: drawerWidth, height: maxHeight, opensLeft };
  }, [popupRect, stacked]);

  const definitionTree = useMemo(
    () => buildApprovedDefinitionTree(approvedEntry?.approvedSenseTree),
    [approvedEntry],
  );
  const evidenceCounts = useMemo(() => {
    const counts = { direct: 0, combined: 0, 'legacy-only': 0 };
    for (const sense of approvedEntry?.approvedSenseTree || []) {
      if (Object.hasOwn(counts, sense.evidenceSupport)) counts[sense.evidenceSupport] += 1;
    }
    return counts;
  }, [approvedEntry]);

  if (!approvedEntry) return null;

  const identity = approvedEntry.identity || {};
  const strong = identity.canonicalStrong || enrichment?.strong || '';
  const senseCount = approvedEntry.approvedSenseTree?.length || 0;
  const hiddenTransform = stacked ? 'translateX(100%)' : `translateX(${geometry.opensLeft ? 24 : -24}px)`;
  const sourceRefs = (identity.sourceRefs || [])
    .map((ref) => `${ref.sourceId}${ref.locator ? ` · ${ref.locator}` : ''}`)
    .join('\n');

  return (
    <>
      {isMobile && (
        <button
          type="button"
          aria-label="한글 사전 닫기"
          onClick={onClose}
          tabIndex={open ? 0 : -1}
          style={{
            position: 'fixed', inset: 0, zIndex: zIndex - 1, border: 'none', padding: 0,
            background: open ? 'rgba(15,23,42,.18)' : 'transparent',
            opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden',
            pointerEvents: open ? 'auto' : 'none',
            transition: 'opacity .18s ease, visibility 0s linear .18s',
          }}
        />
      )}
      <aside
        id={`lexicon-translation-drawer-${strong}`}
        role="dialog"
        aria-modal={stacked ? 'true' : 'false'}
        aria-hidden={!open}
        aria-label={`${strong} 승인 한글 사전`}
        data-lexicon-translation-drawer={strong}
        data-approved-registry-strong={strong}
        style={{
          position: 'fixed', left: geometry.left, top: geometry.top, width: geometry.width,
          height: geometry.height, maxHeight: geometry.height, zIndex,
          display: 'flex', flexDirection: 'column', background: '#fffdf5',
          border: '1px solid #fcd34d', borderRadius: stacked ? '16px 16px 0 0' : 12,
          boxShadow: stacked ? '0 -10px 36px rgba(15,23,42,.28)' : '0 16px 48px rgba(15,23,42,.24)',
          overflow: 'hidden', fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
          transform: open ? 'translateX(0)' : hiddenTransform,
          opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden',
          pointerEvents: open ? 'auto' : 'none',
          transition: open
            ? 'transform .24s ease, opacity .18s ease'
            : 'transform .24s ease, opacity .18s ease, visibility 0s linear .24s',
          willChange: 'transform, opacity',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '11px 12px',
          background: '#fef3c7', borderBottom: '1px solid #fde68a',
        }}>
          {stacked && (
            <button type="button" onClick={onClose} aria-label="원어 사전으로 돌아가기" style={{
              width: 44, height: 44, border: 'none', borderRadius: 10,
              background: 'rgba(255,255,255,.72)', color: '#92400e', fontSize: 19,
              cursor: 'pointer', flexShrink: 0,
            }}>‹</button>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <strong style={{ color: '#92400e', fontSize: 14 }}>BDB 한글 사전 · 승인본</strong>
              <span style={{
                padding: '2px 6px', borderRadius: 99, background: '#f0fdf4', color: '#166534',
                border: '1px solid #bbf7d0', fontSize: 9, fontWeight: 800,
              }}>✓ 사람 검토 완료</span>
            </div>
            <div style={{ marginTop: 2, color: '#64748b', fontSize: 10 }}>
              {strong} · {identity.lemma} · {identity.transliteration?.korean || identity.transliteration?.scientific}
            </div>
          </div>
          {!stacked && (
            <button type="button" onClick={onClose} aria-label="한글 사전 패널 닫기" title="한글 사전 닫기 (Esc)" style={{
              width: 44, height: 44, border: 'none', borderRadius: 9,
              background: 'rgba(255,255,255,.72)', color: '#92400e', fontSize: 18,
              cursor: 'pointer', flexShrink: 0,
            }}>✕</button>
          )}
        </div>

        <div data-modal-scroll-region="true" style={{
          flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 14px 18px',
          WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', touchAction: 'pan-y',
        }}>
          <div style={{
            padding: '10px 12px', marginBottom: 14, borderRadius: 10,
            background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
            fontSize: 11, lineHeight: 1.65,
          }}>
            한국어 정의 본문은 Approval Registry의 사람 승인 데이터를 사용합니다.
            {enrichment ? ' 어원·TWOT 등은 BDB 원사전 보조정보로 구분해 함께 제공합니다.' : ''}
          </div>

          <div style={{ marginBottom: 15 }} data-testid="approved-lexicon-drawer-sense-tree">
            {definitionTree.map((node) => <DefinitionNode key={node.id} node={node} />)}
          </div>

          <MetadataCard label="사전형">{identity.lemma}</MetadataCard>
          <MetadataCard label="학술 음역">{identity.transliteration?.scientific}</MetadataCard>
          <MetadataCard label="한글 음역">{identity.transliteration?.korean}</MetadataCard>
          <MetadataCard label="품사">
            {identity.partOfSpeech?.labelKo}
            {identity.partOfSpeech?.code ? ` · ${identity.partOfSpeech.code}` : ''}
          </MetadataCard>
          {enrichment?.originKo && <MetadataCard label="어원 · BDB">{enrichment.originKo}</MetadataCard>}
          {enrichment?.twot?.entry && (
            <MetadataCard label={enrichment.twot.sourceLabel || 'TWOT 항목'}>
              <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{enrichment.twot.entry}</span>
            </MetadataCard>
          )}
          <MetadataCard label="근거 구성">
            직접 {evidenceCounts.direct} · 결합 {evidenceCounts.combined} · 기존승인 보존 {evidenceCounts['legacy-only']}
          </MetadataCard>
          <MetadataCard label="원문 출처">
            <span style={{ whiteSpace: 'pre-line' }}>{sourceRefs}</span>
          </MetadataCard>

          <details style={{ marginTop: 8, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
            <summary style={{ cursor: 'pointer', color: '#64748b', fontSize: 11, fontWeight: 800 }}>
              검증·승인 정보
            </summary>
            <div style={{ marginTop: 6 }}>
              <MetadataCard label="승인자">{approvedEntry.reviewer?.reviewerId || approvedEntry.reviewer?.reviewerType}</MetadataCard>
              <MetadataCard label="승인 시각">{approvedEntry.approvedAt}</MetadataCard>
              <MetadataCard label="Evidence FP">
                <span style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}>{approvedEntry.evidencePacketFingerprint}</span>
              </MetadataCard>
              {enrichment?.sourceVersion && <MetadataCard label="BDB 보조버전">{enrichment.sourceVersion}</MetadataCard>}
            </div>
          </details>
        </div>

        <div style={{
          padding: '7px 12px', borderTop: '1px solid #fde68a', background: '#fffbeb',
          color: '#a16207', fontSize: 9, lineHeight: 1.5,
        }}>
          Approval Registry · 승인 의미 {senseCount}개 · 읽기 전용
          {enrichment?.source ? ` · 원사전 보조정보 ${enrichment.source}` : ''}
        </div>
      </aside>
    </>
  );
}
