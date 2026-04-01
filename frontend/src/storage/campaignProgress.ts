import AsyncStorage from '@react-native-async-storage/async-storage';

import { CampaignProgress } from '../types/battle';

const STORAGE_KEY = 'campaign_progress';

export async function getCampaignProgress(): Promise<CampaignProgress> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { currentBoss: 0, completedAt: null };
  return JSON.parse(raw) as CampaignProgress;
}

export async function saveCampaignProgress(progress: CampaignProgress): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export async function advanceBoss(totalBosses: number): Promise<CampaignProgress> {
  const progress = await getCampaignProgress();
  if (progress.currentBoss < totalBosses - 1) {
    progress.currentBoss += 1;
  } else if (!progress.completedAt) {
    progress.completedAt = Date.now();
  }
  await saveCampaignProgress(progress);
  return progress;
}
