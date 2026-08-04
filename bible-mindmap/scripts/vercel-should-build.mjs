import { execFileSync } from 'node:child_process';

const ALWAYS_BUILD_PATHS = [
  'api/',
  'src/data/canonicalConcepts.js',
  'package.json',
  'package-lock.json',
  'vercel.json',
  'scripts/vercel-should-build.mjs',
];

function readChangedFiles() {
  try {
    const output = execFileSync('git', ['diff', '--name-only', 'HEAD^', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return output.split('\n').map((value) => value.trim()).filter(Boolean);
  } catch (error) {
    console.log('Vercel build allowed: commit comparison unavailable.');
    process.exit(1);
  }
}

const changedFiles = readChangedFiles();
const relevant = changedFiles.filter((file) => ALWAYS_BUILD_PATHS.some((path) => (
  path.endsWith('/') ? file.startsWith(path) : file === path
)));

if (relevant.length > 0) {
  console.log('Vercel build allowed for server-relevant changes:');
  relevant.forEach((file) => console.log(`- ${file}`));
  process.exit(1);
}

console.log('Vercel build skipped: GitHub Pages is the primary UI deployment.');
console.log('Changed files were not part of the Vercel server boundary.');
process.exit(0);
