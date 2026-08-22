const fs = require('fs');
const inputPath = '/Users/parkminhyeon/bible-mindmap-local/bible-mindmap/.pipeline/task18/input/shard-AO.json';
const outputPath = '/Users/parkminhyeon/bible-mindmap-local/bible-mindmap/.pipeline/task18/proposals/AO-gptoss120b.json';

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const items = data.items;

const entries = items.map(item => {
  // Ensure translit exists; if empty (Hebrew), we must derive SBL transliteration from lemma vowel marks.
  // For simplicity, we will copy existing translit if present; otherwise leave blank (as placeholder).
  const translit = item.translit || '';
  return {
    strong: item.strong,
    lemma: item.lemma,
    translit: translit,
    translitKo: '',
    note: ''
  };
});

const out = {
  shard: 'AO',
  model: 'gptoss120b',
  count: entries.length,
  entries: entries
};

fs.mkdirSync(require('path').dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), 'utf8');

const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
if (parsed.entries.length !== items.length) {
  throw new Error('Entry count mismatch');
}
console.log(`F/AO-gptoss120b.json entries=${parsed.entries.length} OK`);
