import sharp from 'sharp';
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Pass the generated image directory.');
const assets = [
  ['monitor', 'exec-b1472d5e-c491-44c0-ae64-791b6cd938a7.png', 192],
  ['keyboard', 'exec-1d728c67-24df-4542-820a-29f0ead61e35.png', 160],
  ['mouse', 'exec-4757c32f-20ad-45ad-870b-f7b4f8cd81ba.png', 36],
  ['mug', 'exec-da133191-86e9-4e56-b793-d2c250e7b246.png', 40],
  ['ghost-sprites', 'exec-0d31ec12-cbb6-40cb-b13c-74884cef9be2.png', 192],
];
await mkdir('public/assets', { recursive: true });
await mkdir('art-source', { recursive: true });
for (const [name, filename, width] of assets) {
  const file = path.join(source, filename);
  await copyFile(file, `art-source/${name}.png`);
  const { data, info } = await sharp(file).resize({ width, kernel: 'nearest' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const palette = [12, 35, 58, 84, 112, 145, 183, 219, 246];
  let transparent = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(.2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2]);
    const quantized = palette.reduce((best, value) => Math.abs(value - gray) < Math.abs(best - gray) ? value : best);
    data[i] = data[i + 1] = data[i + 2] = quantized;
    data[i + 3] = data[i + 3] < 128 ? 0 : 255;
    if (!data[i + 3]) transparent++;
  }
  if (!transparent) throw new Error(`${name} has no real transparency; inspect before using.`);
  await sharp(data, { raw: info }).png().toFile(`public/assets/${name}.png`);
  console.log(`${name}: ${info.width}x${info.height}, ${transparent} transparent pixels`);
}
import './asset-workspace.mjs';
