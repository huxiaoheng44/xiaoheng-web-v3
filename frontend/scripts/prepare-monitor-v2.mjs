import sharp from 'sharp';
import { copyFile } from 'node:fs/promises';

const source = process.argv[2];
if (!source) throw new Error('Pass the ImageGen monitor v2 PNG path');
await copyFile(source, 'art-source/monitor-v2.png');
const trimmed = await sharp(source).trim({ threshold: 20 }).toBuffer({ resolveWithObject: true });
console.log('Trimmed bounds', trimmed.info);
const { data, info } = await sharp(trimmed.data).resize({ width: 320, kernel: 'nearest' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const palette = [12, 35, 58, 84, 112, 145, 183, 219, 246];
for (let i = 0; i < data.length; i += 4) {
  const gray = Math.round(.2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2]);
  const shade = palette.reduce((best, value) => Math.abs(value - gray) < Math.abs(best - gray) ? value : best);
  data[i] = data[i + 1] = data[i + 2] = shade;
  data[i + 3] = data[i + 3] < 128 ? 0 : 255;
}
await sharp(data, { raw: info }).png().toFile('public/assets/monitor-v2.png');
console.log(`Monitor v2: ${info.width}x${info.height}`);
import './asset-workspace.mjs';
