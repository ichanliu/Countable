import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;

test('launcher, splash, and web icons all use the current blue calendar artwork', () => {
  assert.equal(config.icon, './assets/icon.png');
  assert.equal(config.android.adaptiveIcon.foregroundImage, './assets/adaptive-icon.png');
  assert.equal(config.android.adaptiveIcon.backgroundColor, '#72AADD');
  assert.equal(config.splash.image, './assets/icon.png');
  assert.equal(config.splash.backgroundColor, '#72AADD');
  assert.equal(config.web.favicon, './assets/favicon.png');
  assert.equal(existsSync(new URL('../assets/splash-icon.png', import.meta.url)), false);
});

test('adaptive foreground is transparent outside the complete icon mark', () => {
  const foreground = readFileSync(new URL('../assets/adaptive-icon.png', import.meta.url));
  assert.equal(foreground.toString('ascii', 1, 4), 'PNG');
  assert.equal(foreground.readUInt32BE(16), 1024);
  assert.equal(foreground.readUInt32BE(20), 1024);
  assert.equal(foreground[25], 6);

  const icon = readFileSync(new URL('../assets/icon.png', import.meta.url));
  assert.equal(icon.readUInt32BE(16), 1024);
  assert.equal(icon.readUInt32BE(20), 1024);
});
