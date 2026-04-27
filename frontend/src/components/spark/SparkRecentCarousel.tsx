import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

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

const CARD_WIDTH = 160;
const CARD_HEIGHT = 220;
const CARD_GAP = sparkTheme.spacing[4];
const SCROLL_PX_PER_SEC = 60;
const RESUME_DELAY_MS = 3000;

export function SparkRecentCarousel() {
  const router = useRouter();
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const offsetRef = useRef(0);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const listenerIdRef = useRef<string | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggingRef = useRef(false);
  const animValue = useRef(new Animated.Value(0)).current;

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

  const stopAuto = () => {
    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }
    if (listenerIdRef.current !== null) {
      animValue.removeListener(listenerIdRef.current);
      listenerIdRef.current = null;
    }
  };

  const startAuto = () => {
    stopAuto();
    if (reduceMotion || entries.length === 0 || draggingRef.current) return;

    const cycleWidth = entries.length * (CARD_WIDTH + CARD_GAP);
    if (cycleWidth <= 0) return;

    const startFrom = offsetRef.current % cycleWidth;
    const target = startFrom + cycleWidth;
    const duration = (cycleWidth / SCROLL_PX_PER_SEC) * 1000;

    animValue.setValue(startFrom);
    listenerIdRef.current = animValue.addListener(({ value }) => {
      const x = value % cycleWidth;
      offsetRef.current = x;
      scrollRef.current?.scrollTo({ x, animated: false });
    });

    const anim = Animated.timing(animValue, {
      toValue: target,
      duration,
      easing: Easing.linear,
      useNativeDriver: false,
    });

    animRef.current = anim;
    anim.start(({ finished }) => {
      if (listenerIdRef.current !== null) {
        animValue.removeListener(listenerIdRef.current);
        listenerIdRef.current = null;
      }
      if (finished && !draggingRef.current && !reduceMotion) {
        offsetRef.current = 0;
        startAuto();
      }
    });
  };

  useEffect(() => {
    startAuto();
    return () => {
      stopAuto();
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length, reduceMotion]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (draggingRef.current) {
      offsetRef.current = e.nativeEvent.contentOffset.x;
    }
  };

  const handleDragStart = () => {
    draggingRef.current = true;
    stopAuto();
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  const handleDragEnd = () => {
    draggingRef.current = false;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      if (!draggingRef.current) startAuto();
    }, RESUME_DELAY_MS);
  };

  if (entries.length === 0) return null;

  const doubled = [...entries, ...entries];

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.heading}>Recent Generations</Text>
        <Pressable onPress={() => router.push('/gallery')} hitSlop={8}>
          <Text style={styles.viewAll}>View full gallery →</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        onScrollBeginDrag={handleDragStart}
        onScrollEndDrag={handleDragEnd}
        scrollEventThrottle={16}
      >
        {doubled.map((entry, idx) => (
          <CarouselCard
            key={`${entry.id}-${idx}`}
            entry={entry}
            onPress={() => router.push(`/history/${entry.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function CarouselCard({ entry, onPress }: { entry: GalleryEntry; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Image source={{ uri: entry.image_url }} style={styles.thumb} resizeMode="cover" />
      <View style={styles.cardBody}>
        <Text numberOfLines={2} style={styles.cardPrompt}>
          {entry.prompt ?? entry.card_meta?.title ?? 'Generated card'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: sparkTheme.spacing[7],
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: sparkTheme.spacing[5],
    marginBottom: sparkTheme.spacing[5],
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
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
  scrollContent: {
    paddingHorizontal: sparkTheme.spacing[5],
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: sparkTheme.radius.md,
    backgroundColor: sparkTheme.colors.bgElevated,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: 140,
    backgroundColor: sparkTheme.colors.bg,
  },
  cardBody: {
    padding: sparkTheme.spacing[4],
    flex: 1,
  },
  cardPrompt: {
    color: sparkTheme.colors.textSecondary,
    fontSize: sparkTheme.type.micro.fontSize,
    lineHeight: sparkTheme.type.micro.lineHeight,
  },
});
