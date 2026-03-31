import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'generation_currency';
const FREE_DAILY_LIMIT = 3;

interface CurrencyData {
  date: string;       // "YYYY-MM-DD"
  freeRemaining: number;
  tokens: number;
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function load(): Promise<CurrencyData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { date: todayString(), freeRemaining: FREE_DAILY_LIMIT, tokens: 0 };
  }

  const data = JSON.parse(raw) as CurrencyData;

  // Reset free slots if it's a new day
  if (data.date !== todayString()) {
    data.date = todayString();
    data.freeRemaining = FREE_DAILY_LIMIT;
  }

  return data;
}

async function save(data: CurrencyData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export interface GenerationStatus {
  freeRemaining: number;
  tokens: number;
  canGenerate: boolean;
}

export async function getGenerationStatus(): Promise<GenerationStatus> {
  const data = await load();
  return {
    freeRemaining: data.freeRemaining,
    tokens: data.tokens,
    canGenerate: data.freeRemaining > 0 || data.tokens > 0,
  };
}

/**
 * Consume one generation slot. Uses a free daily slot first, then a token.
 * Returns false if no free slots AND no tokens available.
 */
export async function consumeGeneration(): Promise<boolean> {
  const data = await load();

  if (data.freeRemaining > 0) {
    data.freeRemaining -= 1;
    await save(data);
    return true;
  }

  if (data.tokens > 0) {
    data.tokens -= 1;
    await save(data);
    return true;
  }

  return false;
}

/**
 * Add generation tokens (earned from battle wins).
 */
export async function addTokens(count: number): Promise<void> {
  const data = await load();
  data.tokens += count;
  await save(data);
}
