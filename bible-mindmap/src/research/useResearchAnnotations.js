import { useContext } from 'react';
import ResearchAnnotationsContext from './researchAnnotationsContext';

export default function useResearchAnnotations() {
  const value = useContext(ResearchAnnotationsContext);
  if (!value) throw new Error('ResearchAnnotationsProvider가 필요합니다.');
  return value;
}
