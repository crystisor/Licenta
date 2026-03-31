export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface RarityInfo {
  rarity: Rarity;
  color: string;
}

const RARITY_THRESHOLDS: { min: number; rarity: Rarity; color: string }[] = [
  { min: 31, rarity: 'Legendary', color: '#FFD700' },
  { min: 26, rarity: 'Epic', color: '#A855F7' },
  { min: 21, rarity: 'Rare', color: '#3B82F6' },
  { min: 16, rarity: 'Uncommon', color: '#22D3EE' },
  { min: 0, rarity: 'Common', color: '#9CA3AF' },
];

export function getRarity(stats: Record<string, number>): RarityInfo {
  const total = Object.values(stats).reduce((sum, v) => sum + v, 0);
  for (const tier of RARITY_THRESHOLDS) {
    if (total >= tier.min) {
      return { rarity: tier.rarity, color: tier.color };
    }
  }
  return { rarity: 'Common', color: '#9CA3AF' };
}
