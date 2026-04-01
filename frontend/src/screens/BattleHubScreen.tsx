import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CAMPAIGN_BOSSES } from '../data/campaign';
import { getCampaignProgress } from '../storage/campaignProgress';
import { CampaignProgress } from '../types/battle';
import { getRarity } from '../utils/rarity';
import { theme } from '../theme';

export function BattleHubScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<CampaignProgress>({ currentBoss: 0, completedAt: null });

  useFocusEffect(
    useCallback(() => {
      getCampaignProgress().then(setProgress);
    }, []),
  );

  const handleBossPress = (index: number) => {
    const isUnlocked = index <= progress.currentBoss || progress.completedAt !== null;
    if (!isUnlocked) return;

    router.push({
      pathname: '/battle-select',
      params: { bossIndex: String(index), mode: 'campaign' },
    });
  };

  const handleQuickBattle = () => {
    // Pick a random unlocked boss
    const maxIndex = progress.completedAt
      ? CAMPAIGN_BOSSES.length - 1
      : Math.max(0, progress.currentBoss);
    const randomIndex = Math.floor(Math.random() * (maxIndex + 1));
    router.push({
      pathname: '/battle-select',
      params: { bossIndex: String(randomIndex), mode: 'quick' },
    });
  };

  return (
    <LinearGradient
      colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]}
      style={styles.gradient}
    >
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Battle</Text>
        </View>

        {progress.completedAt && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>Campaign Complete!</Text>
          </View>
        )}

        <Pressable onPress={handleQuickBattle} style={styles.quickBattleButton}>
          <Text style={styles.quickBattleText}>Quick Battle</Text>
          <Text style={styles.quickBattleSubtext}>Random opponent — 1 token reward</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Campaign</Text>

        <FlatList
          data={CAMPAIGN_BOSSES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const isUnlocked = index <= progress.currentBoss || progress.completedAt !== null;
            const isCurrent = index === progress.currentBoss && !progress.completedAt;
            const isBeaten = index < progress.currentBoss || progress.completedAt !== null;
            const rarityInfo = getRarity(item.stats);
            const statTotal = Object.values(item.stats).reduce((s, v) => s + v, 0);

            return (
              <Pressable
                onPress={() => handleBossPress(index)}
                disabled={!isUnlocked}
                style={[
                  styles.bossCard,
                  isCurrent && { borderColor: theme.colors.accent },
                  !isUnlocked && styles.bossLocked,
                ]}
              >
                <View style={styles.bossLeft}>
                  {isUnlocked && item.imageAsset ? (
                    <Image source={item.imageAsset} style={styles.bossThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.bossNumber, isBeaten && styles.bossNumberBeaten]}>
                      <Text style={styles.bossNumberText}>{isBeaten ? '\u2713' : index + 1}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.bossInfo}>
                  <Text style={[styles.bossName, !isUnlocked && styles.textLocked]}>
                    {isUnlocked ? item.name : '???'}
                  </Text>
                  {isUnlocked && (
                    <>
                      <Text style={styles.bossLore} numberOfLines={2}>{item.lore}</Text>
                      <View style={styles.bossTagRow}>
                        <View style={[styles.rarityTag, { backgroundColor: rarityInfo.color }]}>
                          <Text style={styles.rarityTagText}>{rarityInfo.rarity}</Text>
                        </View>
                        <Text style={styles.statTotalText}>Total: {statTotal}</Text>
                        <Text style={styles.rewardText}>+{item.tokenReward} token{item.tokenReward > 1 ? 's' : ''}</Text>
                      </View>
                    </>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(184, 160, 255, 0.25)',
    backgroundColor: 'rgba(184, 160, 255, 0.08)',
  },
  backText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginRight: 56,
  },
  completedBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    alignItems: 'center',
  },
  completedText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  quickBattleButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryStrong,
    alignItems: 'center',
    gap: 4,
  },
  quickBattleText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  quickBattleSubtext: {
    color: 'rgba(246, 244, 255, 0.6)',
    fontSize: 11,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 10,
  },
  bossCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.panelBorder,
    padding: 14,
    gap: 14,
  },
  bossLocked: {
    opacity: 0.4,
  },
  bossLeft: {
    justifyContent: 'flex-start',
  },
  bossThumb: {
    width: 48,
    height: 64,
    borderRadius: 8,
    backgroundColor: theme.colors.panel,
  },
  bossNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(184, 160, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossNumberBeaten: {
    backgroundColor: 'rgba(115, 240, 205, 0.2)',
  },
  bossNumberText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  bossInfo: {
    flex: 1,
    gap: 4,
  },
  bossName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  textLocked: {
    color: theme.colors.textMuted,
  },
  bossLore: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  bossTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  rarityTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityTagText: {
    color: '#090B13',
    fontSize: 9,
    fontWeight: '800',
  },
  statTotalText: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  rewardText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '600',
  },
});
