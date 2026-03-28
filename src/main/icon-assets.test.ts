import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

type PngImage = {
  width: number;
  height: number;
  pixels: Uint8Array;
};

function decodeRgbaPng(relativePath: string): PngImage {
  const filePath = path.resolve(process.cwd(), relativePath);
  const buffer = fs.readFileSync(filePath);

  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');

  let offset = 8;
  let width = 0;
  let height = 0;
  let interlaceMethod = 0;
  const idatChunks: Buffer[] = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    offset += 4;

    const chunkType = buffer.subarray(offset, offset + 4).toString('ascii');
    offset += 4;

    const chunkData = buffer.subarray(offset, offset + length);
    offset += length + 4;

    if (chunkType === 'IHDR') {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      const bitDepth = chunkData.readUInt8(8);
      const colorType = chunkData.readUInt8(9);
      interlaceMethod = chunkData.readUInt8(12);

      assert.equal(bitDepth, 8, 'expected 8-bit PNG');
      assert.equal(colorType, 6, 'expected RGBA PNG');
      assert.equal(interlaceMethod, 0, 'expected non-interlaced PNG');
    }

    if (chunkType === 'IDAT') {
      idatChunks.push(chunkData);
    }

    if (chunkType === 'IEND') {
      break;
    }
  }

  assert.ok(width > 0 && height > 0, 'expected PNG dimensions');
  assert.ok(idatChunks.length > 0, 'expected PNG image data');

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const expectedRawLength = (stride + 1) * height;
  assert.equal(raw.length, expectedRawLength, 'unexpected PNG scanline size');

  const pixels = new Uint8Array(stride * height);
  let rawOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filterType = raw[rawOffset];
    rawOffset += 1;

    for (let x = 0; x < stride; x += 1) {
      const current = raw[rawOffset];
      rawOffset += 1;

      const left = x >= bytesPerPixel ? pixels[(y * stride) + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[((y - 1) * stride) + x] : 0;
      const upLeft = (x >= bytesPerPixel && y > 0)
        ? pixels[((y - 1) * stride) + x - bytesPerPixel]
        : 0;

      const targetIndex = (y * stride) + x;

      switch (filterType) {
        case 0:
          pixels[targetIndex] = current;
          break;
        case 1:
          pixels[targetIndex] = (current + left) & 0xff;
          break;
        case 2:
          pixels[targetIndex] = (current + up) & 0xff;
          break;
        case 3:
          pixels[targetIndex] = (current + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4:
          pixels[targetIndex] = (current + paethPredictor(left, up, upLeft)) & 0xff;
          break;
        default:
          throw new Error(`Unsupported PNG filter type: ${filterType}`);
      }
    }
  }

  return { width, height, pixels };
}

function paethPredictor(left: number, up: number, upLeft: number) {
  const initial = left + up - upLeft;
  const leftDistance = Math.abs(initial - left);
  const upDistance = Math.abs(initial - up);
  const upLeftDistance = Math.abs(initial - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  if (upDistance <= upLeftDistance) {
    return up;
  }

  return upLeft;
}

function readAlphaAt(relativePath: string, x: number, y: number) {
  const image = decodeRgbaPng(relativePath);
  assert.ok(x >= 0 && x < image.width, 'x must be inside image');
  assert.ok(y >= 0 && y < image.height, 'y must be inside image');

  const alphaOffset = ((y * image.width) + x) * 4 + 3;
  return image.pixels[alphaOffset];
}

test('development dock icon has transparent outer corners and an opaque center', () => {
  assert.equal(readAlphaAt('build/app-icon.png', 24, 24), 0);
  assert.ok(readAlphaAt('build/app-icon.png', 512, 512) > 250);
});

test('macOS iconset keeps the same rounded silhouette at 512px', () => {
  assert.equal(readAlphaAt('build/iconset.iconset/icon_512x512.png', 12, 12), 0);
  assert.ok(readAlphaAt('build/iconset.iconset/icon_512x512.png', 256, 256) > 250);
});
