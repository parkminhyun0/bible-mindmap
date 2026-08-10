const STRONG_INPUT = /^([HGhg])0*([0-9]+)([A-Za-z]?)$/;
const LANGUAGE_SET = new Set(['hebrew', 'aramaic', 'greek']);
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const DEFAULT_BASE = `${import.meta.env?.BASE_URL || '/'}lexicon/ko/`;

export function normalizeLexiconStrong(value) {
  const match = String(value ?? '').trim().match(STRONG_INPUT);
  if (!match || Number(match[2]) < 1) return null;
  return `${match[1].toUpperCase()}${Number(match[2])}${match[3].toLowerCase()}`;
}

function joinUrl(baseUrl, relativePath) {
  return `${String(baseUrl).replace(/\/+$/, '')}/${String(relativePath).replace(/^\/+/, '')}`;
}

function contract(condition, message) {
  if (!condition) throw new Error(`lexicon approval loader contract: ${message}`);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function verifyManifest(manifest, expectedLanguage = null) {
  contract(manifest?.schemaVersion === 1, 'manifest schemaVersion must be 1');
  contract(Array.isArray(manifest.entries), 'manifest entries must be an array');
  contract(manifest.count === manifest.entries.length, 'manifest count mismatch');
  contract(SHA256.test(manifest.manifestFingerprint || ''), 'manifest fingerprint format invalid');
  const seen = new Set();
  for (const item of manifest.entries) {
    const strong = normalizeLexiconStrong(item?.strong);
    contract(strong === item?.strong, `manifest Strong is not normalized: ${item?.strong}`);
    contract(!seen.has(strong), `duplicate manifest Strong: ${strong}`);
    seen.add(strong);
    contract(LANGUAGE_SET.has(item?.language), `invalid manifest language: ${item?.language}`);
    if (expectedLanguage) contract(item.language === expectedLanguage, `language manifest leaked ${item.language}`);
    contract(/^shards\/[A-Za-z0-9._/-]+\.json$/.test(item?.shardPath || ''), `invalid shard path: ${item?.shardPath}`);
    contract(SHA256.test(item?.entryFingerprint || ''), `entry fingerprint format invalid: ${strong}`);
  }
  return manifest;
}

function verifyShard(shard) {
  contract(shard?.schemaVersion === 1, 'shard schemaVersion must be 1');
  contract(Array.isArray(shard.entries), 'shard entries must be an array');
  contract(shard.count === shard.entries.length, 'shard count mismatch');
  contract(SHA256.test(shard.shardFingerprint || ''), 'shard fingerprint format invalid');
  return shard;
}

export function createLexiconApprovalLoader({ baseUrl = DEFAULT_BASE, fetchImpl = globalThis.fetch } = {}) {
  contract(typeof fetchImpl === 'function', 'fetch implementation is required');
  let registryPromise = null;
  const manifestPromises = new Map();
  const shardPromises = new Map();

  async function fetchJson(relativePath) {
    const response = await fetchImpl(joinUrl(baseUrl, relativePath), { method: 'GET', credentials: 'same-origin' });
    contract(response?.ok === true, `GET ${relativePath} failed (${response?.status ?? 'unknown'})`);
    return response.json();
  }

  function loadRegistry() {
    if (!registryPromise) registryPromise = fetchJson('registry.json').then((data) => verifyManifest(data));
    return registryPromise;
  }

  function loadLanguageManifest(language) {
    contract(LANGUAGE_SET.has(language), `unsupported language: ${language}`);
    if (!manifestPromises.has(language)) {
      manifestPromises.set(language, fetchJson(`manifests/${language}.json`).then((data) => verifyManifest(data, language)));
    }
    return manifestPromises.get(language);
  }

  function loadShard(shardPath) {
    if (!shardPromises.has(shardPath)) {
      shardPromises.set(shardPath, fetchJson(shardPath).then(verifyShard));
    }
    return shardPromises.get(shardPath);
  }

  async function loadApprovedEntry(strongValue) {
    const strong = normalizeLexiconStrong(strongValue);
    if (!strong) return null;

    const registry = await loadRegistry();
    const registryEntry = registry.entries.find((item) => item.strong === strong);
    if (!registryEntry) return null;

    const manifest = await loadLanguageManifest(registryEntry.language);
    const manifestEntry = manifest.entries.find((item) => item.strong === strong);
    contract(Boolean(manifestEntry), `approved ${strong} missing from ${registryEntry.language} manifest`);
    contract(manifestEntry.language === registryEntry.language, `${strong} language mismatch`);
    contract(manifestEntry.shardPath === registryEntry.shardPath, `${strong} shard routing mismatch`);
    contract(manifestEntry.entryFingerprint === registryEntry.entryFingerprint, `${strong} entry fingerprint mismatch`);

    const shard = await loadShard(manifestEntry.shardPath);
    const approvedEntry = shard.entries.find((item) => normalizeLexiconStrong(item?.identity?.canonicalStrong) === strong);
    contract(Boolean(approvedEntry), `approved ${strong} missing from shard`);
    contract(approvedEntry.identity.canonicalStrong === strong, `${strong} shard identity is not canonical`);
    contract(approvedEntry.identity.language === manifestEntry.language, `${strong} shard language mismatch`);

    return deepFreeze(structuredClone(approvedEntry));
  }

  return Object.freeze({ loadApprovedEntry });
}

export const lexiconApprovalLoader = createLexiconApprovalLoader();
