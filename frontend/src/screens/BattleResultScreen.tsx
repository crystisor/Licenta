import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CAMPAIGN_BOSSES } from '../data/campaign';
import { addTokens } from '../storage/generationCurrency';
import { advanceBoss } from '../storage/campaignProgress';
import { theme } from '../theme';

export function BattleResultScreen() {
  const router = useRouter();
  const { winner, tokensEarned, bossIndex, mode, cardId, bossName } = useLocalSearchParams<{
    winner: string;
    tokensEarned: string;
    bossIndex: string;
    mode: string;
    cardId: string;
    bossName: string;
  }>();

  const [processed, setProcessed] = useState(false);
  const isWin = winner === 'player';
  const tokens = Number(tokensEarned);
  const bossIdx = Number(bossIndex);
  const isCampaign = mode === 'campaign';
  const isLastBoss = bossIdx === CAMPAIGN_BOSSES.length - 1;

  // Process rewards once
  useEffect(() => {
    if (processed) return;
    setProcessed(true);

    (async () => {
      if (isWin) {
        if (tokens > 0) await addTokens(tokens);
        if (isCampaign) await advanceBoss(CAMPAIGN_BOSSES.length);
      }
    })();
  }, [processed, isWin, tokens, isCampaign]);

  const handleRetry = useCallback(() => {
    router.replace({
      pathname: '/battle-select',
      params: { bossIndex: bossIndex!, mode: mode! },
    });
  }, [router, bossIndex, mode]);

  const handleNextBoss = useCallback(() => {
    if (isLastBoss) {
      router.replace('/battle');
      return;
    }
    router.replace({
      pathname: '/battle-select',
      params: { bossIndex: String(bossIdx + 1), mode: 'campaign' },
    });
  }, [router, bossIdx, isLastBoss]);

  const handleBackToHub = useCallback(() => {
    router.replace('/battle');
  }, [router]);

  return (
    <LinearGradient
      colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]}
      style={styles.gradient}
    >
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.content}>
          {/* Result icon */}
          <View style={[styles.iconCircle, { borderColor: isWin ? theme.colors.success : theme.colors.danger }]}>
            <Text style={[styles.iconText, { color: isWin ? theme.colors.success : theme.colors.danger }]}>
              {isWin ? '\u2713' : '\u2717'}
            </Text>
          </View>

          <Text style={[
            styles.resultTitle,
            { color: isWin ? theme.colors.success : winner === 'draw' ? theme.colors.textMuted : theme.colors.danger },
          ]}>
            {isWin ? 'Victory!' : winner === 'draw' ? 'Draw' : 'Defeat'}
          </Text>

          <Text style={styles.bossName}>vs {bossName}</Text>

          {isWin && tokens > 0 && (
            <View style={styles.rewardCard}>
              <Text style={styles.rewardLabel}>Tokens Earned</Text>
              <Text style={styles.rewardValue}>+{tokens}</Text>
            </View>
          )}

          {isWin && isCampaign && isLastBoss && (
            <View style={styles.specialBanner}>
              <Text style={styles.specialText}>Campaign Complete!</Text>
              <Text style={styles.specialSubtext}>You have defeated all bosses</Text>
            </View>
          )}

          {!isWin && (
            <Text style={styles.defeatSubtext}>
              No penalty — try again with the same or a different card!
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {!isWin && (
              <Pressable onPress={handleRetry} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Retry</Text>
              </Pressable>
            )}

            {isWin && isCampaign && !isLastBoss && (
              <Pressable onPress={handleNextBoss} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Next Boss</Text>
              </Pressable>
            )}

            {isWin && !isCampaign && (
              <Pressable onPress={handleRetry} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Battle Again</Text>
              </Pressable>
            )}

            <Pressable onPress={handleBackToHub} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Back to Battle Hub</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  iconText: {
    fontSize: 36,
    fontWeight: '900',
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  bossName: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  rewardCard: {
    backgroundColor: 'rgba(74, 248, 227, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74, 248, 227, 0.3)',
    borderRadius: theme.radius.md,
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  rewardLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rewardValue: {
    color: theme.colors.accent,
    fontSize: 28,
    fontWeight: '900',
  },
  specialBanner: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  specialText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  specialSubtext: {
    color: 'rgba(255, 215, 0, 0.6)',
    fontSize: 12,
  },
  defeatSubtext: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryStrong,
  },
  primaryButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(184, 160, 255, 0.3)',
    backgroundColor: 'rgba(184, 160, 255, 0.08)',
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
