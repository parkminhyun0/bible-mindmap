import h1254aCandidate from '../../data/lexicon/handoff/genesis-h1254a-full-fidelity/candidate.json';
import h1254aPresentation from '../../data/lexicon/handoff/genesis-h1254a-full-fidelity/presentation.ko.json';

const PRESENTATIONS = new Map([
  ['H1254a', { candidate: h1254aCandidate, presentation: h1254aPresentation }],
]);

function normalizeStrong(value) {
  const match = String(value ?? '').trim().match(/^([HGhg])0*([0-9]+)([A-Za-z]?)$/);
  if (!match || Number(match[2]) < 1) return null;
  return `${match[1].toUpperCase()}${Number(match[2])}${match[3].toLowerCase()}`;
}

function textByApprovedId(entry) {
  return new Map((entry?.approvedSenseTree || []).map((node) => [node.id, node.translationKo]));
}

function candidateBaselineMatches(candidate, approvedEntry) {
  if (!candidate || !approvedEntry) return false;
  if (normalizeStrong(candidate.sourceStrong) !== normalizeStrong(approvedEntry.identity?.canonicalStrong)) return false;
  if (candidate.approvedBaseline?.approvedEvidenceFingerprint !== approvedEntry.evidencePacketFingerprint) return false;
  const approved = textByApprovedId(approvedEntry);
  if ((candidate.nodes || []).length !== approved.size) return false;
  return candidate.nodes.every((node) => approved.get(node.sourceNodeId) === node.textKo);
}

export function getLexiconFullFidelityPresentation(strong, approvedEntry) {
  const normalized = normalizeStrong(strong);
  const bundle = PRESENTATIONS.get(normalized);
  if (!bundle || !candidateBaselineMatches(bundle.candidate, approvedEntry)) return null;

  const { candidate, presentation } = bundle;
  if (presentation.candidateFingerprint !== candidate.candidateFingerprint) return null;
  if (presentation.approvedEvidenceFingerprint !== approvedEntry.evidencePacketFingerprint) return null;

  const accountsById = new Map((candidate.sourceAccount || []).map((item) => [item.accountId, item]));
  const sections = (presentation.sections || []).map((section) => ({
    ...section,
    accounts: section.accountIds.map((accountId) => {
      const source = accountsById.get(accountId);
      const display = presentation.accounts?.[accountId];
      if (!source || !display?.textKo) return null;
      return { ...source, ...display };
    }).filter(Boolean),
  }));

  const expectedAccounts = new Set((candidate.sourceAccount || []).map((item) => item.accountId));
  const displayedAccounts = new Set(sections.flatMap((section) => section.accounts.map((item) => item.accountId)));
  if (expectedAccounts.size !== displayedAccounts.size) return null;
  for (const id of expectedAccounts) if (!displayedAccounts.has(id)) return null;

  return Object.freeze({
    strong: normalized,
    candidateFingerprint: candidate.candidateFingerprint,
    sourceLocator: presentation.sourceLocator,
    rightsBasis: candidate.rightsBasis,
    usageQualifier: candidate.usageQualifier || [],
    genesisRefs: candidate.genesisRefs || [],
    morphologyForms: candidate.morphologyForms || [],
    sections,
  });
}
