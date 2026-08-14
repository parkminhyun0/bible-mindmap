import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  biblehubStrongUrl,
  strongNumberForExternalLink,
} from '../src/utils/strongLink.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function check(label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const numberCases = [
  ['H0776', '776'],
  ['G0025', '25'],
  ['H1', '1'],
  ['H776', '776'],
  ['G2817', '2817'],
  ['H1254a', '1254a'],
  ['h0430', '430'],
  ['H0', ''],
  ['H000', ''],
  ['H', ''],
  ['', ''],
  [null, ''],
  [undefined, ''],
];

for (const [input, expected] of numberCases) {
  check(`strongNumberForExternalLink(${JSON.stringify(input)})`, strongNumberForExternalLink(input), expected);
}

check('Hebrew URL', biblehubStrongUrl('H0776', true), 'https://biblehub.com/hebrew/776.htm');
check('Greek URL', biblehubStrongUrl('G0025', false), 'https://biblehub.com/greek/25.htm');
check('invalid URL', biblehubStrongUrl('H', true), '');

const sourceFiles = [
  'src/utils/lexicon.js',
  'src/components/WordSearchModal.jsx',
];

for (const relativePath of sourceFiles) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  if (/replace\(\s*\/\^\[GH\]\//.test(source)) {
    failures.push(`${relativePath}: zero-padding-unsafe Strong prefix replacement remains`);
  }

  const biblehubLines = source.split('\n').filter((line) => line.includes('biblehub.com'));
  for (const line of biblehubLines) {
    const isTwot = line.includes('biblehub.com/twot/');
    const usesNormalizedNumber = relativePath === 'src/utils/lexicon.js'
      && /biblehub\.com\/(?:hebrew|greek)\/\$\{num\}\.htm/.test(line);
    if (!isTwot && !usesNormalizedNumber) {
      failures.push(`${relativePath}: BibleHub URL does not use the strongLink helper result: ${line.trim()}`);
    }
  }
}

if (failures.length) {
  console.error('Strong external-link policy verification FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Strong external-link policy verification passed (${numberCases.length + 3} behavior cases; static contract OK).`);
