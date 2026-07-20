// 저장소 트리 공용 유틸 — SavePanel과 DocPanel이 함께 사용

export const STORAGE_KEY = 'bible-mindmap-saves';

export const DOC_ROOT_ID   = 'doc-root';
export const DOC_ROOT_NAME = '✍️ 설교 문서 작성';

export function defaultTree() {
  return { id: 'root', name: '내 저장소', type: 'folder', children: [], open: true };
}

export function ensureDocRoot(tree) {
  if (!tree.children) tree.children = [];
  if (!tree.children.some((c) => c.id === DOC_ROOT_ID)) {
    tree.children.unshift({
      id: DOC_ROOT_ID,
      type: 'folder',
      name: DOC_ROOT_NAME,
      open: true,
      children: [],
    });
  }
}

export function loadTree() {
  let tree;
  try { tree = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultTree(); }
  catch { tree = defaultTree(); }
  ensureDocRoot(tree);
  return tree;
}

export function saveTree(tree) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
}

export function findNode(tree, id) {
  if (tree.id === id) return tree;
  if (!tree.children) return null;
  for (const child of tree.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

export function findParent(tree, targetId) {
  if (!tree.children) return null;
  for (const child of tree.children) {
    if (child.id === targetId) return tree;
    const found = findParent(child, targetId);
    if (found) return found;
  }
  return null;
}

export function generateFileId() {
  return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function generateDocId() {
  return 'doc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
