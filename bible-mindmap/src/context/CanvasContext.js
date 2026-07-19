import { createContext, useContext } from 'react';

export const CanvasContext = createContext(null);

export function useCanvas() {
  return useContext(CanvasContext);
}
