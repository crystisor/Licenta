import { useCallback, useEffect, useReducer, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CAMPAIGN_BOSSES } from '../data/campaign';
import { createBattleCardFromBoss, createBattleCardFromGallery, runBattle } from '../engine/battleEngine';
import { fetchCard } from '../services/api';
import { BattleCard, BattleResult, RoundResult } from '../types/battle';
import { getRarity } from '../utils/rarity';
import { sparkTheme } from '../theme';
import { SparkAmbient } from '../components/spark/SparkAmbient';

// Semantic battle colors — kept distinct from the brand red so player vs opponent reads cleanly.
const PLAYER_HP_COLOR = '#22c55e';   // green
const OPPONENT_HP_COLOR = '#dc2626'; // red (matches brand)
const DODGE_COLOR = '#22d3ee';       // cyan
const CRIT_COLOR = '#FFD700';        // gold

interface BattleState {
  phase: 'loading' | 'intro' | 'round' | 'result';
  playerCard: BattleCard | null;
  opponentCard: BattleCard | null;
  battleResult: BattleResult | null;
  currentRound: number;
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

function HpBar({ current, max, color, label }: { current: number; max: number; color: string; label: string }) {
  const pct = Math.max(0, (current / max) * 100);
  return (
    <View style={hpStyles.wrap}>
      <View style={hpStyles.headerRow}>
        <Text style={hpStyles.label}>{label}</Text>
        <Text style={hpStyles.hpText}>{current}/{max}</Text>
      </View>
      <View style={hpStyles.track}>
        <View style={[hpStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const hpStyles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    color: sparkTheme.colors.textDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  hpText: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  track: {
    height: 8,
    backgroundColor: sparkTheme.colors.bg,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    borderRadius: sparkTheme.radius.pill,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: sparkTheme.radius.pill,
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
    paddingHorizontal: sparkTheme.spacing[3],
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  text: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
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
  }, [state.phase, state.currentRound, state.showRoundDetail, slideAnim]);

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
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[sparkTheme.colors.bgGradientTop, sparkTheme.colors.bgGradientBottom]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <SparkAmbient />
        <View style={styles.center}>
          <View style={styles.loadingPill}>
            <Text style={styles.loadingPillText}>ARENA</Text>
          </View>
          <Text style={styles.loadingText}>Preparing battle…</Text>
        </View>
      </View>
    );
  }

  const round: RoundResult | null =
    state.battleResult && state.currentRound < state.battleResult.rounds.length
      ? state.battleResult.rounds[state.currentRound]
      : null;

  const playerRarity = getRarity(state.playerCard.stats);
  const opponentRarity = getRarity(state.opponentCard.stats);

  const phaseLabel =
    state.phase === 'intro'
      ? 'MATCHUP'
      : state.phase === 'round'
      ? `ROUND ${round?.roundNumber ?? state.currentRound + 1}`
      : 'OUTCOME';

  const totalRounds = state.battleResult?.rounds.length ?? 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[sparkTheme.colors.bgGradientTop, sparkTheme.colors.bgGradientBottom]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <SparkAmbient />

      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <Pressable onPress={handleTap} style={styles.arena}>
          {/* Phase eyebrow */}
          <View style={styles.eyebrowRow}>
            <Text style={styles.phaseEyebrow}>{phaseLabel}</Text>
            {state.phase === 'round' && totalRounds > 0 && (
              <Text style={styles.phaseProgress}>
                {state.currentRound + 1}/{totalRounds}
              </Text>
            )}
          </View>

          {/* Banner */}
          {state.phase === 'intro' && (
            <View style={styles.bannerWrap}>
              <Text style={styles.vsBanner}>VS</Text>
              <Text style={styles.tapHint}>Tap anywhere to start</Text>
            </View>
          )}
          {state.phase === 'round' && round && (
            <View style={styles.bannerWrap}>
              <Text style={styles.roundBanner}>Round {round.roundNumber}</Text>
            </View>
          )}
          {state.phase === 'result' && (
            <View style={styles.bannerWrap}>
              <Text
                style={[
                  styles.resultBanner,
                  {
                    color:
                      state.battleResult!.winner === 'player'
                        ? PLAYER_HP_COLOR
                        : state.battleResult!.winner === 'opponent'
                        ? sparkTheme.colors.brand
                        : sparkTheme.colors.textMuted,
                  },
                ]}
              >
                {state.battleResult!.winner === 'player'
                  ? 'VICTORY'
                  : state.battleResult!.winner === 'opponent'
                  ? 'DEFEAT'
                  : 'DRAW'}
              </Text>
              <Text style={styles.tapHint}>Tap to continue</Text>
            </View>
          )}

          {/* Cards side by side */}
          <View style={styles.cardsRow}>
            <View style={styles.cardColumn}>
              <View style={styles.cardSideLabel}>
                <Text style={styles.cardSideLabelText}>YOU</Text>
              </View>
              <View style={[styles.cardFrame, { borderColor: playerRarity.color }]}>
                {state.playerCard.imageSource ? (
                  <Image source={state.playerCard.imageSource} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <View style={styles.cardPlaceholder} />
                )}
              </View>
              <Text style={styles.cardName} numberOfLines={1}>{state.playerCard.title}</Text>
              <HpBar current={state.playerHp} max={30} color={PLAYER_HP_COLOR} label="HP" />

              {state.showRoundDetail && round && (
                <View style={styles.popups}>
                  {round.damageToPlayer > 0 && (
                    <PopupTag label={`-${round.damageToPlayer} HP`} color={sparkTheme.colors.brand} />
                  )}
                  {round.playerDodged && <PopupTag label="DODGED!" color={DODGE_COLOR} />}
                  {round.playerCrit && <PopupTag label="CRIT!" color={CRIT_COLOR} />}
                  {!round.playerDodged && round.playerDefenseReduction > 0 && round.damageToPlayer > 0 && (
                    <PopupTag label={`BLOCKED -${round.playerDefenseReduction}`} color={sparkTheme.colors.textSecondary} />
                  )}
                </View>
              )}
            </View>

            <View style={styles.cardColumn}>
              <View style={styles.cardSideLabelOpp}>
                <Text style={styles.cardSideLabelText}>FOE</Text>
              </View>
              <View style={[styles.cardFrame, { borderColor: opponentRarity.color }]}>
                {state.opponentCard.imageSource ? (
                  <Image source={state.opponentCard.imageSource} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <View style={styles.cardPlaceholder}>
                    <Text style={styles.placeholderText}>{state.opponentCard.title[0]}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardName} numberOfLines={1}>{state.opponentCard.title}</Text>
              <HpBar current={state.opponentHp} max={30} color={OPPONENT_HP_COLOR} label="HP" />

              {state.showRoundDetail && round && (
                <View style={styles.popups}>
                  {round.damageToOpponent > 0 && (
                    <PopupTag label={`-${round.damageToOpponent} HP`} color={sparkTheme.colors.brand} />
                  )}
                  {round.opponentDodged && <PopupTag label="DODGED!" color={DODGE_COLOR} />}
                  {round.opponentCrit && <PopupTag label="CRIT!" color={CRIT_COLOR} />}
                  {!round.opponentDodged && round.opponentDefenseReduction > 0 && round.damageToOpponent > 0 && (
                    <PopupTag label={`BLOCKED -${round.opponentDefenseReduction}`} color={sparkTheme.colors.textSecondary} />
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Damage summary */}
          {state.showRoundDetail && round && (
            <View style={styles.roundSummary}>
              <Text style={styles.summaryEyebrow}>EXCHANGE</Text>
              <Text style={styles.summaryText}>
                <Text style={styles.summaryName}>{state.playerCard.title.split(',')[0]}</Text> deals{' '}
                <Text style={styles.summaryDamage}>{round.damageToOpponent}</Text>
                {round.playerCrit ? <Text style={styles.summaryCrit}> · CRIT</Text> : null}
              </Text>
              <Text style={styles.summaryText}>
                <Text style={styles.summaryName}>{state.opponentCard.title.split(',')[0]}</Text> deals{' '}
                <Text style={styles.summaryDamage}>{round.damageToPlayer}</Text>
                {round.opponentCrit ? <Text style={styles.summaryCrit}> · CRIT</Text> : null}
              </Text>
              {state.phase === 'round' && (
                <Text style={styles.tapHint}>Tap for next round</Text>
              )}
            </View>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: sparkTheme.colors.bg,
  },
  safeArea: { flex: 1 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: sparkTheme.spacing[4],
  },
  loadingPill: {
    paddingHorizontal: sparkTheme.spacing[4],
    paddingVertical: sparkTheme.spacing[2],
    borderRadius: sparkTheme.radius.pill,
    backgroundColor: sparkTheme.colors.brandSoft,
    borderWidth: 1,
    borderColor: sparkTheme.colors.brandBorder,
  },
  loadingPillText: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  loadingText: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.body.fontSize,
    fontWeight: '600',
  },

  arena: {
    flex: 1,
    paddingHorizontal: sparkTheme.spacing[5],
    paddingTop: sparkTheme.spacing[5],
    paddingBottom: sparkTheme.spacing[5],
    justifyContent: 'center',
    gap: sparkTheme.spacing[6],
  },

  eyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  phaseEyebrow: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  phaseProgress: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  bannerWrap: {
    alignItems: 'center',
    gap: sparkTheme.spacing[2],
  },
  vsBanner: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 8,
  },
  roundBanner: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  resultBanner: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 6,
  },
  tapHint: {
    color: sparkTheme.colors.textDim,
    fontSize: sparkTheme.type.small.fontSize,
    fontWeight: '500',
  },

  cardsRow: {
    flexDirection: 'row',
    gap: sparkTheme.spacing[4],
    justifyContent: 'center',
  },
  cardColumn: {
    flex: 1,
    maxWidth: 200,
    alignItems: 'center',
    gap: sparkTheme.spacing[3],
  },
  cardSideLabel: {
    paddingHorizontal: sparkTheme.spacing[3],
    paddingVertical: 3,
    borderRadius: sparkTheme.radius.pill,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  cardSideLabelOpp: {
    paddingHorizontal: sparkTheme.spacing[3],
    paddingVertical: 3,
    borderRadius: sparkTheme.radius.pill,
    backgroundColor: sparkTheme.colors.brandSoft,
    borderWidth: 1,
    borderColor: sparkTheme.colors.brandBorder,
  },
  cardSideLabelText: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  cardFrame: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: sparkTheme.radius.md,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: sparkTheme.colors.bgElevated,
    ...sparkTheme.shadow.brand,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardPlaceholder: {
    flex: 1,
    backgroundColor: sparkTheme.colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: sparkTheme.colors.textMuted,
    fontSize: 36,
    fontWeight: '900',
  },
  cardName: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  popups: {
    alignItems: 'center',
    gap: 2,
    minHeight: 40,
  },

  roundSummary: {
    alignItems: 'center',
    gap: sparkTheme.spacing[2],
    paddingVertical: sparkTheme.spacing[5],
    paddingHorizontal: sparkTheme.spacing[5],
    backgroundColor: sparkTheme.colors.bgElevated,
    borderRadius: sparkTheme.radius.md,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
  },
  summaryEyebrow: {
    color: sparkTheme.colors.brand,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: sparkTheme.spacing[1],
  },
  summaryText: {
    color: sparkTheme.colors.textSecondary,
    fontSize: sparkTheme.type.small.fontSize,
    lineHeight: sparkTheme.type.small.lineHeight,
  },
  summaryName: {
    color: sparkTheme.colors.textPrimary,
    fontWeight: '700',
  },
  summaryDamage: {
    color: sparkTheme.colors.brand,
    fontWeight: '800',
  },
  summaryCrit: {
    color: CRIT_COLOR,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
