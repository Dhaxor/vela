import { Resvg } from '../../formline/node_modules/@resvg/resvg-js/index.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'store');
const output = path.join(source, 'submission-4.3-rebuild');
await mkdir(output, { recursive: true });

for (const name of ['01-future-memory', '02-proof', '03-adaptive']) {
  let svg = await readFile(path.join(source, `${name}.svg`), 'utf8');
  const imageName = svg.match(/href="([^"]+\.jpg)"/)?.[1];
  if (imageName) {
    const sourceImage = await readFile(path.join(source, imageName));
    svg = svg.replace(`href="${imageName}"`, `href="data:image/jpeg;base64,${sourceImage.toString('base64')}"`);
  }
  const png = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
  await writeFile(path.join(output, `${name}.png`), png);
}

console.log('Rendered 3 Vela App Store screenshots at 1290x2796.');
