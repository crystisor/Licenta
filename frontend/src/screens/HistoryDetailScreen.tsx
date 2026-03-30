import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { getEntry } from '../storage/historyDb';
import { ResultScreen } from './ResultScreen';
import { theme } from '../theme';
import { GeneratedImage, HistoryEntry } from '../types';

export function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [entry, setEntry] = useState<HistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getEntry(id).then((row) => {
      setEntry(row);
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
    prompt: entry.prompt,
    imageUrl: entry.imageUri,
    requestId: entry.id,
    cardMeta: entry.cardMeta,
  };

  return (
    <ResultScreen
      result={result}
      onReset={handleBack}
      onAnimate={handleAnimateNoop}
      videoUrl={entry.videoUri}
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
