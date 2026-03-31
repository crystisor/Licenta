import { ImageSourcePropType } from 'react-native';

import { Rarity } from '../utils/rarity';

export interface BattleCard {
  id: string;
  title: string;
  imageSource: ImageSourcePropType;  // { uri: "..." } or require() asset
  stats: Record<string, number>;
  rarity: Rarity;
  hp: number;
  currentHp: number;
}

export interface RoundResult {
  roundNumber: number;
  // Player attack
  playerRawDamage: number;
  playerCrit: boolean;
  opponentDodged: boolean;
  opponentDefenseReduction: number;
  damageToOpponent: number;
  // Opponent attack
  opponentRawDamage: number;
  opponentCrit: boolean;
  playerDodged: boolean;
  playerDefenseReduction: number;
  damageToPlayer: number;
  // HP after round
  playerHpAfter: number;
  opponentHpAfter: number;
}

export interface BattleResult {
  playerCardId: string;
  opponentCardId: string;
  rounds: RoundResult[];
  winner: 'player' | 'opponent' | 'draw';
  tokensEarned: number;
  timestamp: number;
}

export interface CampaignProgress {
  currentBoss: number;       // index of next unlocked boss (0-based)
  completedAt: number | null; // timestamp when all bosses beaten
}

export interface CampaignBoss {
  id: string;
  name: string;
  lore: string;
  stats: Record<string, number>;
  imageAsset: any;           // require('...') bundled image
  tokenReward: number;
}
