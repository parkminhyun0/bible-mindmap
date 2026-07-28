import { loadWorkspaceRecord, persistWorkspaceRecord } from './storageCore';

const PROJECTS_KIND = 'research-projects';
const ANNOTATIONS_KIND = 'research-annotations';

async function loadCollection(kind) {
  const record = await loadWorkspaceRecord(kind);
  return Array.isArray(record?.data) ? record.data : [];
}

export const listResearchProjects = () => loadCollection(PROJECTS_KIND);
export const listResearchAnnotations = () => loadCollection(ANNOTATIONS_KIND);

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
  const annotations = await listResearchAnnotations();
  const index = annotations.findIndex((item) => item.id === annotation.id);
  const next = index >= 0
    ? annotations.map((item) =>
      item.id === annotation.id
        ? { ...annotation, updatedAt: new Date().toISOString() }
        : item)
    : [...annotations, annotation];
  await persistWorkspaceRecord(ANNOTATIONS_KIND, next, {
    reason: index >= 0 ? 'annotation-update' : 'annotation-create',
  });
  return annotation;
}

export async function removeResearchAnnotation(annotationId) {
  const annotations = await listResearchAnnotations();
  const next = annotations.filter((item) => item.id !== annotationId);
  await persistWorkspaceRecord(ANNOTATIONS_KIND, next, {
    reason: 'annotation-remove',
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
