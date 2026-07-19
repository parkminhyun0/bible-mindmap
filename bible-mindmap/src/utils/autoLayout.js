import dagre from '@dagrejs/dagre';

const NODE_W = 320;
const NODE_H = 160;

export function applyDagreLayout(nodes, edges, direction = 'LR') {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 100, nodesep: 60, marginx: 40, marginy: 40 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return pos
      ? { ...node, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } }
      : node;
  });
}

export function applyRadialLayout(nodes, edges) {
  if (nodes.length === 0) return nodes;

  // Build adjacency
  const inDegree = {};
  const children = {};
  nodes.forEach((n) => { inDegree[n.id] = 0; children[n.id] = []; });
  edges.forEach((e) => {
    if (inDegree[e.target] !== undefined) inDegree[e.target]++;
    if (children[e.source]) children[e.source].push(e.target);
  });

  const roots = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
  if (roots.length === 0) roots.push(nodes[0].id);

  const positioned = {};
  const visited = new Set();
  const BASE_RADIUS = 300;

  // Place roots evenly on a horizontal line
  roots.forEach((rootId, i) => {
    const cx = i * (BASE_RADIUS * 2 + 200);
    positioned[rootId] = { x: cx, y: 0, angle: -Math.PI / 2 };
    visited.add(rootId);
  });

  // BFS
  const queue = [...roots];
  const level = {};
  roots.forEach((id) => { level[id] = 0; });

  while (queue.length > 0) {
    const nodeId = queue.shift();
    const pos = positioned[nodeId];
    const nodeLevel = level[nodeId] ?? 0;
    const radius = BASE_RADIUS * (nodeLevel + 1);
    const childs = (children[nodeId] || []).filter((c) => !visited.has(c));
    const n = childs.length;

    childs.forEach((childId, i) => {
      visited.add(childId);
      level[childId] = nodeLevel + 1;

      let angle;
      if (n === 1) {
        angle = pos.angle ?? 0;
      } else {
        const spread = Math.min(Math.PI * 1.5, (Math.PI * 2) / Math.max(n, 1));
        const baseAngle = (pos.angle ?? 0) - (spread * (n - 1)) / 2;
        angle = baseAngle + spread * i;
      }

      positioned[childId] = {
        x: pos.x + radius * Math.cos(angle),
        y: pos.y + radius * Math.sin(angle),
        angle,
      };
      queue.push(childId);
    });
  }

  // Isolated nodes (not visited by BFS)
  let isolated = 0;
  nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      positioned[n.id] = { x: -500, y: isolated * 200, angle: 0 };
      isolated++;
    }
  });

  return nodes.map((node) => {
    const p = positioned[node.id] || { x: 0, y: 0 };
    return { ...node, position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 } };
  });
}
