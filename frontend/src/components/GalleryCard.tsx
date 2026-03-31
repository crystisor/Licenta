import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { GalleryEntry } from '../types';
import { getRarity } from '../utils/rarity';

interface GalleryCardProps {
  entry: GalleryEntry;
  onPress: () => void;
  onLongPress: () => void;
}

function formatDate(epoch: number): string {
  const d = new Date(epoch * 1000); // backend sends Unix timestamp in seconds
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function GalleryCard({ entry, onPress, onLongPress }: GalleryCardProps) {
  const title = entry.card_meta?.title ?? 'Untitled';
  const rarityInfo = entry.card_meta?.stats ? getRarity(entry.card_meta.stats) : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        rarityInfo && { borderLeftWidth: 3, borderLeftColor: rarityInfo.color },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: entry.image_url }} style={styles.image} resizeMode="cover" />
        {rarityInfo && (
          <View style={[styles.rarityBadge, { backgroundColor: rarityInfo.color }]}>
            <Text style={styles.rarityBadgeText}>{rarityInfo.rarity.toUpperCase()}</Text>
          </View>
        )}
        {entry.video_url && (
          <View style={styles.videoBadge}>
            <Text style={styles.videoBadgeText}>VIDEO</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {entry.prompt && <Text style={styles.prompt} numberOfLines={2}>{entry.prompt}</Text>}
        <Text style={styles.date}>{formatDate(entry.created_at)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.panelBorder,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: theme.colors.panel,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  rarityBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityBadgeText: {
    color: '#090B13',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  videoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(74, 248, 227, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoBadgeText: {
    color: '#090B13',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  info: {
    padding: 10,
    gap: 4,
  },
  title: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  prompt: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  date: {
    color: theme.colors.textMuted,
    fontSize: 10,
    opacity: 0.6,
    marginTop: 2,
  },
});
