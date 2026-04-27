import { useEffect, useMemo, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SparkLoadingOrb,
  SparkLoadingProgressBar,
  SparkLoadingSteps,
} from '../components/spark/SparkLoadingAnimations';
import { SparkAmbient } from '../components/spark/SparkAmbient';
import { useAppContext } from '../context/AppContext';
import { getAnimateStatus } from '../services/api';
import { sparkTheme } from '../theme';
import { useSparkPress } from '../components/spark/sparkPress';
import Animated from 'react-native-reanimated';

const STEPS = [
  'Encoding the start image',
  'Loading high-noise UNet + LoRA',
  'Loading low-noise UNet + LoRA',
  'Sampling 81 frames @ 640²',
  'Encoding video to mp4',
];

function getActiveStep(progress: number): number {
  if (progress >= 90) return 4;
  if (progress >= 60) return 3;
  if (progress >= 40) return 2;
  if (progress >= 10) return 1;
  return 0;
}

const POLL_INTERVAL = 5_000;

export function VideoLoadingScreen() {
  const router = useRouter();
  const { videoJobId, setVideoUrl, setVideoJobId, motionPrompt } = useAppContext();

  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoJobId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const status = await getAnimateStatus(videoJobId);
        if (cancelled) return;

        if (status.status === 'processing') {
          setProgress(status.progress ?? 0);
        } else if (status.status === 'complete') {
          setProgress(100);
          setVideoUrl(status.video_url ?? null);
          setVideoJobId(null);
          router.replace('/display');
          return;
        } else if (status.status === 'error') {
          setError(status.detail ?? 'Video generation failed.');
          return;
        }
      } catch {
        if (cancelled) return;
        setError('Connection lost — video generation may have failed.');
        return;
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [videoJobId, setVideoUrl, setVideoJobId, router]);

  const activeStep = useMemo(() => getActiveStep(progress), [progress]);

  // Error state
  if (error) {
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

        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
          <View style={styles.center}>
            <View style={styles.errorPill}>
              <Text style={styles.errorPillText}>GENERATION FAILED</Text>
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <RetryButton onPress={() => router.replace('/display')} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

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

      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.headerBlock}>
            <View style={styles.eyebrowPill}>
              <Text style={styles.eyebrowText}>WAN 2.2 I2V PIPELINE</Text>
            </View>
            <Text style={styles.title}>Rendering your video</Text>
            <Text style={styles.subtitle}>
              Dual-pass denoising with high/low-noise 14B FP8 models and LightX2V 4-step LoRAs at 81 frames, 640×640.
            </Text>
          </View>

          <SparkLoadingOrb glyph="I2V" />

          <View style={styles.panel}>
            <SparkLoadingProgressBar progress={progress} />
            <View style={styles.divider} />
            <SparkLoadingSteps steps={STEPS} activeStep={activeStep} />
          </View>

          <View style={styles.motionRow}>
            <Text style={styles.motionLabel}>MOTION</Text>
            <Text style={styles.motionText} numberOfLines={2}>
              {motionPrompt.trim() || 'No motion prompt'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function RetryButton({ onPress }: { onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = useSparkPress(0.96);
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.retryButton,
          pressed && { backgroundColor: sparkTheme.colors.brandHover },
        ]}
      >
        <Text style={styles.retryButtonText}>Back to Card</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: sparkTheme.colors.bg,
  },
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: sparkTheme.spacing[5],
    paddingVertical: sparkTheme.spacing[6],
    gap: sparkTheme.spacing[7],
  },
  headerBlock: {
    alignItems: 'center',
    gap: sparkTheme.spacing[3],
    maxWidth: 580,
  },
  eyebrowPill: {
    paddingHorizontal: sparkTheme.spacing[4],
    paddingVertical: sparkTheme.spacing[2],
    borderRadius: sparkTheme.radius.pill,
    backgroundColor: sparkTheme.colors.brandSoft,
    borderWidth: 1,
    borderColor: sparkTheme.colors.brandBorder,
  },
  eyebrowText: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.small.fontSize,
    lineHeight: sparkTheme.type.small.lineHeight,
    textAlign: 'center',
  },
  panel: {
    width: '100%',
    maxWidth: 580,
    padding: sparkTheme.spacing[7],
    gap: sparkTheme.spacing[5],
    borderRadius: sparkTheme.radius.lg,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    backgroundColor: sparkTheme.colors.bgElevated,
  },
  divider: {
    height: 1,
    backgroundColor: sparkTheme.colors.border,
    marginVertical: sparkTheme.spacing[1],
  },
  motionRow: {
    width: '100%',
    maxWidth: 580,
    paddingHorizontal: sparkTheme.spacing[5],
    paddingVertical: sparkTheme.spacing[4],
    borderRadius: sparkTheme.radius.md,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    backgroundColor: sparkTheme.colors.bg,
    gap: sparkTheme.spacing[1],
  },
  motionLabel: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  motionText: {
    color: sparkTheme.colors.textSecondary,
    fontSize: sparkTheme.type.small.fontSize,
    lineHeight: sparkTheme.type.small.lineHeight,
    fontStyle: 'italic',
  },

  // Error state
  errorPill: {
    paddingHorizontal: sparkTheme.spacing[4],
    paddingVertical: sparkTheme.spacing[2],
    borderRadius: sparkTheme.radius.pill,
    backgroundColor: sparkTheme.colors.brandSoft,
    borderWidth: 1,
    borderColor: sparkTheme.colors.brand,
  },
  errorPillText: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  errorMessage: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.body.fontSize,
    lineHeight: sparkTheme.type.body.lineHeight,
    textAlign: 'center',
    maxWidth: 480,
  },
  retryButton: {
    minHeight: 52,
    paddingHorizontal: sparkTheme.spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: sparkTheme.radius.md,
    backgroundColor: sparkTheme.colors.brand,
    ...sparkTheme.shadow.brand,
  },
  retryButtonText: {
    color: sparkTheme.colors.textPrimary,
    fontSize: sparkTheme.type.body.fontSize,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
