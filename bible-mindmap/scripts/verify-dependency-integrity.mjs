import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'package.json');
const LOCK_PATH = path.join(ROOT, 'package-lock.json');
const SOURCE_ROOT = path.join(ROOT, 'src');
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);
const BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

// Tiptap exposes its core as a required peer/transitive package of the declared
// React and StarterKit runtimes. Keep this exception narrow and verifiable.
const RUNTIME_TRANSITIVE_ALLOWLIST = new Map([
  ['@tiptap/core', ['@tiptap/react', '@tiptap/starter-kit']],
]);

const errors = [];
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const manifest = readJson(MANIFEST_PATH);
const lock = readJson(LOCK_PATH);
const lockRoot = lock.packages?.[''];

if (!lockRoot) {
  errors.push('package-lock.json is missing packages[""] root metadata');
}

const dependencyGroups = ['dependencies', 'devDependencies', 'optionalDependencies'];
for (const group of dependencyGroups) {
  const declared = manifest[group] ?? {};
  const locked = lockRoot?.[group] ?? {};

  for (const [name, range] of Object.entries(declared)) {
    if (locked[name] !== range) {
      errors.push(`${group}: ${name} is ${range} in package.json but ${locked[name] ?? 'missing'} in package-lock root`);
    }
    if (!lock.packages?.[`node_modules/${name}`]) {
      errors.push(`${group}: ${name} has no node_modules/${name} entry in package-lock.json`);
    }
  }

  for (const [name, range] of Object.entries(locked)) {
    if (declared[name] !== range) {
      errors.push(`${group}: package-lock root contains undeclared ${name}@${range}`);
    }
  }
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

function packageNameFromSpecifier(specifier) {
  if (!specifier || specifier.startsWith('.') || specifier.startsWith('/') || specifier.includes('://')) return null;
  if (BUILTINS.has(specifier)) return null;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

const runtimeDependencies = manifest.dependencies ?? {};
const importPattern = /(?:import\s+(?:[^'";]*?\s+from\s+)?|export\s+[^'";]*?\s+from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
const runtimeImports = new Map();

for (const filePath of walkFiles(SOURCE_ROOT)) {
  const source = fs.readFileSync(filePath, 'utf8');
  for (const match of source.matchAll(importPattern)) {
    const packageName = packageNameFromSpecifier(match[1]);
    if (!packageName) continue;
    const relativePath = path.relative(ROOT, filePath);
    if (!runtimeImports.has(packageName)) runtimeImports.set(packageName, new Set());
    runtimeImports.get(packageName).add(relativePath);
  }
}

for (const [packageName, files] of runtimeImports) {
  if (runtimeDependencies[packageName]) continue;

  const providers = RUNTIME_TRANSITIVE_ALLOWLIST.get(packageName);
  const providerReady = providers?.every((provider) => runtimeDependencies[provider]);
  const lockedPackage = lock.packages?.[`node_modules/${packageName}`];
  if (providerReady && lockedPackage) continue;

  errors.push(`runtime import ${packageName} is not declared in dependencies (used by ${[...files].slice(0, 3).join(', ')})`);
}

if (errors.length) {
  console.error(`✗ Dependency integrity verification failed (${errors.length})`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

const directCount = dependencyGroups.reduce(
  (sum, group) => sum + Object.keys(manifest[group] ?? {}).length,
  0,
);
const allowedTransitiveCount = [...runtimeImports.keys()].filter((name) => RUNTIME_TRANSITIVE_ALLOWLIST.has(name)).length;
console.log(`✓ Dependency integrity verified · direct ${directCount} · runtime imports ${runtimeImports.size} · allowed transitive ${allowedTransitiveCount} · manifest/lock aligned`);
