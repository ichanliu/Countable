import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export async function persistEventImage(uri: string, name: string): Promise<string> {
  if (Platform.OS === 'web') return uri;

  const directory = FileSystem.documentDirectory;
  if (!directory) {
    throw new Error('Persistent image storage is unavailable on this device.');
  }

  const sourcePath = uri.split(/[?#]/)[0];
  const extension = sourcePath.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || 'jpg';
  const destination = `${directory}${name}_${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}
