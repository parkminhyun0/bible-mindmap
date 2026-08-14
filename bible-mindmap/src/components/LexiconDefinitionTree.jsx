import { linkifyDefinition } from '../utils/lexicon';

const MARKERS = ['Ⅰ', 'A', '1', 'a'];

function markerFor(index, depth) {
  if (depth === 0) return String(index + 1);
  return `${MARKERS[Math.min(depth - 1, MARKERS.length - 1)]}${index + 1}`;
}

function TreeNode({ node, index, depth, isHebrew, approved }) {
  return (
    <li data-depth={depth} style={{ display: 'grid', gridTemplateColumns: '2.4em minmax(0, 1fr)', gap: 6, marginTop: depth ? 6 : 0, paddingLeft: depth * 14 }}>
      <span aria-hidden="true" style={{ color: depth === 0 ? '#92400e' : '#64748b', fontFamily: 'monospace', fontSize: depth === 0 ? 12 : 11, fontWeight: 700, lineHeight: 1.65 }}>
        {markerFor(index, depth)}
      </span>
      <div style={{ color: '#1e293b', fontSize: depth === 0 ? 14 : 13, fontWeight: depth <= 1 ? 700 : 500, lineHeight: 1.65, wordBreak: approved ? 'keep-all' : 'normal' }}>
        {approved ? node.text : <span dangerouslySetInnerHTML={{ __html: linkifyDefinition(node.text, isHebrew) }} />}
        {!!node.children?.length && <Tree nodes={node.children} depth={depth + 1} isHebrew={isHebrew} approved={approved} />}
      </div>
    </li>
  );
}

function Tree({ nodes, depth = 0, isHebrew, approved }) {
  return (
    <ol data-lexicon-definition-tree={depth === 0 ? 'true' : undefined} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {nodes.map((node, index) => <TreeNode key={node.id} node={node} index={index} depth={depth} isHebrew={isHebrew} approved={approved} />)}
    </ol>
  );
}

export default function LexiconDefinitionTree({ nodes = [], isHebrew = false, approved = false }) {
  return <Tree nodes={nodes} isHebrew={isHebrew} approved={approved} />;
}
