import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPassageAnchor, createResearchAnnotation } from '../domain/researchModel';
import { getWorkspaceId } from '../storage/storageCore';
import {
  listResearchAnnotations,
  RESEARCH_ANNOTATIONS_CHANGED,
  removeResearchAnnotation,
  saveResearchAnnotation,
} from '../storage/researchRepository';
import ResearchAnnotationsContext from './researchAnnotationsStore';

const DEFAULT_PROJECT_ID = 'personal-bible-research';

function overlaps(annotation, passage) {
  const anchor = annotation?.anchor;
  if (!anchor || !passage) return false;
  if (anchor.bookId !== passage.bookId || Number(anchor.chapter) !== Number(passage.chapter)) {
    return false;
  }
  return Number(anchor.verseStart) <= Number(passage.verseEnd)
    && Number(anchor.verseEnd) >= Number(passage.verseStart);
}

export function ResearchAnnotationsProvider({ children }) {
  const [annotations, setAnnotations] = useState([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const items = await listResearchAnnotations();
    setAnnotations(items);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(RESEARCH_ANNOTATIONS_CHANGED, refresh);
    return () => window.removeEventListener(RESEARCH_ANNOTATIONS_CHANGED, refresh);
  }, [refresh]);

  const createAnnotation = useCallback(async ({
    type,
    passage,
    content,
    color,
    selectedText,
    translationId,
  }) => {
    const annotation = createResearchAnnotation({
      workspaceId: getWorkspaceId(),
      projectId: DEFAULT_PROJECT_ID,
      type,
      anchor: createPassageAnchor({
        ...passage,
        selectedText: selectedText || '',
        translationId: translationId || null,
      }),
      content: content || '',
      color: color || null,
    });
    const saved = await saveResearchAnnotation(annotation);
    setAnnotations((current) => [...current.filter((item) => item.id !== saved.id), saved]);
    return saved;
  }, []);

  const updateAnnotation = useCallback(async (annotation) => {
    const saved = await saveResearchAnnotation(annotation);
    setAnnotations((current) => current.map((item) => item.id === saved.id ? saved : item));
    return saved;
  }, []);

  const deleteAnnotation = useCallback(async (annotationId) => {
    await removeResearchAnnotation(annotationId);
    setAnnotations((current) => current.filter((item) => item.id !== annotationId));
  }, []);

  const value = useMemo(() => ({
    annotations,
    ready,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    annotationsForPassage: (passage) => annotations.filter((item) => overlaps(item, passage)),
  }), [annotations, ready, createAnnotation, updateAnnotation, deleteAnnotation]);

  return (
    <ResearchAnnotationsContext.Provider value={value}>
      {children}
    </ResearchAnnotationsContext.Provider>
  );
}
