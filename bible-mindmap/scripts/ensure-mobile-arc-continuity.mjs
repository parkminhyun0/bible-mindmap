import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, '../src/components/ContextBibleModal.jsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

const oldBlock = `            const visible = from || to;
            if (!visible) return null;
            const hiddenDefinition = pivotDefinitions[from ? arc.to : arc.from];
            if (!hiddenDefinition) return null;
            return {
              ...arc,
              y1: visible.y,
              y2: hiddenDefinition.ch < activeRef.ch ? 8 : height - 8,
              external: true,
              externalDirection: hiddenDefinition.ch < activeRef.ch ? 'previous' : 'next',
            };`;

const newBlock = `            const visible = from || to;
            if (visible) {
              const hiddenDefinition = pivotDefinitions[from ? arc.to : arc.from];
              if (!hiddenDefinition) return null;
              return {
                ...arc,
                y1: visible.y,
                y2: hiddenDefinition.ch < activeRef.ch ? 8 : height - 8,
                external: true,
                externalDirection: hiddenDefinition.ch < activeRef.ch ? 'previous' : 'next',
              };
            }

            // 현재 장에 endpoint가 없어도 두 Pivot 사이를 통과하는 Arc는 숨기지 않는다.
            // 새 45권처럼 거시 Pivot이 성긴 책에서도 중간 장이 전체 구조 연결 안에 있음을 보여준다.
            const fromDefinition = pivotDefinitions[arc.from];
            const toDefinition = pivotDefinitions[arc.to];
            if (!fromDefinition || !toDefinition) return null;
            const minChapter = Math.min(fromDefinition.ch, toDefinition.ch);
            const maxChapter = Math.max(fromDefinition.ch, toDefinition.ch);
            if (activeRef.ch <= minChapter || activeRef.ch >= maxChapter) return null;
            return {
              ...arc,
              y1: 8,
              y2: height - 8,
              external: true,
              through: true,
              externalDirection: 'through',
            };`;

if (source.includes(oldBlock)) {
  source = source.replace(oldBlock, newBlock);
  changed = true;
} else if (!source.includes('through: true')) {
  throw new Error('[mobile-arc-continuity] measurement anchor not found');
}

const oldArrow = `{arc.external && (
                                <path
                                  d={arc.externalDirection === 'previous'
                                    ? \`M 45 \${arc.y2 + 5} L 49 \${arc.y2} L 53 \${arc.y2 + 5}\`
                                    : \`M 45 \${arc.y2 - 5} L 49 \${arc.y2} L 53 \${arc.y2 - 5}\`}`;

const newArrow = `{arc.external && !arc.through && (
                                <path
                                  d={arc.externalDirection === 'previous'
                                    ? \`M 45 \${arc.y2 + 5} L 49 \${arc.y2} L 53 \${arc.y2 + 5}\`
                                    : \`M 45 \${arc.y2 - 5} L 49 \${arc.y2} L 53 \${arc.y2 - 5}\`}`;

if (source.includes(oldArrow)) {
  source = source.replace(oldArrow, newArrow);
  changed = true;
} else if (!source.includes('arc.external && !arc.through')) {
  throw new Error('[mobile-arc-continuity] external arrow anchor not found');
}

if (changed) {
  fs.writeFileSync(target, source);
  console.log('✓ mobile Arc rail now shows connections that pass through the active chapter');
} else {
  console.log('✓ mobile Arc continuity already enabled');
}
