import type { CountdownEvent } from '../constants/types';

export function buildPersistentImageUri(
  directory: string,
  name: string,
  sourceUri: string,
  suffix: string
): string {
  const sourcePath = sourceUri.split(/[?#]/)[0];
  const extension = sourcePath.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || 'jpg';
  return `${directory}${name}_${suffix}.${extension}`;
}

export function getSettingsImageUris(settings: unknown): string[] {
  if (!settings || typeof settings !== 'object') return [];
  const value = settings as { customImages?: unknown; homeBackgroundUri?: unknown };
  const customImages = Array.isArray(value.customImages)
    ? value.customImages.filter((uri): uri is string => typeof uri === 'string')
    : [];
  const homeBackground = typeof value.homeBackgroundUri === 'string'
    ? [value.homeBackgroundUri]
    : [];
  return [...new Set([...customImages, ...homeBackground])];
}

export function findOrphanedImageUris(
  candidates: string[],
  events: CountdownEvent[],
  otherImageUris: string[],
  documentDirectory: string | null
): string[] {
  const referenced = new Set(otherImageUris);
  for (const event of events) {
    for (const uri of [event.imageUri, event.bgImageUri, event.widgetImageUri]) {
      if (uri) referenced.add(uri);
    }
  }

  if (!documentDirectory) return [];
  const directory = documentDirectory.endsWith('/')
    ? documentDirectory
    : `${documentDirectory}/`;
  return [...new Set(candidates)].filter((uri) => {
    if (referenced.has(uri) || !uri.startsWith(directory)) return false;
    const filename = uri.slice(directory.length);
    return /^(event-card|event-detail|event-widget|custom-image)_[^/\\]+$/.test(filename);
  });
}
