import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { sparkTheme } from '../../theme';
import { fetchGallery } from '../../services/api';
import { GalleryEntry } from '../../types';

const RANDOM_COUNT = 7;
const POOL_LIMIT = 50;

function pickRandomN<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

const CARD_WIDTH = 200;
const CARD_HEIGHT = 260;
const CARD_GAP = sparkTheme.spacing[5]; // 16
const SCROLL_PX_PER_SEC = 50;
const FADE_WIDTH = 80;

export function SparkRecentCarousel() {
  const router = useRouter();
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);

  const tx = useSharedValue(0);

  useEffect(() => {
    let mounted = true;
    fetchGallery(POOL_LIMIT, 0)
      .then((res) => {
        if (!mounted) return;
        const withImage = res.entries.filter((e) => e.image_url);
        setEntries(pickRandomN(withImage, RANDOM_COUNT));
      })
      .catch((err) => {
        console.warn('SparkRecentCarousel: failed to fetch gallery', err);
      });
    AccessibilityInfo.isReduceMotionEnabled().then((flag) => {
      if (mounted) setReduceMotion(flag);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  // Width of one full cycle (the un-doubled list).
  const cycleWidth = entries.length * (CARD_WIDTH + CARD_GAP);

  useEffect(() => {
    cancelAnimation(tx);
    tx.value = 0;
    if (reduceMotion || entries.length === 0) return;

    const duration = (cycleWidth / SCROLL_PX_PER_SEC) * 1000;
    tx.value = withRepeat(
      withTiming(-cycleWidth, { duration, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(tx);
    };
  }, [tx, cycleWidth, reduceMotion, entries.length]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  if (entries.length === 0) return null;

  const doubled = [...entries, ...entries];

  return (
    <View style={styles.section}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.heading}>Recent Generations</Text>
          <Pressable onPress={() => router.push('/gallery')} hitSlop={8}>
            <Text style={styles.viewAll}>View full gallery →</Text>
          </Pressable>
        </View>

        <View style={styles.viewport}>
          <Animated.View style={[styles.track, trackStyle]}>
            {doubled.map((entry, idx) => (
              <CarouselCard
                key={`${entry.id}-${idx}`}
                entry={entry}
                onPress={() => router.push(`/history/${entry.id}`)}
              />
            ))}
          </Animated.View>

          {/* Edge fade masks */}
          <LinearGradient
            colors={[sparkTheme.colors.bgElevated, 'rgba(9,10,10,0.7)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            pointerEvents="none"
            style={styles.fadeLeft}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(9,10,10,0.7)', sparkTheme.colors.bgElevated]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            pointerEvents="none"
            style={styles.fadeRight}
          />
        </View>
      </View>
    </View>
  );
}

function CarouselCard({ entry, onPress }: { entry: GalleryEntry; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Image source={{ uri: entry.image_url }} style={styles.thumb} resizeMode="cover" />
      <View style={styles.cardBody}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {entry.card_meta?.title ?? 'Generated card'}
        </Text>
        <Text numberOfLines={2} style={styles.cardPrompt}>
          {entry.prompt ?? '—'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: sparkTheme.spacing[5],
    paddingVertical: sparkTheme.spacing[7],
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  panel: {
    borderRadius: sparkTheme.radius.lg,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    backgroundColor: sparkTheme.colors.bgElevated,
    padding: sparkTheme.spacing[6],
    gap: sparkTheme.spacing[5],
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    color: sparkTheme.colors.textPrimary,
    fontSize: sparkTheme.type.h3.fontSize,
    lineHeight: sparkTheme.type.h3.lineHeight,
    fontWeight: '700',
  },
  viewAll: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.small.fontSize,
    fontWeight: '600',
  },
  viewport: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: sparkTheme.radius.md,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CARD_GAP,
    paddingVertical: sparkTheme.spacing[3],
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: sparkTheme.radius.md,
    backgroundColor: sparkTheme.colors.bg,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: 170,
    backgroundColor: sparkTheme.colors.bg,
  },
  cardBody: {
    paddingHorizontal: sparkTheme.spacing[4],
    paddingVertical: sparkTheme.spacing[3],
    flex: 1,
    gap: sparkTheme.spacing[1],
  },
  cardTitle: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardPrompt: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.micro.fontSize,
    lineHeight: sparkTheme.type.micro.lineHeight,
  },
  fadeLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: FADE_WIDTH,
    zIndex: 10,
  },
  fadeRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: FADE_WIDTH,
    zIndex: 10,
  },
});
