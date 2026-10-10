import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const files = ['app.js', 'scripts/build.mjs', 'scripts/dev.mjs'];
for (const file of files) {
  const check = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
  if (check.status !== 0) throw new Error(check.stderr);
}
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const css = await readFile(resolve(root, 'style.css'), 'utf8');
const assets = new Set([
  ...[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => m[1]),
  ...[...css.matchAll(/url\(['"]([^'"]+)['"]\)/g)].map(m => m[1])
].filter(file => !file.includes(':')));
for (const asset of assets) await access(resolve(root, asset));
for (const license of ['fonts/Bodoni-OFL.txt', 'fonts/Fragment-OFL.txt']) await access(resolve(root, license));
const manifest = JSON.parse(await readFile(resolve(root, '.openai/hosting.json'), 'utf8'));
if (manifest.static?.directory !== 'dist') throw new Error('Hosting must serve the built dist directory.');
if ((html.match(/class="world(?: current)?"/g) || []).length !== 5) throw new Error('The atlas must have five worlds.');
console.log(`Syntax valid. ${assets.size} local assets found. Five worlds ready. Hosting configured.`);
