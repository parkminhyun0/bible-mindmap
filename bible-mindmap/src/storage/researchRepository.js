import { loadWorkspaceRecord, persistWorkspaceRecord } from './storageCore';

const PROJECTS_KIND = 'research-projects';
const ANNOTATIONS_KIND = 'research-annotations';
export const RESEARCH_ANNOTATIONS_CHANGED = 'bible-mindmap:research-annotations-changed';
let annotationMutationQueue = Promise.resolve();

async function loadCollection(kind) {
  const record = await loadWorkspaceRecord(kind);
  return Array.isArray(record?.data) ? record.data : [];
}

export const listResearchProjects = () => loadCollection(PROJECTS_KIND);
export const listResearchAnnotations = () => loadCollection(ANNOTATIONS_KIND);

function notifyAnnotationChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RESEARCH_ANNOTATIONS_CHANGED));
  }
}

function queueAnnotationMutation(mutation) {
  const next = annotationMutationQueue.then(mutation, mutation);
  annotationMutationQueue = next.catch(() => {});
  return next;
}

export async function saveResearchProject(project) {
  const projects = await listResearchProjects();
  const index = projects.findIndex((item) => item.id === project.id);
  const next = index >= 0
    ? projects.map((item) => item.id === project.id ? { ...project, updatedAt: new Date().toISOString() } : item)
    : [...projects, project];
  await persistWorkspaceRecord(PROJECTS_KIND, next, {
    reason: index >= 0 ? 'project-update' : 'project-create',
  });
  return project;
}

export async function saveResearchAnnotation(annotation) {
  return queueAnnotationMutation(async () => {
    const annotations = await listResearchAnnotations();
    const index = annotations.findIndex((item) => item.id === annotation.id);
    const saved = index >= 0
      ? { ...annotation, updatedAt: new Date().toISOString() }
      : annotation;
    const next = index >= 0
      ? annotations.map((item) => item.id === annotation.id ? saved : item)
      : [...annotations, saved];
    await persistWorkspaceRecord(ANNOTATIONS_KIND, next, {
      reason: index >= 0 ? 'annotation-update' : 'annotation-create',
    });
    notifyAnnotationChange();
    return saved;
  });
}

export async function removeResearchAnnotation(annotationId) {
  return queueAnnotationMutation(async () => {
    const annotations = await listResearchAnnotations();
    const next = annotations.filter((item) => item.id !== annotationId);
    await persistWorkspaceRecord(ANNOTATIONS_KIND, next, {
      reason: 'annotation-remove',
    });
    notifyAnnotationChange();
  });
}

export async function findAnnotationsForPassage({ bookId, chapter, verseStart, verseEnd }) {
  const annotations = await listResearchAnnotations();
  return annotations.filter((annotation) => {
    const anchor = annotation.anchor;
    if (!anchor || anchor.bookId !== bookId || anchor.chapter !== chapter) return false;
    return anchor.verseStart <= verseEnd && anchor.verseEnd >= verseStart;
  });
}
