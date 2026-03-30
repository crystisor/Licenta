import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GalleryCard } from '../components/GalleryCard';
import { getEntries, removeEntry } from '../storage/historyDb';
import { theme } from '../theme';
import { HistoryEntry } from '../types';

const PAGE_SIZE = 20;

export function GalleryScreen() {
  const router = useRouter();

  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = useCallback(async () => {
    const rows = await getEntries(PAGE_SIZE, 0);
    setEntries(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries]),
  );

  const handleLoadMore = useCallback(async () => {
    if (entries.length === 0) return;
    const more = await getEntries(PAGE_SIZE, entries.length);
    if (more.length > 0) {
      setEntries((prev) => [...prev, ...more]);
    }
  }, [entries.length]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  }, [loadEntries]);

  const handleDelete = useCallback((entry: HistoryEntry) => {
    Alert.alert(
      'Delete generation?',
      `"${entry.cardMeta?.title ?? 'Untitled'}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeEntry(entry.id);
            setEntries((prev) => prev.filter((e) => e.id !== entry.id));
          },
        },
      ],
    );
  }, []);

  const renderItem = useCallback(({ item }: { item: HistoryEntry }) => (
    <GalleryCard
      entry={item}
      onPress={() => router.push(`/history/${item.id}`)}
      onLongPress={() => handleDelete(item)}
    />
  ), [router, handleDelete]);

  const keyExtractor = useCallback((item: HistoryEntry) => item.id, []);

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
          <View>
            <Text style={styles.title}>Gallery</Text>
            <Text style={styles.subtitle}>Your past generations</Text>
          </View>
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
    paddingVertical: 8,
    paddingRight: 8,
  },
  backText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.5,
    marginTop: 2,
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
