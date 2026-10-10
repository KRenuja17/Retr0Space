import { mkdir, copyFile, cp } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
await mkdir(dist, { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'favicon.svg']) {
  await copyFile(resolve(root, file), resolve(dist, file));
}
for (const dir of ['img', 'fonts']) {
  await cp(resolve(root, dir), resolve(dist, dir), { recursive: true });
}
console.log('OTHERWHERE built in dist/');
