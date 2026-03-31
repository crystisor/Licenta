import { BattleCard, BattleResult, RoundResult } from '../types/battle';
import { getRarity } from '../utils/rarity';
import { GalleryEntry } from '../types';
import { CampaignBoss } from '../types/battle';

const BASE_HP = 30;
const MAX_ROUNDS = 4;
const CRIT_THRESHOLD = 12;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createBattleCardFromGallery(entry: GalleryEntry): BattleCard | null {
  if (!entry.card_meta?.stats) return null;
  const { rarity } = getRarity(entry.card_meta.stats);
  return {
    id: entry.id,
    title: entry.card_meta.title,
    imageUri: entry.image_url,
    stats: entry.card_meta.stats,
    rarity,
    hp: BASE_HP,
    currentHp: BASE_HP,
  };
}

export function createBattleCardFromBoss(boss: CampaignBoss): BattleCard {
  const { rarity } = getRarity(boss.stats);
  return {
    id: boss.id,
    title: boss.name,
    imageUri: boss.imageAsset,
    stats: boss.stats,
    rarity,
    hp: BASE_HP,
    currentHp: BASE_HP,
  };
}

/**
 * Resolve a single round of combat. Both cards attack simultaneously.
 *
 * Per card per round:
 *   1. raw_damage = Strength + d6
 *   2. if (Magic + d6) > 12 → raw_damage *= 2  (crit)
 *   3. final_damage = max(1, raw_damage - floor(opponent.Defense / 2))
 *   4. if random(1,100) <= opponent.Agility * 5 → final_damage = 0  (dodge)
 */
function resolveRound(
  player: BattleCard,
  opponent: BattleCard,
  roundNumber: number,
): RoundResult {
  // Player attacks opponent
  let playerRaw = player.stats.Strength + randomInt(1, 6);
  const playerCrit = (player.stats.Magic + randomInt(1, 6)) > CRIT_THRESHOLD;
  if (playerCrit) playerRaw *= 2;
  const oppDefReduction = Math.floor(opponent.stats.Defense / 2);
  let dmgToOpponent = Math.max(1, playerRaw - oppDefReduction);
  const opponentDodged = randomInt(1, 100) <= opponent.stats.Agility * 5;
  if (opponentDodged) dmgToOpponent = 0;

  // Opponent attacks player
  let oppRaw = opponent.stats.Strength + randomInt(1, 6);
  const oppCrit = (opponent.stats.Magic + randomInt(1, 6)) > CRIT_THRESHOLD;
  if (oppCrit) oppRaw *= 2;
  const playerDefReduction = Math.floor(player.stats.Defense / 2);
  let dmgToPlayer = Math.max(1, oppRaw - playerDefReduction);
  const playerDodged = randomInt(1, 100) <= player.stats.Agility * 5;
  if (playerDodged) dmgToPlayer = 0;

  // Apply damage
  const playerHpAfter = Math.max(0, player.currentHp - dmgToPlayer);
  const opponentHpAfter = Math.max(0, opponent.currentHp - dmgToOpponent);

  return {
    roundNumber,
    playerRawDamage: playerRaw,
    playerCrit,
    opponentDodged,
    opponentDefenseReduction: oppDefReduction,
    damageToOpponent: dmgToOpponent,
    opponentRawDamage: oppRaw,
    opponentCrit: oppCrit,
    playerDodged,
    playerDefenseReduction: playerDefReduction,
    damageToPlayer: dmgToPlayer,
    playerHpAfter,
    opponentHpAfter,
  };
}

/**
 * Run a full battle: 4 rounds, then sudden death if both alive.
 */
export function runBattle(
  playerCard: BattleCard,
  opponentCard: BattleCard,
  tokensOnWin: number,
): BattleResult {
  const player = { ...playerCard, currentHp: BASE_HP };
  const opponent = { ...opponentCard, currentHp: BASE_HP };
  const rounds: RoundResult[] = [];

  // Main 4 rounds
  for (let i = 1; i <= MAX_ROUNDS; i++) {
    const result = resolveRound(player, opponent, i);
    player.currentHp = result.playerHpAfter;
    opponent.currentHp = result.opponentHpAfter;
    rounds.push(result);

    if (player.currentHp <= 0 || opponent.currentHp <= 0) break;
  }

  // Sudden death — extra rounds until someone drops (or both)
  let suddenDeathRound = MAX_ROUNDS + 1;
  while (player.currentHp > 0 && opponent.currentHp > 0) {
    const result = resolveRound(player, opponent, suddenDeathRound);
    player.currentHp = result.playerHpAfter;
    opponent.currentHp = result.opponentHpAfter;
    rounds.push(result);
    suddenDeathRound++;

    // Safety cap to avoid infinite loops
    if (suddenDeathRound > 20) break;
  }

  let winner: 'player' | 'opponent' | 'draw';
  if (player.currentHp > 0 && opponent.currentHp <= 0) {
    winner = 'player';
  } else if (opponent.currentHp > 0 && player.currentHp <= 0) {
    winner = 'opponent';
  } else {
    winner = 'draw';
  }

  return {
    playerCardId: playerCard.id,
    opponentCardId: opponentCard.id,
    rounds,
    winner,
    tokensEarned: winner === 'player' ? tokensOnWin : 0,
    timestamp: Date.now(),
  };
}
