import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GalleryCard } from '../components/GalleryCard';
import { deleteCard, fetchGallery } from '../services/api';
import { theme } from '../theme';
import { GalleryEntry } from '../types';

const PAGE_SIZE = 20;

export function GalleryScreen() {
  const router = useRouter();

  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [backHovered, setBackHovered] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const data = await fetchGallery(PAGE_SIZE, 0);
      setEntries(data.entries);
      setTotal(data.total);
    } catch (e) {
      console.warn('Failed to load gallery:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries]),
  );

  const handleLoadMore = useCallback(async () => {
    if (entries.length === 0 || entries.length >= total) return;
    try {
      const data = await fetchGallery(PAGE_SIZE, entries.length);
      if (data.entries.length > 0) {
        setEntries((prev) => [...prev, ...data.entries]);
      }
    } catch (e) {
      console.warn('Failed to load more gallery entries:', e);
    }
  }, [entries.length, total]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  }, [loadEntries]);

  const handleDelete = useCallback((entry: GalleryEntry) => {
    Alert.alert(
      'Delete generation?',
      `"${entry.card_meta?.title ?? 'Untitled'}" will be permanently removed from the server.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCard(entry.id);
              setEntries((prev) => prev.filter((e) => e.id !== entry.id));
              setTotal((prev) => prev - 1);
            } catch (e) {
              Alert.alert('Error', 'Failed to delete card. Please try again.');
            }
          },
        },
      ],
    );
  }, []);

  const renderItem = useCallback(({ item }: { item: GalleryEntry }) => (
    <GalleryCard
      entry={item}
      onPress={() => router.push(`/history/${item.id}`)}
      onLongPress={() => handleDelete(item)}
    />
  ), [router, handleDelete]);

  const keyExtractor = useCallback((item: GalleryEntry) => item.id, []);

  return (
    <LinearGradient
      colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]}
      style={styles.gradient}
    >
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            onHoverIn={() => setBackHovered(true)}
            onHoverOut={() => setBackHovered(false)}
            style={({ pressed }) => [
              styles.backButton,
              backHovered && styles.backButtonHovered,
              pressed && styles.backButtonPressed,
            ]}
          >
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Gallery</Text>
        </View>

        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No generations yet</Text>
            <Text style={styles.emptySubtitle}>
              Generated cards will appear here so you can revisit them anytime.
            </Text>
          </View>
        ) : (
          <FlatList
            data={entries}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={2}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(184, 160, 255, 0.25)',
    backgroundColor: 'rgba(184, 160, 255, 0.08)',
  },
  backButtonHovered: {
    backgroundColor: 'rgba(184, 160, 255, 0.18)',
    borderColor: theme.colors.primaryStrong,
  },
  backButtonPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: 'rgba(184, 160, 255, 0.25)',
  },
  backText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginRight: 56,
  },
  list: {
    paddingHorizontal: 10,
    paddingBottom: 32,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    color: theme.colors.textMuted,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.6,
  },
});
