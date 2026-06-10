import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const svg = readFileSync(join(publicDir, 'favicon.svg'));

const png32 = await sharp(svg).resize(32, 32).png().toBuffer();
const png180 = await sharp(svg).resize(180, 180).png().toBuffer();
const ico = await pngToIco(png32);

writeFileSync(join(publicDir, 'favicon.ico'), ico);
writeFileSync(join(publicDir, 'apple-touch-icon.png'), png180);

console.log('Generated favicon.ico and apple-touch-icon.png');
