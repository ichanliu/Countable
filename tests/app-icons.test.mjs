import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;

function decodeRgbaPng(file) {
  const png = readFileSync(file);
  let width;
  let height;
  let bitDepth;
  let colorType;
  const imageData = [];

  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      imageData.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  assert.equal(bitDepth, 8);
  assert.equal(colorType, 6);
  const rowSize = width * 4;
  const inflated = inflateSync(Buffer.concat(imageData));
  const pixels = Buffer.alloc(height * rowSize);
  const paeth = (left, above, upperLeft) => {
    const estimate = left + above - upperLeft;
    const leftDistance = Math.abs(estimate - left);
    const aboveDistance = Math.abs(estimate - above);
    const upperLeftDistance = Math.abs(estimate - upperLeft);
    if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
    return aboveDistance <= upperLeftDistance ? above : upperLeft;
  };

  for (let y = 0; y < height; y += 1) {
    const inputOffset = y * (rowSize + 1);
    const filter = inflated[inputOffset];
    for (let i = 0; i < rowSize; i += 1) {
      const raw = inflated[inputOffset + 1 + i];
      const left = i >= 4 ? pixels[y * rowSize + i - 4] : 0;
      const above = y > 0 ? pixels[(y - 1) * rowSize + i] : 0;
      const upperLeft = y > 0 && i >= 4 ? pixels[(y - 1) * rowSize + i - 4] : 0;
      const predictor = filter === 0 ? 0
        : filter === 1 ? left
        : filter === 2 ? above
        : filter === 3 ? Math.floor((left + above) / 2)
        : filter === 4 ? paeth(left, above, upperLeft)
        : assert.fail(`Unsupported PNG filter ${filter}`);
      pixels[y * rowSize + i] = (raw + predictor) & 0xff;
    }
  }
  return { width, height, pixels };
}

function foregroundBounds(image, isForeground) {
  let left = image.width;
  let top = image.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      if (!isForeground(image.pixels, offset)) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return {
    width: right - left + 1,
    height: bottom - top + 1,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

test('launcher, splash, and web icons all use the current blue calendar artwork', () => {
  assert.equal(config.icon, './assets/icon.png');
  assert.equal(config.android.adaptiveIcon.foregroundImage, './assets/adaptive-icon.png');
  assert.equal(config.android.adaptiveIcon.backgroundColor, '#72AADD');
  assert.equal(config.splash.image, './assets/icon.png');
  assert.equal(config.splash.backgroundColor, '#72AADD');
  assert.equal(config.web.favicon, './assets/favicon.png');
  assert.equal(existsSync(new URL('../assets/splash-icon.png', import.meta.url)), false);
});

test('calendar mark is centered and inset consistently across icon variants', () => {
  const foreground = decodeRgbaPng(new URL('../assets/adaptive-icon.png', import.meta.url));
  assert.equal(foreground.width, 1024);
  assert.equal(foreground.height, 1024);
  const adaptiveBounds = foregroundBounds(foreground, (pixels, offset) => pixels[offset + 3] > 32);
  assert.ok(adaptiveBounds.width <= 460);
  assert.ok(adaptiveBounds.height <= 490);
  assert.ok(Math.abs(adaptiveBounds.centerX - 511.5) <= 2);
  assert.ok(Math.abs(adaptiveBounds.centerY - 511.5) <= 2);

  for (const [file, size] of [
    ['../assets/icon.png', 1024],
    ['../assets/favicon.png', 256],
  ]) {
    const icon = decodeRgbaPng(new URL(file, import.meta.url));
    assert.equal(icon.width, size);
    assert.equal(icon.height, size);
    assert.deepEqual([...icon.pixels.subarray(0, 4)], [114, 170, 221, 255]);
    const scale = size / 1024;
    const bounds = foregroundBounds(icon, (pixels, offset) =>
      Math.abs(pixels[offset] - 114) + Math.abs(pixels[offset + 1] - 170) +
      Math.abs(pixels[offset + 2] - 221) > 80
    );
    assert.ok(bounds.width <= 460 * scale + 2);
    assert.ok(bounds.height <= 490 * scale + 2);
    assert.ok(Math.abs(bounds.centerX - (size - 1) / 2) <= 2);
    assert.ok(Math.abs(bounds.centerY - (size - 1) / 2) <= 2);
  }
});
