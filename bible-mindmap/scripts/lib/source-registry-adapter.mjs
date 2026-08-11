// Legacy Genesis G2 compatibility projection for Source Registry policy v1.2.
//
// IMPORTANT: this is NOT policy equivalence. v1.2 is the authority for license/policy
// decisions; this module only projects the subset required by the historical Genesis G2
// pipeline into its older flat shape. Missing v1.2 capabilities fail closed.
//
// In particular:
//   - licenseUrl is provenance, NEVER authorization for download.
//   - parse is not inferred from unrelated permission booleans.
//   - download/parse exist only as explicit, source-specific legacy capabilities below.
//   - any non-approved or non-auto-processable v1.2 source projects zero allowedUses.

export const LICENSE_STATUS_MAP = Object.freeze({
  approved: 'verified-public-or-permitted',
  'internal-review-only': 'internal-validation-only',
  'metadata-only': 'metadata-only',
  unknown: 'unknown',
  prohibited: 'prohibited',
});

// v1.2 role 문자열이 서술적으로 확장됐지만 legacy G2 검증기는 특정 상수만 매칭한다.
// 필수 매핑만 등록하고 나머지는 그대로 통과.
export const ROLE_MAP = Object.freeze({
  'primary-full-definition-source': 'primary-source',
  'internal-validation-placeholder': 'internal-validation',
});

// v1.2에는 legacy `download` / `parse` permission 필드가 없다. 따라서 일반 추론은
// 금지하고, historical G2가 실제로 고정해서 사용하는 출처만 명시적으로 호환한다.
// 이 목록은 v1.2 권한을 확장하지 않으며 status=approved + autoProcessingAllowed=true
// 조건을 함께 통과해야만 적용된다.
export const LEGACY_G2_EXPLICIT_CAPABILITIES = Object.freeze({
  'openscriptures-hebrewlexicon-bdb': Object.freeze(['download', 'parse']),
});

function isApprovedForAutomaticUse(source = {}) {
  return source.license?.status === 'approved'
    && source.workflow?.autoProcessingAllowed === true;
}

export function deriveLegacyAllowedUses(source = {}) {
  const license = source.license ?? {};
  if (!isApprovedForAutomaticUse(source)) return [];

  const uses = new Set(LEGACY_G2_EXPLICIT_CAPABILITIES[source.sourceId] ?? []);
  if (license.externalLlmInputAllowed === true) uses.add('ai-input');
  if (license.derivativeAllowed === true) uses.add('derived-translation');
  if (license.redistributionAllowed === true) uses.add('redistribute');
  if (license.fullTextStorageAllowed === true) uses.add('full-text-storage');
  return [...uses];
}

// GitHub URL에서 owner/repo 슬러그 추출. materialize 스크립트가
// raw.githubusercontent.com URL 조립 시 owner/repo 형태를 요구한다.
function extractGitHubSlug(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+\/[^/#?]+?)(?:\.git)?\/?(?:[#?].*)?$/i);
  return match ? match[1] : null;
}

export function normalizeSource(source = {}) {
  const license = source.license;
  const provenance = source.provenance ?? {};
  // v1.2 라이선스 객체가 있으면 보수적인 legacy compatibility projection을 적용한다.
  // license 객체가 없으면 이미 flat legacy fixture로 간주하고 값은 그대로 유지한다.
  if (license && typeof license === 'object') {
    return {
      id: source.sourceId ?? source.id,
      role: ROLE_MAP[source.role] ?? source.role,
      licenseStatus: LICENSE_STATUS_MAP[license.status] ?? license.status,
      allowedUses: deriveLegacyAllowedUses(source),
      files: provenance.datasetPaths ?? [],
      repository: extractGitHubSlug(provenance.repositoryUrl) ?? provenance.repositoryUrl ?? null,
      versionRef: provenance.version ?? null,
      attribution: license.attributionText ?? null,
    };
  }
  return {
    id: source.sourceId ?? source.id,
    role: ROLE_MAP[source.role] ?? source.role,
    licenseStatus: source.licenseStatus,
    allowedUses: Array.isArray(source.allowedUses) ? source.allowedUses : [],
    files: Array.isArray(source.files) ? source.files : (provenance.datasetPaths ?? []),
    repository: source.repository ?? extractGitHubSlug(provenance.repositoryUrl) ?? null,
    versionRef: source.versionRef ?? provenance.version ?? null,
    attribution: source.attribution ?? null,
  };
}

export function normalizeRegistry(registry) {
  if (!registry || !Array.isArray(registry.sources)) return registry;
  return {
    ...registry,
    sources: registry.sources.map(normalizeSource),
  };
}
