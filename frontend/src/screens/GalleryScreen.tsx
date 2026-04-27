import { useCallback, useState } from 'react';
import { Alert, FlatList, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SparkAmbient } from '../components/spark/SparkAmbient';
import { SparkBackButton } from '../components/spark/SparkBackButton';
import { SparkGalleryCard } from '../components/spark/SparkGalleryCard';
import { deleteCard, fetchGallery } from '../services/api';
import { sparkTheme } from '../theme';
import { GalleryEntry } from '../types';

const PAGE_SIZE = 20;

export function GalleryScreen() {
  const router = useRouter();

  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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
    <SparkGalleryCard
      entry={item}
      onPress={() => router.push(`/history/${item.id}`)}
      onLongPress={() => handleDelete(item)}
    />
  ), [router, handleDelete]);

  const keyExtractor = useCallback((item: GalleryEntry) => item.id, []);

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
        <View style={styles.header}>
          <SparkBackButton onPress={() => router.back()} />
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>COLLECTION</Text>
            <Text style={styles.title}>Gallery</Text>
          </View>
          <View style={styles.headerSpacer} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: sparkTheme.colors.bg,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sparkTheme.spacing[5],
    paddingTop: sparkTheme.spacing[5],
    paddingBottom: sparkTheme.spacing[6],
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
    lineHeight: sparkTheme.type.micro.lineHeight,
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
  list: {
    paddingHorizontal: sparkTheme.spacing[4],
    paddingBottom: sparkTheme.spacing[8],
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: sparkTheme.spacing[8],
    gap: sparkTheme.spacing[4],
  },
  emptyTitle: {
    color: sparkTheme.colors.textSecondary,
    fontSize: sparkTheme.type.h3.fontSize,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.small.fontSize,
    lineHeight: sparkTheme.type.small.lineHeight,
    textAlign: 'center',
  },
});
