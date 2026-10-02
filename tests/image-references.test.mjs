import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPersistentImageUri,
  findOrphanedImageUris,
  getSettingsImageUris,
} from '../utils/imageReferences.ts';

const directory = 'file:///app/documents/';

test('persistent image destinations use the app document store and preserve the source extension', () => {
  assert.equal(
    buildPersistentImageUri(directory, 'event-widget', 'content://photos/image.PNG?token=1', 'unique'),
    `${directory}event-widget_unique.png`
  );
});

test('image cleanup keeps every image referenced by any event field or image library', () => {
  const shared = `${directory}event-widget_shared.jpg`;
  const custom = `${directory}custom-image_library.jpg`;
  const unused = `${directory}event-detail_old.jpg`;
  const events = [{
    id: 'one',
    title: 'one',
    targetDate: '2026-07-08',
    imageUri: shared,
    bgImageUri: undefined,
    widgetImageUri: undefined,
    isPinned: false,
    createdAt: '',
  }, {
    id: 'two',
    title: 'two',
    targetDate: '2026-07-09',
    imageUri: undefined,
    bgImageUri: undefined,
    widgetImageUri: custom,
    isPinned: false,
    createdAt: '',
  }];

  assert.deepEqual(
    findOrphanedImageUris(
      [shared, custom, unused, 'https://example.com/remote.jpg'],
      events,
      [custom],
      directory
    ),
    [unused]
  );
});

test('image cleanup ignores paths outside app-owned persistent storage', () => {
  const candidates = [
    'content://photos/1',
    'file:///other-app/event-card_shared.jpg',
    `${directory}unmanaged.jpg`,
  ];
  assert.deepEqual(findOrphanedImageUris(candidates, [], [], directory), []);
});

test('active home background remains referenced even if it is not in the custom image library', () => {
  const activeBackground = `${directory}custom-image_background.jpg`;
  const unused = `${directory}custom-image_unused.jpg`;
  const references = getSettingsImageUris({
    customImages: [],
    homeBackgroundUri: activeBackground,
  });

  assert.deepEqual(references, [activeBackground]);
  assert.deepEqual(
    findOrphanedImageUris([activeBackground, unused], [], references, directory),
    [unused]
  );
});

test('settings without a selected home background retain the existing image-library behavior', () => {
  const libraryImage = `${directory}custom-image_library.jpg`;
  assert.deepEqual(getSettingsImageUris({ customImages: [libraryImage] }), [libraryImage]);
  assert.deepEqual(getSettingsImageUris(undefined), []);
});
