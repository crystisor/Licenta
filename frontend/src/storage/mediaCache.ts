import { Platform } from 'react-native';

// On native, use expo-file-system for local caching.
// On web, just return the remote URL as-is (no local filesystem).

const isNative = Platform.OS !== 'web';

// Lazy-load native-only modules
function getFileSystem() {
  return require('expo-file-system') as typeof import('expo-file-system');
}

function getImageManipulator() {
  return require('expo-image-manipulator') as typeof import('expo-image-manipulator');
}

function getMediaDir(): string {
  const FS = getFileSystem();
  return `${FS.documentDirectory}history/`;
}

async function ensureDir(): Promise<void> {
  const FS = getFileSystem();
  const dir = getMediaDir();
  const info = await FS.getInfoAsync(dir);
  if (!info.exists) {
    await FS.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export async function cacheImage(remoteUrl: string, id: string): Promise<string> {
  if (!isNative) return remoteUrl;

  const FS = getFileSystem();
  await ensureDir();
  const dest = `${getMediaDir()}${id}.jpg`;
  const result = await FS.downloadAsync(remoteUrl, dest);
  return result.uri;
}

export async function createThumbnail(sourceUri: string, id: string): Promise<string> {
  if (!isNative) return sourceUri;

  const FS = getFileSystem();
  const { manipulateAsync, SaveFormat } = getImageManipulator();
  await ensureDir();
  const result = await manipulateAsync(
    sourceUri,
    [{ resize: { width: 200 } }],
    { compress: 0.7, format: SaveFormat.JPEG },
  );
  const dest = `${getMediaDir()}${id}_thumb.jpg`;
  await FS.moveAsync({ from: result.uri, to: dest });
  return dest;
}

export async function cacheVideo(remoteUrl: string, id: string): Promise<string> {
  if (!isNative) return remoteUrl;

  const FS = getFileSystem();
  await ensureDir();
  const dest = `${getMediaDir()}${id}.mp4`;
  const result = await FS.downloadAsync(remoteUrl, dest);
  return result.uri;
}

export async function deleteMedia(id: string): Promise<void> {
  if (!isNative) return;

  const FS = getFileSystem();
  const dir = getMediaDir();
  const paths = [`${dir}${id}.jpg`, `${dir}${id}_thumb.jpg`, `${dir}${id}.mp4`];
  await Promise.all(
    paths.map(async (p) => {
      const info = await FS.getInfoAsync(p);
      if (info.exists) {
        await FS.deleteAsync(p, { idempotent: true });
      }
    }),
  );
}
