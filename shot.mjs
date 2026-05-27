// Headless screenshot of the running dev server, for verifying 3D render changes.
// Usage: npm run dev (in another terminal), then:
//   node shot.mjs [lessonIndex] [w] [h] [deviceScaleFactor]
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';

const lesson = Number(process.argv[2] ?? 0);   // 0=Lesson1, 1=Lesson2, 2=Lesson3, 3=Free Drive
const w = Number(process.argv[3] ?? 1600);
const h = Number(process.argv[4] ?? 900);
const dpr = Number(process.argv[5] ?? 1);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: w, height: h },
  deviceScaleFactor: dpr,
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.click(`button[data-i="${lesson}"]`);
await page.waitForTimeout(800);
const out = `shot_${w}x${h}_dpr${dpr}.png`;
const png = await page.screenshot();
await writeFile(out, png);
await browser.close();
const metrics = analyzePng(png);
console.log(JSON.stringify({ out, metrics }, null, 2));
if (!metrics.pass) process.exitCode = 1;

function analyzePng(buffer) {
  const png = decodePng(buffer);
  const { width, height, data } = png;
  const regions = {
    driveWindow: { x0: 0.25, x1: 0.75, y0: 0.40, y1: 0.82 },
    lowerRoad:   { x0: 0.34, x1: 0.66, y0: 0.54, y1: 0.78 },
  };
  const result = {
    width,
    height,
    dpr,
    yellowCount: 0,
    yellowCentroidX: null,
    driveBlackRatio: 0,
    lowerRoadBlackRatio: 0,
    lowerRoadAsphaltRatio: 0,
  };

  function sample(region, visitor) {
    const x0 = Math.floor(region.x0 * width);
    const x1 = Math.floor(region.x1 * width);
    const y0 = Math.floor(region.y0 * height);
    const y1 = Math.floor(region.y1 * height);
    let count = 0;
    for (let y = y0; y < y1; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        const idx = (y * width + x) * 4;
        visitor(data[idx], data[idx + 1], data[idx + 2], x / width);
        count++;
      }
    }
    return count;
  }

  let driveBlack = 0;
  const driveTotal = sample(regions.driveWindow, (r, g, b) => {
    if (r < 20 && g < 20 && b < 20) driveBlack++;
  });
  result.driveBlackRatio = driveBlack / driveTotal;

  let lowerBlack = 0;
  let lowerAsphalt = 0;
  const lowerTotal = sample(regions.lowerRoad, (r, g, b) => {
    if (r < 20 && g < 20 && b < 20) lowerBlack++;
    if (r >= 30 && r <= 85 && g >= 30 && g <= 85 && b >= 30 && b <= 85) lowerAsphalt++;
  });
  result.lowerRoadBlackRatio = lowerBlack / lowerTotal;
  result.lowerRoadAsphaltRatio = lowerAsphalt / lowerTotal;

  let yellowXSum = 0;
  sample(regions.driveWindow, (r, g, b, xNorm) => {
    if (r > 190 && g > 145 && b < 90) {
      result.yellowCount++;
      yellowXSum += xNorm;
    }
  });
  if (result.yellowCount > 0) result.yellowCentroidX = yellowXSum / result.yellowCount;

  result.pass =
    result.yellowCount > 30 &&
    result.yellowCentroidX < 0.5 &&
    result.driveBlackRatio < 0.12 &&
    result.lowerRoadBlackRatio < 0.20 &&
    result.lowerRoadAsphaltRatio > 0.15;

  return result;
}

function decodePng(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature) {
    throw new Error('Not a PNG file');
  }

  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];

  while (pos < buffer.length) {
    const len = buffer.readUInt32BE(pos);
    const type = buffer.subarray(pos + 4, pos + 8).toString('ascii');
    const data = buffer.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}`);
      }
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += len + 12;
  }

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const inflated = inflateSync(Buffer.concat(idat));
  const raw = Buffer.alloc(height * stride);

  let inPos = 0;
  for (let y = 0; y < height; y++) {
    const filter = inflated[inPos++];
    const row = inflated.subarray(inPos, inPos + stride);
    inPos += stride;
    const prev = y === 0 ? null : raw.subarray((y - 1) * stride, y * stride);
    const out = raw.subarray(y * stride, (y + 1) * stride);

    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[x - channels] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= channels ? prev[x - channels] : 0;
      if (filter === 0) out[x] = row[x];
      else if (filter === 1) out[x] = (row[x] + left) & 255;
      else if (filter === 2) out[x] = (row[x] + up) & 255;
      else if (filter === 3) out[x] = (row[x] + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) out[x] = (row[x] + paeth(left, up, upLeft)) & 255;
      else throw new Error(`Unsupported PNG filter ${filter}`);
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < raw.length; i += channels, j += 4) {
    rgba[j] = raw[i];
    rgba[j + 1] = raw[i + 1];
    rgba[j + 2] = raw[i + 2];
    rgba[j + 3] = channels === 4 ? raw[i + 3] : 255;
  }
  return { width, height, data: rgba };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}
