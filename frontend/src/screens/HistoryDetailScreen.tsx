import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { fetchCard } from '../services/api';
import { ResultScreen } from './ResultScreen';
import { theme } from '../theme';
import { GalleryEntry, GeneratedImage } from '../types';

export function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [entry, setEntry] = useState<GalleryEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchCard(id)
      .then((card) => {
        setEntry(card);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [id]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleAnimateNoop = useCallback(() => {}, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!entry) {
    router.replace('/gallery');
    return null;
  }

  const result: GeneratedImage = {
    prompt: entry.prompt ?? '',
    imageUrl: entry.image_url,
    requestId: entry.id,
    cardMeta: entry.card_meta,
  };

  return (
    <ResultScreen
      result={result}
      onReset={handleBack}
      onAnimate={handleAnimateNoop}
      videoUrl={entry.video_url}
      fromHistory
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundTop,
  },
});
