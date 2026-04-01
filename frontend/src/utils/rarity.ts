export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface RarityInfo {
  rarity: Rarity;
  color: string;
  score: number;
}

const RARITY_THRESHOLDS: { min: number; rarity: Rarity; color: string }[] = [
  { min: 31, rarity: 'Legendary', color: '#FFD700' },
  { min: 26, rarity: 'Epic', color: '#A855F7' },
  { min: 21, rarity: 'Rare', color: '#3B82F6' },
  { min: 16, rarity: 'Uncommon', color: '#22D3EE' },
  { min: 0, rarity: 'Common', color: '#9CA3AF' },
];

/**
 * Compute rarity from stats + creativity bonus.
 *
 * Base score = sum of stats (4-40)
 * Creativity bonus = floor(creativity / 2) → 0-5 extra points
 *   creativity 1-2 → +0, 3-4 → +1, 5-6 → +2, 7-8 → +3, 9-10 → +4-5
 *
 * A generic prompt can't push a card above its stats tier,
 * but a highly creative prompt can bump a borderline card up.
 */
export function getRarity(stats: Record<string, number>, creativity?: number): RarityInfo {
  const statTotal = Object.values(stats).reduce((sum, v) => sum + v, 0);
  const creativityBonus = Math.floor((creativity ?? 5) / 2);
  const score = statTotal + creativityBonus;

  for (const tier of RARITY_THRESHOLDS) {
    if (score >= tier.min) {
      return { rarity: tier.rarity, color: tier.color, score };
    }
  }
  return { rarity: 'Common', color: '#9CA3AF', score };
}
