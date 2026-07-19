import { useCallback, useRef, useState } from 'react';

const MAX = 50;

export default function useHistory(nodes, edges, setNodes, setEdges) {
  const past = useRef([]);
  const future = useRef([]);
  const skipRecord = useRef(false);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  const syncState = () => {
    setHistoryState({
      canUndo: past.current.length > 0,
      canRedo: future.current.length > 0,
    });
  };

  const snapshot = () => JSON.stringify({ nodes, edges });

  const record = useCallback(() => {
    if (skipRecord.current) {
      skipRecord.current = false;
      return;
    }
    past.current.push(snapshot());
    if (past.current.length > MAX) past.current.shift();
    future.current = [];
    syncState();
  }, [nodes, edges]);

  const restore = (json) => {
    const { nodes: n, edges: e } = JSON.parse(json);
    skipRecord.current = true;
    setNodes(n);
    setEdges(e);
  };

  const undo = useCallback(() => {
    if (!past.current.length) return;
    future.current.push(snapshot());
    restore(past.current.pop());
    syncState();
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (!future.current.length) return;
    past.current.push(snapshot());
    restore(future.current.pop());
    syncState();
  }, [nodes, edges, setNodes, setEdges]);

  return {
    record,
    undo,
    redo,
    canUndo: historyState.canUndo,
    canRedo: historyState.canRedo,
  };
}
