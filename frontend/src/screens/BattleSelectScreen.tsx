import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { CAMPAIGN_BOSSES } from '../data/campaign';
import { fetchGallery } from '../services/api';
import { GalleryEntry } from '../types';
import { getRarity } from '../utils/rarity';
import { sparkTheme } from '../theme';
import { SparkAmbient } from '../components/spark/SparkAmbient';
import { SparkBackButton } from '../components/spark/SparkBackButton';
import { useSparkLift, useSparkPress } from '../components/spark/sparkPress';

export function BattleSelectScreen() {
  const router = useRouter();
  const { bossIndex, mode } = useLocalSearchParams<{ bossIndex: string; mode: string }>();
  const boss = CAMPAIGN_BOSSES[Number(bossIndex)];

  const [cards, setCards] = useState<GalleryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchGallery(100, 0)
        .then((data) => setCards(data.entries.filter((e) => e.card_meta?.stats)))
        .catch(() => {});
    }, []),
  );

  const handleFight = () => {
    if (!selectedId) return;
    router.push({
      pathname: '/battle-arena',
      params: { bossIndex: bossIndex!, mode: mode!, cardId: selectedId },
    });
  };

  const bossRarity = getRarity(boss.stats);
  const bossStatTotal = Object.values(boss.stats).reduce((s, v) => s + v, 0);
  const selectedCard = cards.find((c) => c.id === selectedId);
  const selectedRarity = selectedCard
    ? getRarity(selectedCard.card_meta!.stats, selectedCard.card_meta!.creativity)
    : null;
  const selectedStatTotal = selectedCard
    ? Object.values(selectedCard.card_meta!.stats).reduce((s, v) => s + v, 0)
    : 0;

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
          <SparkBackButton
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/battle');
            }}
          />
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>{mode === 'quick' ? 'QUICK BATTLE' : 'CAMPAIGN'}</Text>
            <Text style={styles.title}>Choose Your Card</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Matchup preview row */}
        <View style={styles.matchupRow}>
          {/* Opponent (left) */}
          <View style={[styles.matchupCard, { borderColor: bossRarity.color }]}>
            <View style={styles.cardSide}>
              {boss.imageAsset && (
                <Image source={boss.imageAsset} style={styles.previewImage} resizeMode="cover" />
              )}
              <View style={styles.sideStats}>
                {Object.entries(boss.stats).map(([key, val]) => (
                  <View key={key} style={styles.statRow}>
                    <Text style={styles.statKey}>{key.slice(0, 3)}</Text>
                    <Text style={styles.statVal}>{String(val)}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabelOpponent}>OPPONENT</Text>
              <Text style={styles.cardName} numberOfLines={1}>{boss.name}</Text>
              <View style={[styles.rarityTag, { backgroundColor: bossRarity.color }]}>
                <Text style={styles.rarityTagText}>{bossRarity.rarity.toUpperCase()} · Σ {bossStatTotal}</Text>
              </View>
            </View>
          </View>

          <View style={styles.vsPill}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Player card (right) */}
          <View
            style={[
              styles.matchupCard,
              {
                borderColor: selectedRarity ? selectedRarity.color : sparkTheme.colors.border,
                borderStyle: selectedCard ? 'solid' : 'dashed',
              },
            ]}
          >
            {selectedCard ? (
              <>
                <View style={styles.cardSide}>
                  <Image
                    source={{ uri: selectedCard.image_url }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <View style={styles.sideStats}>
                    {Object.entries(selectedCard.card_meta!.stats).map(([key, val]) => (
                      <View key={key} style={styles.statRow}>
                        <Text style={styles.statKey}>{key.slice(0, 3)}</Text>
                        <Text style={styles.statVal}>{String(val)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardLabelPlayer}>YOUR CARD</Text>
                  <Text style={styles.cardName} numberOfLines={1}>{selectedCard.card_meta!.title}</Text>
                  <View style={[styles.rarityTag, { backgroundColor: selectedRarity!.color }]}>
                    <Text style={styles.rarityTagText}>
                      {selectedRarity!.rarity.toUpperCase()} · Σ {selectedStatTotal}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptySlot}>
                <Text style={styles.emptySlotEyebrow}>EMPTY SLOT</Text>
                <Text style={styles.emptySlotText}>Pick a card from the roster below</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.rosterHeader}>
          <Text style={styles.rosterEyebrow}>ROSTER</Text>
          <Text style={styles.rosterCount}>{cards.length} card{cards.length === 1 ? '' : 's'}</Text>
        </View>

        {cards.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No cards with stats yet</Text>
            <Text style={styles.emptySubtext}>Generate cards to build your fighting roster.</Text>
          </View>
        ) : (
          <FlatList
            data={cards}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <RosterCard
                entry={item}
                isSelected={item.id === selectedId}
                onPress={() => setSelectedId(item.id)}
              />
            )}
          />
        )}

        <View style={styles.footer}>
          <FightButton disabled={!selectedId} onPress={handleFight} />
        </View>
      </SafeAreaView>
    </View>
  );
}

interface RosterCardProps {
  entry: GalleryEntry;
  isSelected: boolean;
  onPress: () => void;
}

function RosterCard({ entry, isSelected, onPress }: RosterCardProps) {
  const { animatedStyle, onPressIn, onPressOut } = useSparkLift(3);
  const rarity = getRarity(entry.card_meta!.stats, entry.card_meta!.creativity);
  const statTotal = Object.values(entry.card_meta!.stats).reduce((s, v) => s + v, 0);

  return (
    <Animated.View style={[styles.cardItemOuter, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.cardItem,
          isSelected && {
            borderColor: sparkTheme.colors.brand,
            borderWidth: 2,
          },
        ]}
      >
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: entry.image_url }} style={styles.cardImage} resizeMode="cover" />
          <View style={[styles.cardRarity, { backgroundColor: rarity.color }]}>
            <Text style={styles.cardRarityText}>{rarity.rarity[0]}</Text>
          </View>
          {isSelected && (
            <View style={styles.selectedCheck}>
              <Text style={styles.selectedCheckText}>✓</Text>
            </View>
          )}
        </View>
        <View style={styles.cardItemFooter}>
          <Text style={styles.cardTitle} numberOfLines={1}>{entry.card_meta!.title}</Text>
          <Text style={styles.cardStatTotal}>Σ {statTotal}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function FightButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = useSparkPress(0.97);
  return (
    <Animated.View style={disabled ? null : animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={disabled ? undefined : onPressIn}
        onPressOut={disabled ? undefined : onPressOut}
        style={({ pressed }) => [
          styles.fightButton,
          disabled && styles.fightButtonDisabled,
          pressed && !disabled && { backgroundColor: sparkTheme.colors.brandHover },
        ]}
      >
        <Text style={styles.fightButtonText}>{disabled ? 'Select a Card' : 'Fight'}</Text>
        {!disabled && <Text style={styles.fightButtonArrow}>→</Text>}
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
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },

  // Matchup
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: sparkTheme.spacing[5],
    marginBottom: sparkTheme.spacing[5],
    gap: sparkTheme.spacing[3],
  },
  matchupCard: {
    flex: 1,
    padding: sparkTheme.spacing[4],
    backgroundColor: sparkTheme.colors.bgElevated,
    borderRadius: sparkTheme.radius.md,
    borderWidth: 1,
    gap: sparkTheme.spacing[3],
  },
  cardSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sparkTheme.spacing[3],
  },
  previewImage: {
    width: 50,
    height: 67,
    borderRadius: sparkTheme.radius.sm,
    backgroundColor: sparkTheme.colors.bg,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
  },
  sideStats: {
    gap: 2,
    justifyContent: 'center',
  },
  cardInfo: {
    gap: sparkTheme.spacing[1],
  },
  cardLabelOpponent: {
    color: sparkTheme.colors.brand,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  cardLabelPlayer: {
    color: '#22c55e',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  cardName: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  vsPill: {
    alignSelf: 'center',
    paddingHorizontal: sparkTheme.spacing[3],
    paddingVertical: sparkTheme.spacing[2],
    borderRadius: sparkTheme.radius.pill,
    backgroundColor: sparkTheme.colors.brandSoft,
    borderWidth: 1,
    borderColor: sparkTheme.colors.brandBorder,
  },
  vsText: {
    color: sparkTheme.colors.brand,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  rarityTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: sparkTheme.spacing[2],
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityTagText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  emptySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sparkTheme.spacing[6],
    gap: sparkTheme.spacing[2],
  },
  emptySlotEyebrow: {
    color: sparkTheme.colors.textDim,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  emptySlotText: {
    color: sparkTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statKey: {
    color: sparkTheme.colors.textDim,
    fontSize: 9,
    fontWeight: '700',
    width: 24,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statVal: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    width: 18,
    textAlign: 'right',
  },

  // Roster header
  rosterHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: sparkTheme.spacing[5],
    marginBottom: sparkTheme.spacing[3],
  },
  rosterEyebrow: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  rosterCount: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Empty roster
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: sparkTheme.spacing[3],
    paddingHorizontal: sparkTheme.spacing[7],
  },
  emptyText: {
    color: sparkTheme.colors.textSecondary,
    fontSize: sparkTheme.type.h3.fontSize,
    fontWeight: '700',
  },
  emptySubtext: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.small.fontSize,
    textAlign: 'center',
  },

  // List
  list: {
    paddingHorizontal: sparkTheme.spacing[3],
    paddingBottom: sparkTheme.spacing[5],
  },
  cardItemOuter: {
    flex: 1,
    margin: sparkTheme.spacing[2],
  },
  cardItem: {
    flex: 1,
    backgroundColor: sparkTheme.colors.bgElevated,
    borderRadius: sparkTheme.radius.sm,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    overflow: 'hidden',
  },
  cardImageWrap: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: sparkTheme.colors.bg,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardRarity: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRarityText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
  },
  selectedCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: sparkTheme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...sparkTheme.shadow.brand,
  },
  selectedCheckText: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
  },
  cardItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sparkTheme.spacing[3],
    paddingVertical: sparkTheme.spacing[2],
    gap: sparkTheme.spacing[2],
  },
  cardTitle: {
    flex: 1,
    color: sparkTheme.colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  cardStatTotal: {
    color: sparkTheme.colors.brand,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    paddingHorizontal: sparkTheme.spacing[5],
    paddingVertical: sparkTheme.spacing[5],
  },
  fightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sparkTheme.spacing[3],
    minHeight: 56,
    borderRadius: sparkTheme.radius.md,
    backgroundColor: sparkTheme.colors.brand,
    ...sparkTheme.shadow.brand,
  },
  fightButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  fightButtonText: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  fightButtonArrow: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
});
