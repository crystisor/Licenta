import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CAMPAIGN_BOSSES } from '../data/campaign';
import { createBattleCardFromBoss, createBattleCardFromGallery, runBattle } from '../engine/battleEngine';
import { fetchCard } from '../services/api';
import { BattleCard, BattleResult, RoundResult } from '../types/battle';
import { getRarity } from '../utils/rarity';
import { theme } from '../theme';

interface BattleState {
  phase: 'loading' | 'intro' | 'round' | 'result';
  playerCard: BattleCard | null;
  opponentCard: BattleCard | null;
  battleResult: BattleResult | null;
  currentRound: number;       // 0-based index into rounds array
  playerHp: number;
  opponentHp: number;
  showRoundDetail: boolean;
}

type BattleAction =
  | { type: 'INIT'; playerCard: BattleCard; opponentCard: BattleCard; result: BattleResult }
  | { type: 'START_BATTLE' }
  | { type: 'SHOW_ROUND' }
  | { type: 'NEXT_ROUND' }
  | { type: 'SHOW_RESULT' };

function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        phase: 'intro',
        playerCard: action.playerCard,
        opponentCard: action.opponentCard,
        battleResult: action.result,
        currentRound: 0,
        playerHp: 30,
        opponentHp: 30,
        showRoundDetail: false,
      };
    case 'START_BATTLE':
      return { ...state, phase: 'round', showRoundDetail: true };
    case 'SHOW_ROUND': {
      const round = state.battleResult!.rounds[state.currentRound];
      return {
        ...state,
        showRoundDetail: true,
        playerHp: round.playerHpAfter,
        opponentHp: round.opponentHpAfter,
      };
    }
    case 'NEXT_ROUND': {
      const nextIdx = state.currentRound + 1;
      if (nextIdx >= state.battleResult!.rounds.length) {
        return { ...state, phase: 'result' };
      }
      return { ...state, currentRound: nextIdx, showRoundDetail: false };
    }
    case 'SHOW_RESULT':
      return { ...state, phase: 'result' };
    default:
      return state;
  }
}

const INITIAL_STATE: BattleState = {
  phase: 'loading',
  playerCard: null,
  opponentCard: null,
  battleResult: null,
  currentRound: 0,
  playerHp: 30,
  opponentHp: 30,
  showRoundDetail: false,
};

function HpBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = Math.max(0, (current / max) * 100);
  return (
    <View style={hpStyles.track}>
      <View style={[hpStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      <Text style={hpStyles.text}>{current}/{max}</Text>
    </View>
  );
}

const hpStyles = StyleSheet.create({
  track: {
    height: 18,
    backgroundColor: theme.colors.track,
    borderRadius: 9,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 9,
  },
  text: {
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});

function PopupTag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[popupStyles.tag, { backgroundColor: color }]}>
      <Text style={popupStyles.text}>{label}</Text>
    </View>
  );
}

const popupStyles = StyleSheet.create({
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  text: {
    color: '#090B13',
    fontSize: 10,
    fontWeight: '800',
  },
});

export function BattleArenaScreen() {
  const router = useRouter();
  const { bossIndex, mode, cardId } = useLocalSearchParams<{
    bossIndex: string;
    mode: string;
    cardId: string;
  }>();

  const [state, dispatch] = useReducer(battleReducer, INITIAL_STATE);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Load cards and pre-compute battle on mount
  useEffect(() => {
    const boss = CAMPAIGN_BOSSES[Number(bossIndex)];
    const opponentCard = createBattleCardFromBoss(boss);
    const tokensOnWin = mode === 'quick' ? 1 : boss.tokenReward;

    fetchCard(cardId!).then((entry) => {
      const playerCard = createBattleCardFromGallery(entry);
      if (!playerCard) return;

      const result = runBattle(playerCard, opponentCard, tokensOnWin);
      dispatch({ type: 'INIT', playerCard, opponentCard, result });
    });
  }, [bossIndex, cardId, mode]);

  // Animate round intro
  useEffect(() => {
    if (state.phase === 'round' && !state.showRoundDetail) {
      slideAnim.setValue(0);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        dispatch({ type: 'SHOW_ROUND' });
      });
    }
  }, [state.phase, state.currentRound, state.showRoundDetail]);

  const handleTap = useCallback(() => {
    if (state.phase === 'intro') {
      dispatch({ type: 'START_BATTLE' });
    } else if (state.phase === 'round' && state.showRoundDetail) {
      dispatch({ type: 'NEXT_ROUND' });
    } else if (state.phase === 'result') {
      const boss = CAMPAIGN_BOSSES[Number(bossIndex)];
      router.replace({
        pathname: '/battle-result',
        params: {
          winner: state.battleResult!.winner,
          tokensEarned: String(state.battleResult!.tokensEarned),
          bossIndex: bossIndex!,
          mode: mode!,
          cardId: cardId!,
          bossName: boss.name,
        },
      });
    }
  }, [state.phase, state.showRoundDetail, state.battleResult, bossIndex, mode, cardId, router]);

  if (state.phase === 'loading' || !state.playerCard || !state.opponentCard) {
    return (
      <LinearGradient colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]} style={styles.gradient}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Preparing battle...</Text>
        </View>
      </LinearGradient>
    );
  }

  const round: RoundResult | null =
    state.battleResult && state.currentRound < state.battleResult.rounds.length
      ? state.battleResult.rounds[state.currentRound]
      : null;

  const playerRarity = getRarity(state.playerCard.stats);
  const opponentRarity = getRarity(state.opponentCard.stats);

  return (
    <LinearGradient colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]} style={styles.gradient}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <Pressable onPress={handleTap} style={styles.arena}>
          {/* Round banner */}
          {state.phase === 'intro' && (
            <View style={styles.bannerWrap}>
              <Text style={styles.bannerText}>VS</Text>
              <Text style={styles.tapHint}>Tap to start</Text>
            </View>
          )}
          {state.phase === 'round' && round && (
            <View style={styles.bannerWrap}>
              <Text style={styles.roundBanner}>Round {round.roundNumber}</Text>
            </View>
          )}
          {state.phase === 'result' && (
            <View style={styles.bannerWrap}>
              <Text style={[
                styles.resultBanner,
                { color: state.battleResult!.winner === 'player' ? theme.colors.success : state.battleResult!.winner === 'opponent' ? theme.colors.danger : theme.colors.textMuted },
              ]}>
                {state.battleResult!.winner === 'player' ? 'VICTORY' : state.battleResult!.winner === 'opponent' ? 'DEFEAT' : 'DRAW'}
              </Text>
              <Text style={styles.tapHint}>Tap to continue</Text>
            </View>
          )}

          {/* Cards side by side */}
          <View style={styles.cardsRow}>
            {/* Player card */}
            <View style={styles.cardColumn}>
              <View style={[styles.cardFrame, { borderColor: playerRarity.color }]}>
                {state.playerCard.imageUri ? (
                  <Image source={{ uri: state.playerCard.imageUri }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <View style={styles.cardPlaceholder} />
                )}
              </View>
              <Text style={styles.cardName} numberOfLines={1}>{state.playerCard.title}</Text>
              <HpBar current={state.playerHp} max={30} color={theme.colors.success} />

              {/* Round popups for player */}
              {state.showRoundDetail && round && (
                <View style={styles.popups}>
                  {round.damageToPlayer > 0 && (
                    <PopupTag label={`-${round.damageToPlayer} HP`} color={theme.colors.danger} />
                  )}
                  {round.playerDodged && (
                    <PopupTag label="DODGED!" color={theme.colors.accent} />
                  )}
                  {round.playerCrit && (
                    <PopupTag label="CRIT!" color="#FFD700" />
                  )}
                  {!round.playerDodged && round.playerDefenseReduction > 0 && round.damageToPlayer > 0 && (
                    <PopupTag label={`BLOCKED -${round.playerDefenseReduction}`} color={theme.colors.textMuted} />
                  )}
                </View>
              )}
            </View>

            {/* Opponent card */}
            <View style={styles.cardColumn}>
              <View style={[styles.cardFrame, { borderColor: opponentRarity.color }]}>
                {state.opponentCard.imageUri ? (
                  <Image source={{ uri: state.opponentCard.imageUri }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <View style={styles.cardPlaceholder}>
                    <Text style={styles.placeholderText}>{state.opponentCard.title[0]}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardName} numberOfLines={1}>{state.opponentCard.title}</Text>
              <HpBar current={state.opponentHp} max={30} color={theme.colors.danger} />

              {/* Round popups for opponent */}
              {state.showRoundDetail && round && (
                <View style={styles.popups}>
                  {round.damageToOpponent > 0 && (
                    <PopupTag label={`-${round.damageToOpponent} HP`} color={theme.colors.danger} />
                  )}
                  {round.opponentDodged && (
                    <PopupTag label="DODGED!" color={theme.colors.accent} />
                  )}
                  {round.opponentCrit && (
                    <PopupTag label="CRIT!" color="#FFD700" />
                  )}
                  {!round.opponentDodged && round.opponentDefenseReduction > 0 && round.damageToOpponent > 0 && (
                    <PopupTag label={`BLOCKED -${round.opponentDefenseReduction}`} color={theme.colors.textMuted} />
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Damage summary for current round */}
          {state.showRoundDetail && round && (
            <View style={styles.roundSummary}>
              <Text style={styles.summaryText}>
                {state.playerCard.title.split(',')[0]} deals {round.damageToOpponent} dmg
                {round.playerCrit ? ' (CRIT!)' : ''}
              </Text>
              <Text style={styles.summaryText}>
                {state.opponentCard.title.split(',')[0]} deals {round.damageToPlayer} dmg
                {round.opponentCrit ? ' (CRIT!)' : ''}
              </Text>
              {state.phase === 'round' && (
                <Text style={styles.tapHint}>Tap for next round</Text>
              )}
            </View>
          )}
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  arena: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    justifyContent: 'center',
    gap: 20,
  },
  bannerWrap: {
    alignItems: 'center',
    gap: 6,
  },
  bannerText: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
  },
  roundBanner: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  resultBanner: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
  },
  tapHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    opacity: 0.6,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  cardColumn: {
    flex: 1,
    maxWidth: 180,
    alignItems: 'center',
    gap: 8,
  },
  cardFrame: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: theme.colors.panel,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardPlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: theme.colors.textMuted,
    fontSize: 36,
    fontWeight: '900',
  },
  cardName: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  popups: {
    alignItems: 'center',
    gap: 2,
    minHeight: 40,
  },
  roundSummary: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  summaryText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
