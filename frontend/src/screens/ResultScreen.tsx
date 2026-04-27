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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sparkTheme } from '../theme';
import { CardMeta, GeneratedImage } from '../types';
import { getRarity, RarityInfo } from '../utils/rarity';
import { MOTION_SUGGESTIONS } from '../data/promptTemplates';
import { SparkAmbient } from '../components/spark/SparkAmbient';
import { SparkBackButton } from '../components/spark/SparkBackButton';

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
  const [motionFocused, setMotionFocused] = useState(false);

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

  const cardBackOpacity = flipAnim.interpolate({
    inputRange: [0, 900, 1080],
    outputRange: [1, 1, 0],
  });

  useEffect(() => {
    if (fromHistory) {
      flipAnim.setValue(1080);
      scaleAnim.setValue(1);
      cardFaceOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(flipAnim, {
        toValue: 1080,
        duration: 2400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 2400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(cardFaceOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.05, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 10, tension: 100, useNativeDriver: true }),
      ]).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImageLoad = () => {
    if (imageSettledRef.current) return;
    imageSettledRef.current = true;
    setImageLoaded(true);
    onImageLoad?.();
  };

  const handleImageError = (event: NativeSyntheticEvent<ImageErrorEventData>) => {
    if (imageSettledRef.current) return;
    imageSettledRef.current = true;
    onImageError?.(event.nativeEvent.error || 'Image failed to load.');
  };

  const meta = result.cardMeta ?? FALLBACK_META;
  const statEntries = Object.entries(meta.stats);
  const rarityInfo: RarityInfo = getRarity(meta.stats, meta.creativity);

  const animateDisabled = isAnimating || videoJobActive || !motionPrompt.trim();

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
        <View style={styles.headerRow}>
          <SparkBackButton onPress={onReset} label={fromHistory ? '← Gallery' : '← Home'} />
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* ── Portrait Card ── */}
            <Animated.View
              style={[
                styles.card,
                {
                  borderColor: rarityInfo.color,
                  transform: [
                    { perspective: 1000 },
                    { rotateY: flipInterpolate },
                    { scale: scaleAnim },
                  ],
                },
              ]}
            >
              <Animated.View style={[styles.cardBack, { opacity: cardBackOpacity }]} pointerEvents="none" />

              <Animated.View style={{ opacity: cardFaceOpacity }}>
                <View style={styles.innerBorder} pointerEvents="none" />

                <View style={styles.portraitContainer}>
                  <Image
                    source={{ uri: result.imageUrl }}
                    style={styles.portraitImage}
                    resizeMode="cover"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                  <View style={styles.portraitOverlay} />
                  {!imageLoaded && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={sparkTheme.colors.brand} />
                    </View>
                  )}
                </View>

                <View style={styles.bannerWrapper}>
                  <View style={styles.banner}>
                    <Text style={styles.bannerText}>{meta.title}</Text>
                  </View>
                  <View style={[styles.rarityBadge, { backgroundColor: rarityInfo.color }]}>
                    <Text style={styles.rarityBadgeText}>{rarityInfo.rarity.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionLabel}>DESCRIPTION</Text>
                  <Text style={styles.descriptionText}>{result.prompt}</Text>
                </View>
              </Animated.View>
            </Animated.View>

            {/* ── Stats Grid ── */}
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelEyebrow}>STATS</Text>
                <Text style={styles.panelTitle}>Attributes</Text>
              </View>
              <View style={styles.statsGrid}>
                {statEntries.map(([key, value]) => (
                  <View key={key} style={styles.statCell}>
                    <Text style={styles.statLabel}>{key}</Text>
                    <Text style={styles.statValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Lore Section ── */}
            <View style={styles.lorePanel}>
              <Text style={styles.loreText}>
                {'“'}
                {meta.lore}
                {'”'}
              </Text>
            </View>

            {/* ── Animate Section ── */}
            {!fromHistory && (
              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelEyebrow}>I2V PIPELINE</Text>
                  <Text style={styles.panelTitle}>Animate</Text>
                  <Text style={styles.panelSubtitle}>
                    {videoJobActive
                      ? 'Video already generating…'
                      : 'Bring this card to life with Wan 2.2'}
                  </Text>
                </View>

                <TextInput
                  style={[
                    styles.motionInput,
                    {
                      borderColor: motionFocused
                        ? sparkTheme.colors.brandBorder
                        : sparkTheme.colors.border,
                    },
                  ]}
                  placeholder="Describe the motion (e.g. camera slowly zooms in, wind blows hair...)"
                  placeholderTextColor={sparkTheme.colors.textDim}
                  value={motionPrompt}
                  onChangeText={setMotionPrompt}
                  onFocus={() => setMotionFocused(true)}
                  onBlur={() => setMotionFocused(false)}
                  multiline
                  numberOfLines={3}
                  editable={!isAnimating && !videoJobActive}
                />

                <View style={styles.motionChipRow}>
                  {MOTION_SUGGESTIONS.map((suggestion) => {
                    const active = motionPrompt === suggestion;
                    return (
                      <Pressable
                        key={suggestion}
                        onPress={() => setMotionPrompt(suggestion)}
                        disabled={isAnimating || videoJobActive}
                        style={[styles.motionChip, active && styles.motionChipActive]}
                      >
                        <Text style={[styles.motionChipText, active && styles.motionChipTextActive]}>
                          {suggestion}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  onPress={() => onAnimate(motionPrompt)}
                  disabled={animateDisabled}
                  style={({ pressed }) => [
                    styles.animateButton,
                    animateDisabled && styles.animateButtonDisabled,
                    pressed && !animateDisabled && { backgroundColor: sparkTheme.colors.brandHover },
                  ]}
                >
                  {isAnimating ? (
                    <View style={styles.animateButtonContent}>
                      <ActivityIndicator size="small" color={sparkTheme.colors.textPrimary} />
                      <Text style={styles.animateButtonText}>Starting…</Text>
                    </View>
                  ) : (
                    <Text style={styles.animateButtonText}>Animate</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* ── Video Player ── */}
            {videoUrl && (
              <View style={styles.videoPanel}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelEyebrow}>OUTPUT</Text>
                  <Text style={styles.panelTitle}>Generated Video</Text>
                </View>
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
                styles.primaryButton,
                pressed && { backgroundColor: sparkTheme.colors.brandHover },
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {fromHistory ? 'Back to Gallery' : 'Generate Another'}
              </Text>
            </Pressable>

            {debugPanel}
          </Animated.View>
        </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sparkTheme.spacing[5],
    paddingTop: sparkTheme.spacing[5],
    paddingBottom: sparkTheme.spacing[3],
  },
  headerSpacer: {
    width: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: sparkTheme.spacing[5],
    paddingTop: sparkTheme.spacing[3],
    paddingBottom: sparkTheme.spacing[8],
  },
  content: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    gap: sparkTheme.spacing[5],
  },

  // ── Portrait Card ──
  cardBack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: sparkTheme.colors.bgElevated,
    borderRadius: sparkTheme.radius.lg - 1,
    zIndex: 10,
  },
  card: {
    backgroundColor: sparkTheme.colors.bgElevated,
    borderRadius: sparkTheme.radius.lg,
    borderWidth: 2,
    overflow: 'hidden',
    padding: sparkTheme.spacing[4],
    ...sparkTheme.shadow.brand,
  },
  innerBorder: {
    position: 'absolute',
    top: sparkTheme.spacing[3],
    left: sparkTheme.spacing[3],
    right: sparkTheme.spacing[3],
    bottom: sparkTheme.spacing[3],
    borderWidth: 1,
    borderColor: sparkTheme.colors.brandSoftHover,
    borderRadius: sparkTheme.radius.lg - 4,
    zIndex: 1,
  },
  portraitContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: sparkTheme.radius.sm,
    overflow: 'hidden',
    backgroundColor: sparkTheme.colors.bg,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
  },
  portraitImage: {
    ...StyleSheet.absoluteFillObject,
  },
  portraitOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Title Banner ──
  bannerWrapper: {
    alignItems: 'center',
    marginTop: -22,
    zIndex: 2,
  },
  banner: {
    backgroundColor: sparkTheme.colors.brand,
    paddingHorizontal: sparkTheme.spacing[7],
    paddingVertical: sparkTheme.spacing[2],
    borderRadius: 4,
    transform: [{ rotate: '-1deg' }],
    ...sparkTheme.shadow.brand,
  },
  bannerText: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  rarityBadge: {
    marginTop: sparkTheme.spacing[2],
    paddingHorizontal: sparkTheme.spacing[5],
    paddingVertical: 3,
    borderRadius: 4,
  },
  rarityBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // ── Description ──
  descriptionContainer: {
    marginTop: sparkTheme.spacing[5],
    backgroundColor: sparkTheme.colors.bg,
    borderRadius: sparkTheme.radius.sm,
    paddingHorizontal: sparkTheme.spacing[5],
    paddingVertical: sparkTheme.spacing[4],
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
  },
  descriptionLabel: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: sparkTheme.spacing[1],
  },
  descriptionText: {
    color: sparkTheme.colors.textSecondary,
    fontSize: sparkTheme.type.body.fontSize,
    lineHeight: sparkTheme.type.body.lineHeight,
    fontStyle: 'italic',
  },

  // ── Generic panel ──
  panel: {
    backgroundColor: sparkTheme.colors.bgElevated,
    borderRadius: sparkTheme.radius.lg,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    padding: sparkTheme.spacing[7],
    gap: sparkTheme.spacing[5],
  },
  panelHeader: {
    gap: sparkTheme.spacing[1],
  },
  panelEyebrow: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  panelTitle: {
    color: sparkTheme.colors.textPrimary,
    fontSize: sparkTheme.type.h3.fontSize,
    lineHeight: sparkTheme.type.h3.lineHeight,
    fontWeight: '700',
  },
  panelSubtitle: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.small.fontSize,
    lineHeight: sparkTheme.type.small.lineHeight,
  },

  // ── Stats Grid ──
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sparkTheme.spacing[3],
  },
  statCell: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: sparkTheme.spacing[4],
    paddingHorizontal: sparkTheme.spacing[3],
    backgroundColor: sparkTheme.colors.bg,
    borderRadius: sparkTheme.radius.sm,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
  },
  statLabel: {
    color: sparkTheme.colors.textDim,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: sparkTheme.spacing[1],
  },
  statValue: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },

  // ── Lore ──
  lorePanel: {
    backgroundColor: sparkTheme.colors.bgElevated,
    borderLeftWidth: 3,
    borderLeftColor: sparkTheme.colors.brand,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: sparkTheme.colors.border,
    borderRightColor: sparkTheme.colors.border,
    borderBottomColor: sparkTheme.colors.border,
    padding: sparkTheme.spacing[6],
    borderRadius: sparkTheme.radius.md,
  },
  loreText: {
    color: sparkTheme.colors.textSecondary,
    fontSize: sparkTheme.type.body.fontSize,
    lineHeight: sparkTheme.type.body.lineHeight,
    fontStyle: 'italic',
  },

  // ── Animate ──
  motionInput: {
    backgroundColor: sparkTheme.colors.bg,
    borderRadius: sparkTheme.radius.sm,
    borderWidth: 1,
    color: sparkTheme.colors.textPrimary,
    fontSize: sparkTheme.type.small.fontSize,
    lineHeight: sparkTheme.type.small.lineHeight,
    padding: sparkTheme.spacing[4],
    minHeight: 80,
    textAlignVertical: 'top',
  },
  motionChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sparkTheme.spacing[2],
  },
  motionChip: {
    paddingHorizontal: sparkTheme.spacing[4],
    paddingVertical: sparkTheme.spacing[2],
    borderRadius: sparkTheme.radius.pill,
    backgroundColor: sparkTheme.colors.bg,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
  },
  motionChipActive: {
    borderColor: sparkTheme.colors.brandBorder,
    backgroundColor: sparkTheme.colors.brandSoft,
  },
  motionChipText: {
    color: sparkTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  motionChipTextActive: {
    color: sparkTheme.colors.brand,
  },
  animateButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: sparkTheme.radius.md,
    backgroundColor: sparkTheme.colors.brand,
    ...sparkTheme.shadow.brand,
  },
  animateButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  animateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sparkTheme.spacing[3],
  },
  animateButtonText: {
    color: sparkTheme.colors.textPrimary,
    fontSize: sparkTheme.type.body.fontSize,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Video ──
  videoPanel: {
    backgroundColor: sparkTheme.colors.bgElevated,
    borderRadius: sparkTheme.radius.lg,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    overflow: 'hidden',
    paddingTop: sparkTheme.spacing[7],
    paddingHorizontal: sparkTheme.spacing[7],
    paddingBottom: 0,
    gap: sparkTheme.spacing[5],
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: sparkTheme.colors.bg,
    marginHorizontal: -sparkTheme.spacing[7],
    marginBottom: 0,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },

  // ── Primary action button (bottom) ──
  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: sparkTheme.radius.md,
    backgroundColor: sparkTheme.colors.brand,
    ...sparkTheme.shadow.brand,
  },
  primaryButtonText: {
    color: sparkTheme.colors.textPrimary,
    fontSize: sparkTheme.type.body.fontSize,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
