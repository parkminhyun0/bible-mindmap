import { linkifyDefinition } from '../utils/lexicon';

const DEPTH_STYLES = [
  { kind: 'alphaUpper', wrap: (marker) => `${marker}.` },
  { kind: 'decimal', wrap: (marker) => `${marker}.` },
  { kind: 'alphaLower', wrap: (marker) => `${marker}.` },
  { kind: 'decimal', wrap: (marker) => `(${marker})` },
  { kind: 'alphaLower', wrap: (marker) => `(${marker})` },
];

function alphaLabel(index, upper) {
  const base = upper ? 65 : 97;
  if (index < 26) return String.fromCharCode(base + index);
  return `[${index + 1}]`;
}

export function formatDepthMarker(index, depth) {
  const style = DEPTH_STYLES[Math.min(depth, DEPTH_STYLES.length - 1)];
  const body = style.kind === 'decimal'
    ? String(index + 1)
    : style.kind === 'alphaUpper'
      ? alphaLabel(index, true)
      : alphaLabel(index, false);
  return style.wrap(body);
}

function markerStyle(depth) {
  if (depth === 0) return { background: '#eaf0f8', color: '#1b3b68', borderColor: '#d3dfed' };
  if (depth === 1) return { background: '#f5f7fa', color: '#4c5a6d', borderColor: '#dce2ea' };
  if (depth === 2) return { background: '#eaf8f1', color: '#0f8b57', borderColor: '#cbe9da' };
  if (depth === 3) return { background: '#fff8e8', color: '#8a6517', borderColor: '#f0dfb7' };
  return { background: '#f5f1fb', color: '#6b4ea0', borderColor: '#e3d8f2' };
}

function TreeNode({ node, index, depth, isHebrew, approved, flat }) {
  const marker = formatDepthMarker(index, depth);
  return (
    <li
      data-depth={depth}
      style={{
        display: 'grid',
        gridTemplateColumns: flat ? 'minmax(0, 1fr)' : depth === 0 ? '34px minmax(0,1fr)' : depth === 1 ? '30px minmax(0,1fr)' : '28px minmax(0,1fr)',
        columnGap: flat ? 0 : 8,
        alignItems: 'start',
        marginTop: flat ? (index ? 10 : 0) : depth === 0 ? (index ? 18 : 0) : 10,
      }}
    >
      {!flat && (
        <span
          aria-hidden="true"
          data-marker={marker}
          style={{
            width: depth === 0 ? 28 : 25,
            minHeight: depth === 0 ? 28 : 25,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 7,
            border: '1px solid',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: depth === 0 ? 12 : 11,
            fontWeight: 800,
            lineHeight: 1,
            marginTop: 1,
            whiteSpace: 'nowrap',
            ...markerStyle(depth),
          }}
        >
          {marker}
        </span>
      )}
      <div
        style={{
          color: '#182235',
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: flat ? 14 : depth === 0 ? 16 : 14,
          fontWeight: flat ? 500 : depth === 0 ? 700 : depth === 1 ? 650 : 500,
          lineHeight: 1.65,
          wordBreak: approved ? 'keep-all' : 'normal',
          minWidth: 0,
        }}
      >
        {approved ? node.text : <span dangerouslySetInnerHTML={{ __html: linkifyDefinition(node.text, isHebrew) }} />}
        {!!node.children?.length && (
          <Tree nodes={node.children} depth={depth + 1} isHebrew={isHebrew} approved={approved} flat={flat} />
        )}
      </div>
    </li>
  );
}

function Tree({ nodes, depth = 0, isHebrew, approved, flat = false }) {
  return (
    <ol
      data-lexicon-definition-tree={depth === 0 ? 'true' : undefined}
      data-flat-definition={depth === 0 && flat ? 'true' : undefined}
      style={{ listStyle: 'none', margin: depth === 0 ? 0 : '10px 0 0', padding: 0 }}
    >
      {nodes.map((node, index) => (
        <TreeNode key={node.id ?? index} node={node} index={index} depth={depth} isHebrew={isHebrew} approved={approved} flat={flat} />
      ))}
    </ol>
  );
}

export default function LexiconDefinitionTree({ nodes = [], isHebrew = false, approved = false, flat = false }) {
  return <Tree nodes={nodes} isHebrew={isHebrew} approved={approved} flat={flat} />;
}
