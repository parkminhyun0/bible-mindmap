import { linkifyDefinition } from '../utils/lexicon';

// Depth-based marker formatter.
//   depth 0 → A. B. C. ... (upper-case Latin letters)
//   depth 1 → 1. 2. 3. ... (decimal)
//   depth 2 → a. b. c. ... (lower-case Latin letters)
//   depth 3 → (1) (2) (3) ...
//   depth 4 → (a) (b) (c) ...
// Beyond depth 4 the pattern rotates back onto the four bare styles wrapped in
// double parentheses so no marker family is ever concatenated with an index
// (e.g. never "A1" or "Ⅰ1"). Indices past 26 fall through to bracketed decimals
// so the marker column stays predictable regardless of source depth.
const DEPTH_STYLES = [
  { kind: 'alphaUpper', wrap: (m) => `${m}.` },
  { kind: 'decimal', wrap: (m) => `${m}.` },
  { kind: 'alphaLower', wrap: (m) => `${m}.` },
  { kind: 'decimal', wrap: (m) => `(${m})` },
  { kind: 'alphaLower', wrap: (m) => `(${m})` },
];

function alphaLabel(index, upper) {
  const base = upper ? 65 : 97; // 'A' or 'a'
  if (index < 26) return String.fromCharCode(base + index);
  // Fall through to bracketed decimals so overflow never collides with a real letter.
  return `[${index + 1}]`;
}

export function formatDepthMarker(index, depth) {
  const style = DEPTH_STYLES[Math.min(depth, DEPTH_STYLES.length - 1)];
  const body =
    style.kind === 'decimal' ? String(index + 1)
    : style.kind === 'alphaUpper' ? alphaLabel(index, true)
    : alphaLabel(index, false);
  return style.wrap(body);
}

function TreeNode({ node, index, depth, isHebrew, approved, flat }) {
  return (
    <li
      data-depth={depth}
      style={{
        display: 'grid',
        gridTemplateColumns: flat ? 'minmax(0, 1fr)' : '2.6em minmax(0, 1fr)',
        gap: flat ? 0 : 8,
        marginTop: depth ? 6 : flat ? 8 : 10,
      }}
    >
      {!flat && (
        <span
          aria-hidden="true"
          data-marker={formatDepthMarker(index, depth)}
          style={{
            color: depth === 0 ? '#92400e' : depth === 1 ? '#1d4ed8' : '#64748b',
            fontFamily: 'monospace',
            fontSize: depth === 0 ? 13 : 12,
            fontWeight: 700,
            lineHeight: 1.65,
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }}
        >
          {formatDepthMarker(index, depth)}
        </span>
      )}
      <div
        style={{
          color: '#1e293b',
          fontSize: depth === 0 ? 14 : 13,
          fontWeight: flat ? 500 : depth === 0 ? 700 : depth === 1 ? 600 : 500,
          lineHeight: 1.65,
          wordBreak: approved ? 'keep-all' : 'normal',
          minWidth: 0,
        }}
      >
        {approved
          ? node.text
          : <span dangerouslySetInnerHTML={{ __html: linkifyDefinition(node.text, isHebrew) }} />}
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
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
    >
      {nodes.map((node, index) => (
        <TreeNode
          key={node.id ?? index}
          node={node}
          index={index}
          depth={depth}
          isHebrew={isHebrew}
          approved={approved}
          flat={flat}
        />
      ))}
    </ol>
  );
}

export default function LexiconDefinitionTree({ nodes = [], isHebrew = false, approved = false, flat = false }) {
  return <Tree nodes={nodes} isHebrew={isHebrew} approved={approved} flat={flat} />;
}
