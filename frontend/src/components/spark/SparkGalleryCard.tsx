import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { sparkTheme } from '../../theme';
import { GalleryEntry } from '../../types';
import { getRarity } from '../../utils/rarity';
import { useSparkLift } from './sparkPress';

interface SparkGalleryCardProps {
  entry: GalleryEntry;
  onPress: () => void;
  onLongPress: () => void;
}

function formatDate(epoch: number): string {
  const d = new Date(epoch * 1000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function SparkGalleryCard({ entry, onPress, onLongPress }: SparkGalleryCardProps) {
  const { animatedStyle, onPressIn, onPressOut } = useSparkLift(4);
  const [hovered, setHovered] = useState(false);

  const title = entry.card_meta?.title ?? 'Untitled';
  const rarityInfo = entry.card_meta?.stats
    ? getRarity(entry.card_meta.stats, entry.card_meta.creativity)
    : null;

  return (
    <Animated.View style={[styles.outer, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[
          styles.card,
          hovered && { borderColor: sparkTheme.colors.brandBorder },
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
          {entry.prompt && (
            <Text style={styles.prompt} numberOfLines={2}>{entry.prompt}</Text>
          )}
          <Text style={styles.date}>{formatDate(entry.created_at)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    margin: sparkTheme.spacing[2],
  },
  card: {
    flex: 1,
    backgroundColor: sparkTheme.colors.bgElevated,
    borderRadius: sparkTheme.radius.md,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: sparkTheme.colors.bg,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  rarityBadge: {
    position: 'absolute',
    top: sparkTheme.spacing[2],
    left: sparkTheme.spacing[2],
    paddingHorizontal: sparkTheme.spacing[2],
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  videoBadge: {
    position: 'absolute',
    top: sparkTheme.spacing[2],
    right: sparkTheme.spacing[2],
    backgroundColor: sparkTheme.colors.brand,
    paddingHorizontal: sparkTheme.spacing[2],
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoBadgeText: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  info: {
    padding: sparkTheme.spacing[4],
    gap: sparkTheme.spacing[1],
  },
  title: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  prompt: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.micro.fontSize,
    lineHeight: sparkTheme.type.micro.lineHeight,
  },
  date: {
    color: sparkTheme.colors.textDim,
    fontSize: 10,
    marginTop: 2,
  },
});
