import AsyncStorage from '@react-native-async-storage/async-storage';

import { HistoryEntry } from '../types';
import { deleteMedia } from './mediaCache';

const INDEX_KEY = 'history_index'; // stores id[] sorted newest-first

async function getIndex(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

async function setIndex(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

function entryKey(id: string): string {
  return `history_entry:${id}`;
}

export async function insertEntry(entry: HistoryEntry): Promise<void> {
  const ids = await getIndex();
  ids.unshift(entry.id); // newest first
  await AsyncStorage.setItem(entryKey(entry.id), JSON.stringify(entry));
  await setIndex(ids);
}

export async function getEntries(limit: number, offset: number): Promise<HistoryEntry[]> {
  const ids = await getIndex();
  const slice = ids.slice(offset, offset + limit);
  if (slice.length === 0) return [];

  const keys = slice.map(entryKey);
  const pairs = await AsyncStorage.multiGet(keys);

  const entries: HistoryEntry[] = [];
  for (const [, value] of pairs) {
    if (value) {
      entries.push(JSON.parse(value) as HistoryEntry);
    }
  }
  return entries;
}

export async function getEntry(id: string): Promise<HistoryEntry | null> {
  const raw = await AsyncStorage.getItem(entryKey(id));
  return raw ? (JSON.parse(raw) as HistoryEntry) : null;
}

export async function getEntryCount(): Promise<number> {
  const ids = await getIndex();
  return ids.length;
}

export async function removeEntry(id: string): Promise<void> {
  await deleteMedia(id);
  const ids = await getIndex();
  await setIndex(ids.filter((i) => i !== id));
  await AsyncStorage.removeItem(entryKey(id));
}

export async function updateVideo(
  id: string,
  videoUri: string,
  motionPrompt: string,
): Promise<void> {
  const entry = await getEntry(id);
  if (!entry) return;
  entry.videoUri = videoUri;
  entry.motionPrompt = motionPrompt;
  await AsyncStorage.setItem(entryKey(id), JSON.stringify(entry));
}
