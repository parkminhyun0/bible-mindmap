// v1.2 라이선스 registry 스키마를 초기 검증기가 기대하는 flat 스키마로 매핑.
// v1.2에서는 sourceId/license.status/provenance.datasetPaths 로 재편됐고 allowedUses
// 배열이 세분화된 boolean 플래그(externalLlmInputAllowed/derivativeAllowed 등)로
// 대체됐다. 두 형태 모두 지원해 build-genesis-g2-calibration-batch 및
// verify-genesis-g2-calibration-batch 가 registry 실제 데이터·픽스처 어느 쪽이 와도
// 동일한 downstream 로직으로 처리하도록 정규화한다.

export const LICENSE_STATUS_MAP = Object.freeze({
  approved: 'verified-public-or-permitted',
  'internal-review-only': 'internal-validation-only',
  'metadata-only': 'metadata-only',
  unknown: 'unknown',
  prohibited: 'prohibited',
});

// v1.2 role 문자열이 서술적으로 확장됐지만 검증기는 특정 상수만 매칭한다.
// 필수 매핑만 등록하고 나머지는 그대로 통과.
export const ROLE_MAP = Object.freeze({
  'primary-full-definition-source': 'primary-source',
  'internal-validation-placeholder': 'internal-validation',
});

function deriveAllowedUses(license = {}) {
  const uses = [];
  if (license.licenseUrl) uses.push('download');
  if (license.externalLlmInputAllowed || license.derivativeAllowed) uses.push('parse');
  if (license.externalLlmInputAllowed) uses.push('ai-input');
  if (license.derivativeAllowed) uses.push('derived-translation');
  if (license.redistributionAllowed) uses.push('redistribute');
  if (license.fullTextStorageAllowed) uses.push('full-text-storage');
  return uses;
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
  // v1.2 라이선스 객체가 있으면 boolean 플래그에서 파생, 없으면 이미 정규화된 픽스처 취급.
  if (license && typeof license === 'object') {
    return {
      id: source.sourceId ?? source.id,
      role: ROLE_MAP[source.role] ?? source.role,
      licenseStatus: LICENSE_STATUS_MAP[license.status] ?? license.status,
      allowedUses: deriveAllowedUses(license),
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
