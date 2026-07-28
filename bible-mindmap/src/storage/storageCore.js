export const STORAGE_SCHEMA_VERSION = 2;
export const STORAGE_DB_NAME = 'bible-mindmap-workspace';
export const STORAGE_DB_VERSION = 1;
export const DEFAULT_WORKSPACE_ID = 'local-personal-workspace';

const RECORD_STORE = 'records';
const REVISION_STORE = 'revisions';
const META_STORE = 'meta';
const LEGACY_CURRENT_KEY = 'bible-mindmap-v1';
const LEGACY_TREE_KEY = 'bible-mindmap-saves';
const WORKSPACE_ID_KEY = 'bible-mindmap-workspace-id';
const MAX_REVISIONS_PER_RECORD = 30;

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getWorkspaceId() {
  let id = localStorage.getItem(WORKSPACE_ID_KEY);
  if (!id) {
    id = createId(DEFAULT_WORKSPACE_ID);
    localStorage.setItem(WORKSPACE_ID_KEY, id);
  }
  return id;
}

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE_DB_NAME, STORAGE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECORD_STORE)) {
        db.createObjectStore(RECORD_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(REVISION_STORE)) {
        const store = db.createObjectStore(REVISION_STORE, { keyPath: 'id' });
        store.createIndex('recordId', 'recordId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function checksum(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

async function getRecord(db, id) {
  if (!db) return null;
  const tx = db.transaction(RECORD_STORE, 'readonly');
  return requestResult(tx.objectStore(RECORD_STORE).get(id));
}

async function trimRevisions(db, recordId) {
  const readTx = db.transaction(REVISION_STORE, 'readonly');
  const index = readTx.objectStore(REVISION_STORE).index('recordId');
  const revisions = await requestResult(index.getAll(recordId));
  const obsolete = revisions
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(MAX_REVISIONS_PER_RECORD);
  if (obsolete.length === 0) return;
  const writeTx = db.transaction(REVISION_STORE, 'readwrite');
  obsolete.forEach((revision) => writeTx.objectStore(REVISION_STORE).delete(revision.id));
}

export async function persistWorkspaceRecord(kind, data, options = {}) {
  const db = await openDatabase();
  if (!db) return { persisted: false, reason: 'indexeddb-unavailable' };

  const workspaceId = getWorkspaceId();
  const recordId = `${workspaceId}:${kind}`;
  const previous = await getRecord(db, recordId);
  const nextChecksum = checksum(data);
  if (previous?.checksum === nextChecksum) {
    return { persisted: true, changed: false, record: previous };
  }

  const now = new Date().toISOString();
  const record = {
    id: recordId,
    workspaceId,
    kind,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    data,
    checksum: nextChecksum,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    source: options.source || 'app',
  };

  const tx = db.transaction([RECORD_STORE, REVISION_STORE], 'readwrite');
  tx.objectStore(RECORD_STORE).put(record);
  tx.objectStore(REVISION_STORE).put({
    id: createId('revision'),
    recordId,
    workspaceId,
    kind,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    data,
    checksum: nextChecksum,
    createdAt: now,
    reason: options.reason || 'autosave',
  });
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  await trimRevisions(db, recordId);
  return { persisted: true, changed: true, record };
}

export const persistCurrentCanvas = (data, options) =>
  persistWorkspaceRecord('current-canvas', data, options);

export const persistRepositoryTree = (tree, options) =>
  persistWorkspaceRecord('repository-tree', tree, options);

export async function loadWorkspaceRecord(kind) {
  const db = await openDatabase();
  if (!db) return null;
  return getRecord(db, `${getWorkspaceId()}:${kind}`);
}

export async function listRecordRevisions(kind) {
  const db = await openDatabase();
  if (!db) return [];
  const recordId = `${getWorkspaceId()}:${kind}`;
  const tx = db.transaction(REVISION_STORE, 'readonly');
  const revisions = await requestResult(
    tx.objectStore(REVISION_STORE).index('recordId').getAll(recordId),
  );
  return revisions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function migrateLegacyStorage() {
  const db = await openDatabase();
  if (!db) return { migrated: false, reason: 'indexeddb-unavailable' };
  const workspaceId = getWorkspaceId();
  const metaId = `${workspaceId}:legacy-migration-v2`;
  const metaTx = db.transaction(META_STORE, 'readonly');
  const completed = await requestResult(metaTx.objectStore(META_STORE).get(metaId));
  if (completed) return { migrated: false, alreadyCompleted: true };

  const migratedKinds = [];
  for (const [kind, key] of [
    ['current-canvas', LEGACY_CURRENT_KEY],
    ['repository-tree', LEGACY_TREE_KEY],
  ]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      await persistWorkspaceRecord(kind, JSON.parse(raw), {
        source: 'legacy-localstorage',
        reason: 'legacy-migration',
      });
      migratedKinds.push(kind);
    } catch {
      // 손상된 레거시 값은 삭제하지 않고 그대로 둔다.
    }
  }

  const writeTx = db.transaction(META_STORE, 'readwrite');
  writeTx.objectStore(META_STORE).put({
    id: metaId,
    workspaceId,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    migratedKinds,
    completedAt: new Date().toISOString(),
    legacyDataPreserved: true,
  });
  return { migrated: migratedKinds.length > 0, migratedKinds };
}

export async function buildWorkspaceBackup() {
  const db = await openDatabase();
  const workspaceId = getWorkspaceId();
  const records = db
    ? await requestResult(db.transaction(RECORD_STORE, 'readonly').objectStore(RECORD_STORE).getAll())
    : [];
  const revisions = db
    ? await requestResult(db.transaction(REVISION_STORE, 'readonly').objectStore(REVISION_STORE).getAll())
    : [];
  return {
    format: 'bible-mindmap-workspace',
    schemaVersion: STORAGE_SCHEMA_VERSION,
    workspaceId,
    exportedAt: new Date().toISOString(),
    records: records.filter((record) => record.workspaceId === workspaceId),
    revisions: revisions.filter((revision) => revision.workspaceId === workspaceId),
    legacy: {
      currentCanvas: localStorage.getItem(LEGACY_CURRENT_KEY),
      repositoryTree: localStorage.getItem(LEGACY_TREE_KEY),
    },
  };
}

export function validateWorkspaceBackup(backup) {
  return Boolean(
    backup &&
    backup.format === 'bible-mindmap-workspace' &&
    Number.isInteger(backup.schemaVersion) &&
    Array.isArray(backup.records),
  );
}

export async function restoreWorkspaceBackup(backup) {
  if (!validateWorkspaceBackup(backup)) throw new Error('올바른 개인 작업공간 백업이 아닙니다.');
  if (backup.schemaVersion > STORAGE_SCHEMA_VERSION) {
    throw new Error('현재 앱보다 새로운 형식의 백업입니다. 앱을 먼저 업데이트해주세요.');
  }

  const restored = [];
  for (const record of backup.records) {
    if (!record?.kind || record.data == null) continue;
    await persistWorkspaceRecord(record.kind, record.data, {
      source: 'workspace-backup',
      reason: 'workspace-restore',
    });
    restored.push(record.kind);
  }

  const currentRecord = backup.records.find((record) => record.kind === 'current-canvas');
  const treeRecord = backup.records.find((record) => record.kind === 'repository-tree');
  if (currentRecord?.data) {
    localStorage.setItem(LEGACY_CURRENT_KEY, JSON.stringify(currentRecord.data));
  } else if (backup.legacy?.currentCanvas) {
    localStorage.setItem(LEGACY_CURRENT_KEY, backup.legacy.currentCanvas);
  }
  if (treeRecord?.data) {
    localStorage.setItem(LEGACY_TREE_KEY, JSON.stringify(treeRecord.data));
  } else if (backup.legacy?.repositoryTree) {
    localStorage.setItem(LEGACY_TREE_KEY, backup.legacy.repositoryTree);
  }
  if (
    typeof window !== 'undefined'
    && backup.records.some((record) => record.kind === 'research-annotations')
  ) {
    window.dispatchEvent(new CustomEvent('bible-mindmap:research-annotations-changed'));
  }

  return { restoredKinds: [...new Set(restored)], legacyCompatibilityUpdated: true };
}
