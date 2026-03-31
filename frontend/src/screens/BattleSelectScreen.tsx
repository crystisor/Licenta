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

        {/* Boss preview */}
        <View style={styles.bossPreview}>
          {boss.imageAsset && (
            <Image source={boss.imageAsset} style={styles.bossImage} resizeMode="cover" />
          )}
          <View style={styles.bossPreviewLeft}>
            <Text style={styles.bossPreviewLabel}>OPPONENT</Text>
            <Text style={styles.bossPreviewName}>{boss.name}</Text>
            <View style={[styles.rarityTag, { backgroundColor: bossRarity.color }]}>
              <Text style={styles.rarityTagText}>{bossRarity.rarity} ({bossStatTotal})</Text>
            </View>
          </View>
          <View style={styles.bossStats}>
            {Object.entries(boss.stats).map(([key, val]) => (
              <View key={key} style={styles.statRow}>
                <Text style={styles.statKey}>{key.slice(0, 3)}</Text>
                <View style={styles.statBar}>
                  <View style={[styles.statFill, { width: `${(val as number) * 10}%` }]} />
                </View>
                <Text style={styles.statVal}>{String(val)}</Text>
              </View>
            ))}
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
              const rarity = getRarity(item.card_meta!.stats);
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
  bossPreview: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.panelBorder,
    gap: 14,
    alignItems: 'center',
  },
  bossImage: {
    width: 56,
    height: 75,
    borderRadius: 8,
    backgroundColor: theme.colors.panel,
  },
  bossPreviewLeft: {
    flex: 1,
    gap: 4,
  },
  bossPreviewLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  bossPreviewName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
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
  bossStats: {
    gap: 4,
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statKey: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    width: 24,
    textTransform: 'uppercase',
  },
  statBar: {
    width: 60,
    height: 4,
    backgroundColor: theme.colors.track,
    borderRadius: 2,
    overflow: 'hidden',
  },
  statFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  statVal: {
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: '700',
    width: 16,
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
