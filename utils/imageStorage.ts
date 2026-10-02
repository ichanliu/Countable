import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildPersistentImageUri,
  findOrphanedImageUris,
  getSettingsImageUris,
} from './imageReferences';

export { findOrphanedImageUris } from './imageReferences';

export async function persistEventImage(uri: string, name: string): Promise<string> {
  if (Platform.OS === 'web') return uri;

  const directory = FileSystem.documentDirectory;
  if (!directory) {
    throw new Error('Persistent image storage is unavailable on this device.');
  }

  const destination = buildPersistentImageUri(
    directory,
    name,
    uri,
    `${Date.now()}_${Math.random().toString(36).slice(2)}`
  );
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}

export async function deleteOrphanedImageFiles(uris: string[]): Promise<void> {
  if (Platform.OS === 'web') return;
  await Promise.all(uris.map((uri) => FileSystem.deleteAsync(uri, { idempotent: true })));
}

export async function getSettingsImageReferences(): Promise<string[]> {
  const raw = await AsyncStorage.getItem('@countable_settings');
  if (!raw) return [];
  const settings: unknown = JSON.parse(raw);
  return getSettingsImageUris(settings);
}
