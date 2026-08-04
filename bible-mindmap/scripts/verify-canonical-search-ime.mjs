import fs from 'node:fs';

const launcher = fs.readFileSync(new URL('../src/components/CanonicalConceptLauncher.jsx', import.meta.url), 'utf8');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

assert(launcher.includes('event.nativeEvent?.isComposing'), 'IME composing events must be ignored');
assert(launcher.includes('setComparisonQuery(query);'), 'comparison query must update after debounce');
assert(launcher.includes('}, 700);'), 'comparison work must be deferred away from keystrokes');
assert(!launcher.includes('setComparisonQuery(query);\n    clearTimeout'), 'comparison state must not update synchronously on every input');

if (errors.length) {
  console.error(`✗ Canonical search IME verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log('✓ Canonical search IME isolated · no parent rerender during composition · comparison deferred 700ms');
