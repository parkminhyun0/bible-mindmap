import { useEffect, useMemo, useState } from 'react';
import { lexiconApprovalLoader } from '../data/lexiconApprovalLoader';
import { getLexiconTranslation } from '../data/lexiconTranslationPilot';
import { getLexiconFullFidelityPresentation } from '../data/lexiconFullFidelityPresentation';
import { formatBdbOutlineMarker } from './LexiconTranslationDrawer';

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
    <span title={legacy ? '현재 공개 sourceText에 직접 대응되지 않아 기존 사람 승인 의미를 보존한 항목' : '둘 이상의 근거 조각을 결합해 대응한 항목'} style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 999, background: legacy ? '#fff7ed' : '#f1f5f9', color: legacy ? '#9a3412' : '#64748b', fontSize: 8, fontWeight: 800, whiteSpace: 'nowrap' }}>
      {legacy ? '기존 승인 보존' : '결합 근거'}
    </span>
  );
}

function DefinitionNode({ node, depth = 0 }) {
  return (
    <div style={{ marginTop: depth === 0 ? 0 : 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2.4em minmax(0, 1fr)', gap: 6, paddingLeft: depth * 16, alignItems: 'start' }}>
        <span style={{ color: depth === 0 ? '#92400e' : '#64748b', fontFamily: 'monospace', fontSize: depth === 0 ? 12 : 11, fontWeight: 700, lineHeight: 1.65, textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>
          {formatBdbOutlineMarker(node.id, depth)}
        </span>
        <span style={{ color: '#1e293b', fontSize: depth === 0 ? 14 : 13, fontWeight: depth <= 1 ? 700 : 500, lineHeight: 1.65, wordBreak: 'keep-all' }}>
          {node.translationKo}<EvidenceBadge support={node.evidenceSupport} />
        </span>
      </div>
      {node.children?.map((child) => <DefinitionNode key={child.id} node={child} depth={depth + 1} />)}
    </div>
  );
}

function MetadataCard({ label, children }) {
  if (children == null || children === '') return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '6.4em minmax(0, 1fr)', gap: 8, padding: '9px 0', borderTop: '1px solid #f1f5f9', alignItems: 'start' }}>
      <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>{label}</span>
      <span style={{ color: '#334155', fontSize: 12, lineHeight: 1.65, minWidth: 0 }}>{children}</span>
    </div>
  );
}

const FORM_LABELS = {
  Perfect: '완료형', Imperfect: '미완료형', InfinitiveConstruct: '부정사 연계형', InfinitiveAbsolute: '부정사 절대형', Imperative: '명령형', Participle: '분사', Suffixed: '접미형',
};

function FullFidelityAccount({ account }) {
  const forms = account.sourceElements?.forms || [];
  return (
    <div style={{ padding: '9px 0 10px', borderTop: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', gap: 7, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <strong style={{ color: '#334155', fontSize: 12 }}>{account.labelKo}</strong>
        <span style={{ color: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }}>{account.bdbLocator}</span>
      </div>
      <div style={{ marginTop: 3, color: '#334155', fontSize: 12, lineHeight: 1.7, wordBreak: 'keep-all' }}>{account.textKo}</div>
      {account.capturedText && (
        <div style={{ marginTop: 3, color: '#94a3b8', fontSize: 10, lineHeight: 1.55 }}>BDB: {account.capturedText}</div>
      )}
      {forms.map((form) => (
        <div key={`${account.accountId}-${form.formClass}`} style={{ marginTop: 6, paddingLeft: 8, borderLeft: '2px solid #fde68a' }}>
          <div style={{ color: '#92400e', fontSize: 10, fontWeight: 800 }}>{FORM_LABELS[form.formClass] || form.formClass}</div>
          <div dir="rtl" style={{ color: '#1e293b', fontSize: 15, fontFamily: "'SBL Hebrew', 'Noto Sans Hebrew', serif", textAlign: 'left' }}>{(form.forms || []).join(' · ')}</div>
          {!!form.representativeRefs?.length && <div style={{ marginTop: 2, color: '#64748b', fontSize: 10 }}>{form.representativeRefs.join(' · ')}</div>}
        </div>
      ))}
      {!!account.representativeRefs?.length && (
        <div style={{ marginTop: 5, color: '#64748b', fontSize: 10, lineHeight: 1.55 }}>대표 본문 · {account.representativeRefs.join(' · ')}</div>
      )}
    </div>
  );
}

function FullFidelityBdbDetails({ presentation }) {
  if (!presentation) return null;
  return (
    <section data-testid="word-search-bdb-full-fidelity" style={{ margin: '14px 0', padding: '12px', borderRadius: 10, background: '#fff', border: '1px solid #fed7aa' }}>
      <div style={{ color: '#92400e', fontSize: 13, fontWeight: 900 }}>BDB 원사전 구조 · 한글 Full-Fidelity</div>
      <div style={{ marginTop: 3, color: '#64748b', fontSize: 10, lineHeight: 1.55 }}>
        BDB의 형태 목록·용법 제한·의미 경계·대표 본문을 생략하거나 한 문장으로 평탄화하지 않고 원 구조 순서대로 표시합니다.
      </div>
      {presentation.sections.map((section) => (
        <div key={section.id} style={{ marginTop: 13 }}>
          <div style={{ padding: '5px 8px', borderRadius: 7, background: '#fff7ed', color: '#9a3412', fontSize: 12, fontWeight: 900 }}>{section.labelKo}</div>
          {section.accounts.map((account) => <FullFidelityAccount key={account.accountId} account={account} />)}
        </div>
      ))}
      {!!presentation.usageQualifier?.length && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: '#92400e', fontSize: 11, fontWeight: 900 }}>BDB 용법 제한</div>
          {presentation.usageQualifier.map((item, index) => (
            <div key={index} style={{ marginTop: 4, color: '#334155', fontSize: 11, lineHeight: 1.65 }}>• {item.qualifier}</div>
          ))}
        </div>
      )}
    </section>
  );
}

const mobileWordSearchScrollCss = `
@media (max-width: 767px) {
  .at-modal--word-search div:has(> div > div > [data-word-search-korean-lexicon]) { height:auto!important; max-height:none!important; overflow:visible!important; }
  .at-modal--word-search div:has(> div > div > [data-word-search-korean-lexicon]) > div { max-height:none!important; overflow:visible!important; -webkit-overflow-scrolling:auto!important; }
  .at-modal--word-search div:has(> div > [data-word-search-korean-lexicon]) { height:auto!important; max-height:none!important; overflow:visible!important; }
  .at-modal--word-search div:has(> [data-word-search-korean-lexicon]) { display:flex!important; flex-direction:column!important; height:auto!important; min-height:0!important; overflow:visible!important; }
  .at-modal--word-search div:has(> [data-word-search-korean-lexicon]) > [data-word-search-korean-lexicon] { order:-1; }
  .at-modal--word-search div:has(> [data-word-search-korean-lexicon]) > section:first-child { max-height:none!important; overflow:visible!important; touch-action:pan-y!important; -webkit-overflow-scrolling:auto!important; }
  .at-modal--word-search div:has(> [data-word-search-korean-lexicon][data-mobile-korean-open="true"]) > section:first-child { display:none!important; }
  [data-word-search-korean-lexicon] { height:auto!important; min-height:0!important; overflow:visible!important; }
  [data-word-search-korean-lexicon] [data-modal-scroll-region="true"] { overflow:visible!important; max-height:none!important; overscroll-behavior:auto!important; touch-action:pan-y!important; -webkit-overflow-scrolling:auto!important; }
}
`;

function MobileLexiconToggle({ koreanOpen, setKoreanOpen, strong }) {
  const buttonStyle = (active) => ({ minHeight: 44, borderRadius: 10, border: `1px solid ${active ? '#b45309' : '#cbd5e1'}`, background: active ? '#fff7ed' : '#fff', color: active ? '#92400e' : '#64748b', fontSize: 13, fontWeight: 800, cursor: 'pointer' });
  return (
    <div data-word-search-mobile-lexicon-toggle={strong || ''} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '9px 10px', background: '#fff', borderBottom: '1px solid #fde68a', position: 'sticky', top: 0, zIndex: 3 }}>
      <button type="button" aria-pressed={!koreanOpen} onClick={() => setKoreanOpen(false)} style={buttonStyle(!koreanOpen)}>영문 원사전</button>
      <button type="button" aria-pressed={koreanOpen} onClick={() => setKoreanOpen(true)} style={{ ...buttonStyle(koreanOpen), background: koreanOpen ? '#b45309' : '#fff', color: koreanOpen ? '#fff' : '#92400e' }}>한글 번역</button>
    </div>
  );
}

export default function ApprovedKoreanLexiconPane({ strong }) {
  const [approvedEntry, setApprovedEntry] = useState(null);
  const [loading, setLoading] = useState(Boolean(strong));
  const [failed, setFailed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [mobileKoreanOpen, setMobileKoreanOpen] = useState(false);

  useEffect(() => { const onResize = () => setIsMobile(window.innerWidth < 768); window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize); }, []);
  useEffect(() => { setMobileKoreanOpen(false); }, [strong]);
  useEffect(() => {
    let cancelled = false;
    setApprovedEntry(null); setFailed(false);
    if (!strong) { setLoading(false); return () => { cancelled = true; }; }
    setLoading(true);
    lexiconApprovalLoader.loadApprovedEntry(strong).then((entry) => { if (!cancelled) { setApprovedEntry(entry); setLoading(false); } }).catch(() => { if (!cancelled) { setFailed(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [strong]);

  const enrichment = useMemo(() => getLexiconTranslation(strong), [strong]);
  const definitionTree = useMemo(() => buildApprovedDefinitionTree(approvedEntry?.approvedSenseTree), [approvedEntry]);
  const fullFidelity = useMemo(() => getLexiconFullFidelityPresentation(strong, approvedEntry), [strong, approvedEntry]);
  const evidenceCounts = useMemo(() => {
    const counts = { direct: 0, combined: 0, 'legacy-only': 0 };
    for (const sense of approvedEntry?.approvedSenseTree || []) if (Object.hasOwn(counts, sense.evidenceSupport)) counts[sense.evidenceSupport] += 1;
    return counts;
  }, [approvedEntry]);

  const identity = approvedEntry?.identity || {};
  const canonicalStrong = identity.canonicalStrong || enrichment?.strong || strong || '';
  const senseCount = approvedEntry?.approvedSenseTree?.length || 0;
  const sourceRefs = (identity.sourceRefs || []).map((ref) => `${ref.sourceId}${ref.locator ? ` · ${ref.locator}` : ''}`).join('\n');
  const isHumanApproved = approvedEntry?.reviewer?.reviewerType === 'human';
  const approvalBadge = isHumanApproved ? '✓ 사람 검토 완료' : '✓ Evidence 검증 승인';
  const approvalDescription = isHumanApproved ? '사람 검토 승인' : 'Evidence AND-Gate 자동 승인';
  const showKoreanBody = !isMobile || mobileKoreanOpen;

  return (
    <section aria-label={`${strong || ''} 한글 승인 사전`} data-word-search-korean-lexicon={strong || ''} data-mobile-korean-open={isMobile && mobileKoreanOpen ? 'true' : 'false'} style={{ minWidth: 0, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box', background: '#fffdf5', fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif" }}>
      <style>{mobileWordSearchScrollCss}</style>
      {isMobile && <MobileLexiconToggle koreanOpen={mobileKoreanOpen} setKoreanOpen={setMobileKoreanOpen} strong={strong} />}
      {showKoreanBody && loading && <div data-modal-scroll-region="true" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, color: '#94a3b8', fontSize: 12 }}>한글 사전 조회 중…</div>}
      {showKoreanBody && !loading && !approvedEntry && <div data-modal-scroll-region="true" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14 }}><div style={{ padding: '12px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, lineHeight: 1.65 }}>{failed ? '승인 한글 사전을 불러오지 못했습니다. 영어 원사전은 그대로 사용할 수 있습니다.' : '아직 승인된 한글 사전 항목이 없습니다. 승인된 Strong만 이 영역에 표시됩니다.'}</div></div>}
      {showKoreanBody && approvedEntry && <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 12px', background: '#fef3c7', borderBottom: '1px solid #fde68a', flexShrink: 0 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}><strong style={{ color: '#92400e', fontSize: 14 }}>BDB 한글 사전 · 승인본</strong><span style={{ padding: '2px 6px', borderRadius: 99, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontSize: 9, fontWeight: 800 }}>{approvalBadge}</span>{fullFidelity && <span style={{ padding: '2px 6px', borderRadius: 99, background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', fontSize: 9, fontWeight: 800 }}>BDB 구조 완전 표시</span>}</div>
            <div style={{ marginTop: 2, color: '#64748b', fontSize: 10 }}>{canonicalStrong} · {identity.lemma} · {identity.transliteration?.korean || identity.transliteration?.scientific}</div>
          </div>
        </div>
        <div className="momentum-scroll" data-modal-scroll-region="true" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 14px 18px', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
          <div style={{ padding: '10px 12px', marginBottom: 14, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 11, lineHeight: 1.65 }}>한국어 정의 본문은 Approval Registry의 {approvalDescription} 데이터를 사용합니다.{fullFidelity ? ' BDB Full-Fidelity 세부 구조는 승인 baseline과 byte 정합이 확인된 presentation artifact에서 읽습니다.' : ''}</div>
          <div style={{ marginBottom: 15 }} data-testid="word-search-approved-korean-sense-tree">{definitionTree.map((node) => <DefinitionNode key={node.id} node={node} />)}</div>
          <FullFidelityBdbDetails presentation={fullFidelity} />
          <MetadataCard label="사전형">{identity.lemma}</MetadataCard>
          <MetadataCard label="학술 음역">{identity.transliteration?.scientific}</MetadataCard>
          <MetadataCard label="한글 음역">{identity.transliteration?.korean}</MetadataCard>
          <MetadataCard label="품사">{identity.partOfSpeech?.labelKo}{identity.partOfSpeech?.code ? ` · ${identity.partOfSpeech.code}` : ''}</MetadataCard>
          {enrichment?.originKo && <MetadataCard label="어원 · BDB">{enrichment.originKo}</MetadataCard>}
          {enrichment?.twot?.entry && <MetadataCard label={enrichment.twot.sourceLabel || 'TWOT 항목'}><span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{enrichment.twot.entry}</span></MetadataCard>}
          <MetadataCard label="근거 구성">직접 {evidenceCounts.direct} · 결합 {evidenceCounts.combined} · 기존승인 보존 {evidenceCounts['legacy-only']}</MetadataCard>
          <MetadataCard label="원문 출처"><span style={{ whiteSpace: 'pre-line' }}>{sourceRefs}</span></MetadataCard>
          {fullFidelity?.rightsBasis && <MetadataCard label="권리·라이선스">{fullFidelity.rightsBasis.originalWorkRights} · {fullFidelity.rightsBasis.digitalDataset} · {fullFidelity.rightsBasis.license} · {fullFidelity.rightsBasis.attribution}</MetadataCard>}
          <details style={{ marginTop: 8, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}><summary style={{ cursor: 'pointer', color: '#64748b', fontSize: 11, fontWeight: 800 }}>검증·승인 정보</summary><div style={{ marginTop: 6 }}><MetadataCard label="승인 방식">{approvalDescription}</MetadataCard><MetadataCard label="승인자">{approvedEntry.reviewer?.reviewerId || approvedEntry.reviewer?.reviewerType}</MetadataCard><MetadataCard label="승인 시각">{approvedEntry.approvedAt}</MetadataCard><MetadataCard label="Evidence FP"><span style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}>{approvedEntry.evidencePacketFingerprint}</span></MetadataCard>{fullFidelity?.candidateFingerprint && <MetadataCard label="FF Candidate FP"><span style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}>{fullFidelity.candidateFingerprint}</span></MetadataCard>}</div></details>
        </div>
        <div style={{ padding: '7px 12px', borderTop: '1px solid #fde68a', background: '#fffbeb', color: '#a16207', fontSize: 9, lineHeight: 1.5, flexShrink: 0 }}>Approval Registry · 승인 의미 {senseCount}개 · 읽기 전용{fullFidelity ? ' · BDB Full-Fidelity 구조 연결' : ''}</div>
      </>}
    </section>
  );
}
