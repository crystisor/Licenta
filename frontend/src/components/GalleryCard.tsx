import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { HistoryEntry } from '../types';

interface GalleryCardProps {
  entry: HistoryEntry;
  onPress: () => void;
  onLongPress: () => void;
}

function formatDate(epoch: number): string {
  const d = new Date(epoch);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function GalleryCard({ entry, onPress, onLongPress }: GalleryCardProps) {
  const title = entry.cardMeta?.title ?? 'Untitled';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: entry.thumbnailUri }} style={styles.image} resizeMode="cover" />
        {entry.videoUri && (
          <View style={styles.videoBadge}>
            <Text style={styles.videoBadgeText}>VIDEO</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.prompt} numberOfLines={2}>{entry.prompt}</Text>
        <Text style={styles.date}>{formatDate(entry.createdAt)}</Text>
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
