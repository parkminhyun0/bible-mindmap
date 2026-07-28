export const RESEARCH_SCHEMA_VERSION = 1;

export const ANNOTATION_TYPES = Object.freeze([
  'highlight',
  'underline',
  'note',
  'question',
  'original-language',
  'syntax',
  'cross-reference',
  'person',
  'place',
  'period',
  'sermon',
]);

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPassageAnchor({
  bookId,
  chapter,
  verseStart,
  verseEnd = verseStart,
  tokenStart = null,
  tokenEnd = null,
  selectedText = '',
}) {
  if (!bookId || !chapter || !verseStart) throw new Error('본문 위치가 필요합니다.');
  return {
    bookId,
    chapter,
    verseStart,
    verseEnd,
    tokenStart,
    tokenEnd,
    selectedText,
  };
}

export function createResearchAnnotation({
  workspaceId,
  projectId,
  type,
  anchor,
  content = '',
  color = null,
  tags = [],
  links = [],
}) {
  if (!ANNOTATION_TYPES.includes(type)) throw new Error(`지원되지 않는 연구 유형: ${type}`);
  const now = new Date().toISOString();
  return {
    id: createId('annotation'),
    schemaVersion: RESEARCH_SCHEMA_VERSION,
    workspaceId,
    projectId,
    type,
    anchor,
    content,
    color,
    tags: [...new Set(tags)],
    links,
    createdAt: now,
    updatedAt: now,
  };
}

export function createResearchProject({ workspaceId, title, description = '' }) {
  const now = new Date().toISOString();
  return {
    id: createId('project'),
    schemaVersion: RESEARCH_SCHEMA_VERSION,
    workspaceId,
    title: title || '새 성경 연구',
    description,
    canvasIds: [],
    documentIds: [],
    annotationIds: [],
    createdAt: now,
    updatedAt: now,
  };
}
