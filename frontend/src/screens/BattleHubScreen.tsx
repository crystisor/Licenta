import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { CAMPAIGN_BOSSES } from '../data/campaign';
import { getCampaignProgress } from '../storage/campaignProgress';
import { CampaignProgress } from '../types/battle';
import { getRarity } from '../utils/rarity';
import { sparkTheme } from '../theme';
import { SparkAmbient } from '../components/spark/SparkAmbient';
import { SparkBackButton } from '../components/spark/SparkBackButton';
import { useSparkLift, useSparkPress } from '../components/spark/sparkPress';

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
        <View style={styles.headerRow}>
          <SparkBackButton onPress={() => router.back()} />
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>ARENA</Text>
            <Text style={styles.title}>Battle</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {progress.completedAt && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>★ Campaign Complete ★</Text>
            <Text style={styles.completedSubtext}>
              All twelve adversaries have fallen. Quick Battle unlocked across the full roster.
            </Text>
          </View>
        )}

        <QuickBattleButton onPress={handleQuickBattle} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>CAMPAIGN</Text>
          <Text style={styles.sectionMeta}>
            {progress.completedAt
              ? `${CAMPAIGN_BOSSES.length}/${CAMPAIGN_BOSSES.length}`
              : `${progress.currentBoss}/${CAMPAIGN_BOSSES.length}`}
          </Text>
        </View>

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
              <BossCard
                onPress={() => handleBossPress(index)}
                disabled={!isUnlocked}
                isCurrent={isCurrent}
                isUnlocked={isUnlocked}
                isBeaten={isBeaten}
                index={index}
                name={item.name}
                lore={item.lore}
                imageAsset={item.imageAsset}
                rarity={rarityInfo.rarity}
                rarityColor={rarityInfo.color}
                statTotal={statTotal}
                tokenReward={item.tokenReward}
              />
            );
          }}
        />
      </SafeAreaView>
    </View>
  );
}

function QuickBattleButton({ onPress }: { onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = useSparkPress(0.97);
  return (
    <Animated.View style={[styles.quickBattleWrap, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.quickBattleButton,
          pressed && { backgroundColor: sparkTheme.colors.brandHover },
        ]}
      >
        <View style={styles.quickBattleLeft}>
          <Text style={styles.quickBattleEyebrow}>RANDOM ENCOUNTER</Text>
          <Text style={styles.quickBattleText}>Quick Battle</Text>
          <Text style={styles.quickBattleSubtext}>
            Random opponent from your unlocked roster — earn 1 token on victory.
          </Text>
        </View>
        <Text style={styles.quickBattleArrow}>→</Text>
      </Pressable>
    </Animated.View>
  );
}

interface BossCardProps {
  onPress: () => void;
  disabled: boolean;
  isCurrent: boolean;
  isUnlocked: boolean;
  isBeaten: boolean;
  index: number;
  name: string;
  lore: string;
  imageAsset?: any;
  rarity: string;
  rarityColor: string;
  statTotal: number;
  tokenReward: number;
}

function BossCard({
  onPress,
  disabled,
  isCurrent,
  isUnlocked,
  isBeaten,
  index,
  name,
  lore,
  imageAsset,
  rarity,
  rarityColor,
  statTotal,
  tokenReward,
}: BossCardProps) {
  const { animatedStyle, onPressIn, onPressOut } = useSparkLift(3);

  return (
    <Animated.View style={[disabled ? null : animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={disabled ? undefined : onPressIn}
        onPressOut={disabled ? undefined : onPressOut}
        disabled={disabled}
        style={[
          styles.bossCard,
          isCurrent && { borderColor: sparkTheme.colors.brand, borderWidth: 2 },
          !isUnlocked && styles.bossLocked,
        ]}
      >
        <View style={styles.bossLeft}>
          {isUnlocked && imageAsset ? (
            <Image source={imageAsset} style={styles.bossThumb} resizeMode="cover" />
          ) : (
            <View style={[styles.bossNumber, isBeaten && styles.bossNumberBeaten]}>
              <Text
                style={[
                  styles.bossNumberText,
                  isBeaten && { color: sparkTheme.colors.brand },
                ]}
              >
                {isBeaten ? '✓' : index + 1}
              </Text>
            </View>
          )}
          {isCurrent && (
            <View style={styles.currentDot}>
              <Text style={styles.currentDotText}>NEXT</Text>
            </View>
          )}
        </View>

        <View style={styles.bossInfo}>
          <Text style={[styles.bossName, !isUnlocked && styles.textLocked]} numberOfLines={1}>
            {isUnlocked ? name : '? ? ?'}
          </Text>
          {isUnlocked ? (
            <>
              <Text style={styles.bossLore} numberOfLines={2}>{lore}</Text>
              <View style={styles.bossTagRow}>
                <View style={[styles.rarityTag, { backgroundColor: rarityColor }]}>
                  <Text style={styles.rarityTagText}>{rarity.toUpperCase()}</Text>
                </View>
                <Text style={styles.statTotalText}>Σ {statTotal}</Text>
                <Text style={styles.rewardText}>+{tokenReward} token{tokenReward > 1 ? 's' : ''}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.bossLore}>Defeat the previous opponent to reveal this fight.</Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: sparkTheme.colors.bg,
  },
  safeArea: { flex: 1 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sparkTheme.spacing[5],
    paddingTop: sparkTheme.spacing[5],
    paddingBottom: sparkTheme.spacing[5],
    gap: sparkTheme.spacing[5],
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: sparkTheme.spacing[1],
  },
  headerSpacer: {
    width: 88,
  },
  eyebrow: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },

  completedBanner: {
    marginHorizontal: sparkTheme.spacing[5],
    marginBottom: sparkTheme.spacing[5],
    paddingHorizontal: sparkTheme.spacing[5],
    paddingVertical: sparkTheme.spacing[4],
    borderRadius: sparkTheme.radius.md,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    alignItems: 'center',
    gap: sparkTheme.spacing[1],
  },
  completedText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  completedSubtext: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.small.fontSize,
    lineHeight: sparkTheme.type.small.lineHeight,
    textAlign: 'center',
  },

  // Quick Battle
  quickBattleWrap: {
    marginHorizontal: sparkTheme.spacing[5],
    marginBottom: sparkTheme.spacing[6],
  },
  quickBattleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sparkTheme.spacing[6],
    paddingVertical: sparkTheme.spacing[6],
    borderRadius: sparkTheme.radius.lg,
    backgroundColor: sparkTheme.colors.brand,
    gap: sparkTheme.spacing[5],
    ...sparkTheme.shadow.brand,
  },
  quickBattleLeft: {
    flex: 1,
    gap: sparkTheme.spacing[1],
  },
  quickBattleEyebrow: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  quickBattleText: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quickBattleSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: sparkTheme.type.small.fontSize,
    lineHeight: sparkTheme.type.small.lineHeight,
  },
  quickBattleArrow: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: sparkTheme.spacing[5],
    marginBottom: sparkTheme.spacing[4],
  },
  sectionEyebrow: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionMeta: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  list: {
    paddingHorizontal: sparkTheme.spacing[5],
    paddingBottom: sparkTheme.spacing[8],
    gap: sparkTheme.spacing[3],
  },

  bossCard: {
    flexDirection: 'row',
    backgroundColor: sparkTheme.colors.bgElevated,
    borderRadius: sparkTheme.radius.md,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    padding: sparkTheme.spacing[4],
    gap: sparkTheme.spacing[5],
  },
  bossLocked: {
    opacity: 0.45,
  },
  bossLeft: {
    alignItems: 'center',
    gap: sparkTheme.spacing[2],
  },
  bossThumb: {
    width: 56,
    height: 76,
    borderRadius: sparkTheme.radius.sm,
    backgroundColor: sparkTheme.colors.bg,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
  },
  bossNumber: {
    width: 56,
    height: 76,
    borderRadius: sparkTheme.radius.sm,
    backgroundColor: sparkTheme.colors.bg,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossNumberBeaten: {
    backgroundColor: sparkTheme.colors.brandSoft,
    borderColor: sparkTheme.colors.brandBorder,
  },
  bossNumberText: {
    color: sparkTheme.colors.textMuted,
    fontSize: 18,
    fontWeight: '800',
  },
  currentDot: {
    paddingHorizontal: sparkTheme.spacing[2],
    paddingVertical: 2,
    borderRadius: sparkTheme.radius.pill,
    backgroundColor: sparkTheme.colors.brand,
  },
  currentDotText: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  bossInfo: {
    flex: 1,
    gap: sparkTheme.spacing[1],
  },
  bossName: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  textLocked: {
    color: sparkTheme.colors.textDim,
    letterSpacing: 2,
  },
  bossLore: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.micro.fontSize,
    lineHeight: sparkTheme.type.micro.lineHeight,
  },
  bossTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sparkTheme.spacing[3],
    marginTop: sparkTheme.spacing[2],
    flexWrap: 'wrap',
  },
  rarityTag: {
    paddingHorizontal: sparkTheme.spacing[2],
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityTagText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statTotalText: {
    color: sparkTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  rewardText: {
    color: sparkTheme.colors.brand,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
