import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenShell } from '../components/ScreenShell';
import { useAppContext } from '../context/AppContext';
import { getAnimateStatus } from '../services/api';
import { theme } from '../theme';

const STEPS = [
  'Preparing motion',
  'Rendering frames',
  'Encoding video',
  'Finalizing',
];

function getActiveStep(progress: number): number {
  if (progress >= 95) return 3;
  if (progress >= 70) return 2;
  if (progress >= 20) return 1;
  return 0;
}

export function VideoLoadingScreen() {
  const router = useRouter();
  const { videoJobId, setVideoUrl, setVideoJobId, motionPrompt } = useAppContext();

  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const orbScale = useRef(new Animated.Value(1)).current;

  // Orb breathing animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.08,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 0.94,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [orbScale]);

  // Poll for job status
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
          return; // stop polling
        } else if (status.status === 'error') {
          setError(status.detail ?? 'Video generation failed.');
          return; // stop polling
        }
      } catch {
        if (cancelled) return;
        setError('Connection lost \u2014 video generation may have failed.');
        return; // stop polling
      }
    };

    // Initial poll immediately
    poll();
    const interval = setInterval(poll, 10_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [videoJobId, setVideoUrl, setVideoJobId, router]);

  const activeStep = useMemo(() => getActiveStep(progress), [progress]);

  if (error) {
    return (
      <ScreenShell
        eyebrow="Generation failed"
        title="Something went wrong"
        subtitle={error}
        contentContainerStyle={styles.content}
      >
        <View style={styles.center}>
          <Pressable
            onPress={() => router.replace('/display')}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Text style={styles.retryButtonText}>Back to card</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      eyebrow="Animation in progress"
      title="Rendering your video"
      subtitle="The backend image-to-video pipeline is animating your character now."
      contentContainerStyle={styles.content}
      footer={
        <Text style={styles.footer}>
          Motion: {motionPrompt.trim() || 'No motion prompt'}
        </Text>
      }
    >
      <View style={styles.center}>
        <Animated.View style={[styles.orbOuter, { transform: [{ scale: orbScale }] }]}>
          <View style={styles.orbInner}>
            <Text style={styles.orbGlyph}>I2V</Text>
          </View>
        </Animated.View>

        <View style={styles.progressCard}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progress}% complete</Text>

          <View style={styles.steps}>
            {STEPS.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepDot,
                    index <= activeStep ? styles.stepDotActive : null,
                  ]}
                />
                <Text
                  style={[
                    styles.stepText,
                    index <= activeStep ? styles.stepTextActive : null,
                  ]}
                >
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    paddingVertical: 16,
  },
  orbOuter: {
    width: 160,
    height: 160,
    borderRadius: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(141, 118, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(184, 160, 255, 0.35)',
  },
  orbInner: {
    width: 112,
    height: 112,
    borderRadius: 112,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74, 248, 227, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74, 248, 227, 0.3)',
  },
  orbGlyph: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  progressCard: {
    width: '100%',
    maxWidth: 620,
    padding: 22,
    gap: 16,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.panelBorder,
    backgroundColor: theme.colors.panel,
  },
  track: {
    height: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
  },
  progressLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  steps: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(160, 166, 192, 0.32)',
  },
  stepDotActive: {
    backgroundColor: theme.colors.success,
  },
  stepText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  stepTextActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  footer: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 54,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(184, 160, 255, 0.35)',
    backgroundColor: 'rgba(184, 160, 255, 0.12)',
  },
  retryButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: 'rgba(184, 160, 255, 0.2)',
  },
  retryButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
