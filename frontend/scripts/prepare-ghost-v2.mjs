import sharp from 'sharp';
import { copyFile } from 'node:fs/promises';
const source = process.argv[2];
if (!source) throw new Error('Pass the clean ImageGen sprite sheet path.');
await copyFile(source, 'art-source/ghost-v2.png');
const { data, info } = await sharp(source).resize(128, 128, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const tiles = [];
for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
  const seen = new Set(); let largest = [];
  for (let pos = 0; pos < 1024; pos++) {
    if (seen.has(pos)) continue;
    const queue = [pos], component = [];
    while (queue.length) {
      const p = queue.pop(); if (seen.has(p)) continue; seen.add(p);
      const x = p % 32, y = Math.floor(p / 32);
      const i = ((row * 32 + y) * info.width + col * 32 + x) * 4;
      if (data[i + 3] < 200) continue;
      component.push(p);
      if (x > 0) queue.push(p - 1); if (x < 31) queue.push(p + 1);
      if (y > 0) queue.push(p - 32); if (y < 31) queue.push(p + 32);
    }
    if (component.length > largest.length) largest = component;
  }
  if (largest.length < 50) throw new Error(`Missing ghost in frame ${row},${col}`);
  const tile = Buffer.alloc(32 * 32 * 4);
  for (const p of largest) {
    const x = p % 32, y = Math.floor(p / 32);
    const i = ((row * 32 + y) * info.width + col * 32 + x) * 4;
    const value = (data[i] + data[i+1] + data[i+2]) / 3 > 128 ? 246 : 12;
    tile[p*4] = tile[p*4+1] = tile[p*4+2] = value; tile[p*4+3] = 255;
  }
  const trimmed = await sharp(tile, {raw: {width:32,height:32,channels:4}}).trim().png().toBuffer();
  const frame = await sharp(trimmed).resize(18, 20, { fit:'contain', background:{r:0,g:0,b:0,alpha:0}, kernel:'nearest' }).png().toBuffer();
  tiles.push({ input: frame, left:col*32+7, top:row*32+6 });
}
await sharp({ create:{width:128,height:128,channels:4,background:{r:0,g:0,b:0,alpha:0}} }).composite(tiles).png().toFile('public/assets/ghost-sprites-v2.png');
await sharp('public/assets/ghost-sprites-v2.png').extract({left:0,top:0,width:32,height:32}).resize(256,256,{kernel:'nearest'}).png().toFile('test-results/ghost-v2-preview.png');
console.log('Prepared 16 aligned transparent ghost frames, 32px per cell.');
import './asset-workspace.mjs';
