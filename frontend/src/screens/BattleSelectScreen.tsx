import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CAMPAIGN_BOSSES } from '../data/campaign';
import { fetchGallery } from '../services/api';
import { GalleryEntry } from '../types';
import { getRarity } from '../utils/rarity';
import { theme } from '../theme';

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
    <LinearGradient
      colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]}
      style={styles.gradient}
    >
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Choose Your Card</Text>
        </View>

        {/* Matchup preview row */}
        <View style={styles.matchupRow}>
          {/* Boss (left) */}
          <View style={styles.matchupCard}>
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
              <Text style={styles.cardLabel}>OPPONENT</Text>
              <Text style={styles.cardName} numberOfLines={1}>{boss.name}</Text>
              <View style={[styles.rarityTag, { backgroundColor: bossRarity.color }]}>
                <Text style={styles.rarityTagText}>{bossRarity.rarity} ({bossStatTotal})</Text>
              </View>
            </View>
          </View>

          <Text style={styles.vsText}>VS</Text>

          {/* Player card (right) */}
          <View style={styles.matchupCard}>
            {selectedCard ? (
              <>
                <View style={styles.cardSide}>
                  <Image source={{ uri: selectedCard.image_url }} style={styles.previewImage} resizeMode="cover" />
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
                  <Text style={styles.cardLabel}>YOUR CARD</Text>
                  <Text style={styles.cardName} numberOfLines={1}>{selectedCard.card_meta!.title}</Text>
                  <View style={[styles.rarityTag, { backgroundColor: selectedRarity!.color }]}>
                    <Text style={styles.rarityTagText}>{selectedRarity!.rarity} ({selectedStatTotal})</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptySlot}>
                <Text style={styles.emptySlotText}>Select a card below</Text>
              </View>
            )}
          </View>
        </View>

        {cards.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No cards with stats available.</Text>
            <Text style={styles.emptySubtext}>Generate some cards first!</Text>
          </View>
        ) : (
          <FlatList
            data={cards}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedId;
              const rarity = getRarity(item.card_meta!.stats, item.card_meta!.creativity);
              return (
                <Pressable
                  onPress={() => setSelectedId(item.id)}
                  style={[
                    styles.cardItem,
                    isSelected && { borderColor: theme.colors.accent, borderWidth: 2 },
                  ]}
                >
                  <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
                  <View style={[styles.cardRarity, { backgroundColor: rarity.color }]}>
                    <Text style={styles.cardRarityText}>{rarity.rarity[0]}</Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.card_meta!.title}
                  </Text>
                </Pressable>
              );
            }}
          />
        )}

        <View style={styles.footer}>
          <Pressable
            onPress={handleFight}
            disabled={!selectedId}
            style={[styles.fightButton, !selectedId && styles.fightButtonDisabled]}
          >
            <Text style={styles.fightButtonText}>Fight!</Text>
          </Pressable>
        </View>
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
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginRight: 56,
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  matchupCard: {
    flex: 1,
    padding: 10,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.panelBorder,
    gap: 8,
  },
  cardSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewImage: {
    width: 50,
    height: 67,
    borderRadius: 8,
    backgroundColor: theme.colors.panel,
  },
  sideStats: {
    gap: 2,
    justifyContent: 'center',
  },
  cardInfo: {
    gap: 3,
  },
  cardLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  cardName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  vsText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '800',
    opacity: 0.5,
  },
  rarityTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityTagText: {
    color: '#090B13',
    fontSize: 9,
    fontWeight: '800',
  },
  emptySlot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptySlotText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    opacity: 0.6,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statKey: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    width: 24,
    textTransform: 'uppercase',
  },
  statVal: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    width: 18,
    textAlign: 'right',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtext: {
    color: theme.colors.textMuted,
    fontSize: 13,
    opacity: 0.6,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 4,
  },
  cardItem: {
    flex: 1,
    margin: 4,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.panelBorder,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: theme.colors.panel,
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
    color: '#090B13',
    fontSize: 9,
    fontWeight: '800',
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: '600',
    padding: 6,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fightButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
  },
  fightButtonDisabled: {
    opacity: 0.35,
  },
  fightButtonText: {
    color: '#090B13',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
