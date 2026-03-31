import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ImageErrorEventData,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme';
import { CardMeta, GeneratedImage } from '../types';
import { getRarity, RarityInfo } from '../utils/rarity';
import { MOTION_SUGGESTIONS } from '../data/promptTemplates';

const FALLBACK_META: CardMeta = {
  title: 'The Unnamed',
  lore: 'A vision conjured from the ancient prompt archives. The full story remains unwritten.',
  stats: {
    Strength: 5,
    Magic: 5,
    Defense: 5,
    Agility: 5,
  },
};

interface ResultScreenProps {
  result: GeneratedImage;
  onReset: () => void;
  onAnimate: (motionPrompt: string) => void;
  isAnimating?: boolean;
  videoUrl?: string | null;
  videoJobActive?: boolean;
  onImageLoad?: () => void;
  onImageError?: (message: string) => void;
  debugPanel?: ReactNode;
  fromHistory?: boolean;
}

export function ResultScreen({
  result,
  onReset,
  onAnimate,
  isAnimating = false,
  videoUrl = null,
  videoJobActive = false,
  onImageLoad,
  onImageError,
  debugPanel,
  fromHistory = false,
}: ResultScreenProps) {
  const imageSettledRef = useRef(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [motionPrompt, setMotionPrompt] = useState('');

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Card flip animation: 3 full rotations (0° → 1080°) then push-in scale
  const flipAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const cardFaceOpacity = useRef(new Animated.Value(0)).current;

  const flipInterpolate = flipAnim.interpolate({
    inputRange: [0, 1080],
    outputRange: ['0deg', '1080deg'],
  });

  // Card back color fades out as the flip progresses
  const cardBackOpacity = flipAnim.interpolate({
    inputRange: [0, 900, 1080],
    outputRange: [1, 1, 0],
  });

  useEffect(() => {
    if (fromHistory) {
      // Simple fade-in for history replay — no card flip
      flipAnim.setValue(1080);
      scaleAnim.setValue(1);
      cardFaceOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    // Fade + slide in the page, start flipping immediately
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      // 3 full flips
      Animated.timing(flipAnim, {
        toValue: 1080,
        duration: 2400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Scale up during the flip
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 2400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reveal the card face content
      Animated.timing(cardFaceOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Push into screen: scale 0.95 → 1.05 → 1.0
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.05,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 10,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  const handleImageLoad = () => {
    if (imageSettledRef.current) return;
    imageSettledRef.current = true;
    setImageLoaded(true);
    onImageLoad?.();
  };

  const handleImageError = (
    event: NativeSyntheticEvent<ImageErrorEventData>,
  ) => {
    if (imageSettledRef.current) return;
    imageSettledRef.current = true;
    onImageError?.(event.nativeEvent.error || 'Image failed to load.');
  };

  const meta = result.cardMeta ?? FALLBACK_META;
  const statEntries = Object.entries(meta.stats);
  const rarityInfo: RarityInfo = getRarity(meta.stats, meta.creativity);

  return (
    <LinearGradient
      colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]}
      style={styles.gradient}
    >
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* ── Portrait Card ── */}
            <Animated.View style={[styles.card, { borderColor: rarityInfo.color, transform: [{ perspective: 1000 }, { rotateY: flipInterpolate }, { scale: scaleAnim }] }]}>
              {/* Card back — solid surface visible during flips, fades out at the end */}
              <Animated.View style={[styles.cardBack, { opacity: cardBackOpacity }]} pointerEvents="none" />

              {/* Card face — hidden during flips, revealed after */}
              <Animated.View style={{ opacity: cardFaceOpacity }}>
                {/* Decorative inner border */}
                <View style={styles.innerBorder} pointerEvents="none" />

                {/* Portrait image */}
                <View style={styles.portraitContainer}>
                  <Image
                    source={{ uri: result.imageUrl }}
                    style={styles.portraitImage}
                    resizeMode="cover"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                  {/* Overlay tint */}
                  <View style={styles.portraitOverlay} />
                  {/* Loading indicator */}
                  {!imageLoaded && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                      />
                    </View>
                  )}
                </View>

                {/* Title banner */}
                <View style={styles.bannerWrapper}>
                  <View style={styles.banner}>
                    <Text style={styles.bannerText}>{meta.title}</Text>
                  </View>
                  <View style={[styles.rarityBadge, { backgroundColor: rarityInfo.color }]}>
                    <Text style={styles.rarityBadgeText}>{rarityInfo.rarity.toUpperCase()}</Text>
                  </View>
                </View>

                {/* Description */}
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionLabel}>Description:</Text>
                  <Text style={styles.descriptionText}>{result.prompt}</Text>
                </View>
              </Animated.View>
            </Animated.View>

            {/* ── Stats Grid ── */}
            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <View>
                  <Text style={styles.statsTitle}>Attributes</Text>
                  <Text style={styles.statsSubtitle}>Character stats</Text>
                </View>
              </View>
              <View style={styles.statsGrid}>
                {statEntries.map(([key, value], idx) => (
                  <View
                    key={key}
                    style={[
                      styles.statCell,
                      idx % 2 === 0
                        ? styles.statCellEven
                        : styles.statCellOdd,
                    ]}
                  >
                    <Text style={styles.statLabel}>{key}</Text>
                    <Text style={styles.statValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Lore Section ── */}
            <View style={styles.loreCard}>
              <Text style={styles.loreText}>
                {'\u201C'}
                {meta.lore}
                {'\u201D'}
              </Text>
            </View>

            {/* ── Animate Section (hidden in history replay) ── */}
            {!fromHistory && (
              <View style={styles.animateCard}>
                <Text style={styles.animateTitle}>Animate</Text>
                <Text style={styles.animateSubtitle}>
                  {videoJobActive ? 'Video already generating...' : 'Bring this image to life'}
                </Text>
                <TextInput
                  style={styles.motionInput}
                  placeholder="Describe the motion (e.g. camera slowly zooms in, wind blows hair...)"
                  placeholderTextColor={theme.colors.textMuted}
                  value={motionPrompt}
                  onChangeText={setMotionPrompt}
                  multiline
                  numberOfLines={3}
                  editable={!isAnimating && !videoJobActive}
                />
                <View style={styles.motionChipRow}>
                  {MOTION_SUGGESTIONS.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      onPress={() => setMotionPrompt(suggestion)}
                      disabled={isAnimating || videoJobActive}
                      style={[
                        styles.motionChip,
                        motionPrompt === suggestion && styles.motionChipActive,
                      ]}
                    >
                      <Text style={[
                        styles.motionChipText,
                        motionPrompt === suggestion && styles.motionChipTextActive,
                      ]}>{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  onPress={() => onAnimate(motionPrompt)}
                  disabled={isAnimating || videoJobActive || !motionPrompt.trim()}
                  style={({ pressed }) => [
                    styles.animateButton,
                    pressed && styles.animateButtonPressed,
                    (isAnimating || videoJobActive || !motionPrompt.trim()) && styles.animateButtonDisabled,
                  ]}
                >
                  {isAnimating ? (
                    <View style={styles.animateButtonContent}>
                      <ActivityIndicator size="small" color={theme.colors.text} />
                      <Text style={styles.animateButtonText}>Starting...</Text>
                    </View>
                  ) : (
                    <Text style={styles.animateButtonText}>Animate</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* ── Video Player ── */}
            {videoUrl && (
              <View style={styles.videoCard}>
                <Text style={styles.videoTitle}>Generated Video</Text>
                <View style={styles.videoContainer}>
                  <Video
                    source={{ uri: videoUrl }}
                    style={styles.videoPlayer}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                    shouldPlay
                  />
                </View>
              </View>
            )}

            {/* ── Action Button ── */}
            <Pressable
              onPress={onReset}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>
                {fromHistory ? 'Back to Gallery' : 'Generate Another'}
              </Text>
            </Pressable>

            {debugPanel}
          </Animated.View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
  },
  content: {
    maxWidth: 448,
    width: '100%',
    alignSelf: 'center',
    gap: 18,
  },

  // ── Card Back (visible during flip) ──
  cardBack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg - 1,
    zIndex: 10,
  },

  // ── Portrait Card ──
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.panelBorder,
    overflow: 'hidden',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 12,
  },
  innerBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(184, 160, 255, 0.1)',
    borderRadius: theme.radius.lg - 4,
    zIndex: 1,
  },
  portraitContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.panel,
    borderWidth: 2,
    borderColor: '#1c1b2e',
  },
  portraitImage: {
    ...StyleSheet.absoluteFillObject,
  },
  portraitOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 14, 0.12)',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Title Banner ──
  bannerWrapper: {
    alignItems: 'center',
    marginTop: -24,
    zIndex: 2,
  },
  banner: {
    backgroundColor: theme.colors.primaryStrong,
    paddingHorizontal: 28,
    paddingVertical: 6,
    borderRadius: 4,
    transform: [{ rotate: '-1deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  bannerText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  rarityBadge: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 4,
  },
  rarityBadgeText: {
    color: '#090B13',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // ── Description ──
  descriptionContainer: {
    marginTop: 16,
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(184, 160, 255, 0.15)',
  },
  descriptionLabel: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  descriptionText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // ── Stats Grid ──
  statsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.panelBorder,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  statsHeader: {
    marginBottom: 16,
  },
  statsTitle: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statsSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
    opacity: 0.6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCell: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(184, 160, 255, 0.15)',
  },
  statCellEven: {
    backgroundColor: theme.colors.card,
  },
  statCellOdd: {
    backgroundColor: theme.colors.panel,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Lore ──
  loreCard: {
    backgroundColor: theme.colors.card,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(184, 160, 255, 0.5)',
    padding: 20,
    borderRadius: theme.radius.sm,
  },
  loreText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
  },

  // ── Button ──
  button: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(184, 160, 255, 0.35)',
    backgroundColor: 'rgba(184, 160, 255, 0.12)',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: 'rgba(184, 160, 255, 0.2)',
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Animate Section ──
  animateCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.panelBorder,
    padding: 20,
    gap: 12,
  },
  animateTitle: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  animateSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.6,
    marginTop: -8,
  },
  motionInput: {
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(111, 119, 203, 0.2)',
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    padding: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  motionChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  motionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(184, 160, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(184, 160, 255, 0.2)',
  },
  motionChipActive: {
    borderColor: theme.colors.primaryStrong,
    backgroundColor: 'rgba(184, 160, 255, 0.18)',
  },
  motionChipText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  motionChipTextActive: {
    color: theme.colors.text,
  },
  animateButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryStrong,
  },
  animateButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  animateButtonDisabled: {
    opacity: 0.4,
  },
  animateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  animateButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Video Player ──
  videoCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.panelBorder,
    overflow: 'hidden',
  },
  videoTitle: {
    color: theme.colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.panel,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
});
