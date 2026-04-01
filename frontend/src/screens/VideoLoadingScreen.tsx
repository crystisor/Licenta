import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AnimatedOrb, AnimatedProgressBar, AnimatedSteps } from '../components/LoadingAnimations';
import { ScreenShell } from '../components/ScreenShell';
import { useAppContext } from '../context/AppContext';
import { getAnimateStatus } from '../services/api';
import { theme } from '../theme';

const STEPS = [
  'Preparing the ritual circle...',
  'Channeling the image...',
  'Weaving motion into frames...',
  'Rendering the final vision...',
  'Sealing the summoning...',
];

function getActiveStep(progress: number): number {
  if (progress >= 90) return 4;
  if (progress >= 60) return 3;
  if (progress >= 40) return 2;
  if (progress >= 10) return 1;
  return 0;
}

const POLL_INTERVAL = 5_000; // reduced from 10s to 5s for more responsive updates

export function VideoLoadingScreen() {
  const router = useRouter();
  const { videoJobId, setVideoUrl, setVideoJobId, motionPrompt } = useAppContext();

  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
          return;
        } else if (status.status === 'error') {
          setError(status.detail ?? 'Video generation failed.');
          return;
        }
      } catch {
        if (cancelled) return;
        setError('Connection lost \u2014 video generation may have failed.');
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
      backgroundVideo={require('../../assets/backgrounds/Loading screen background.mp4')}
      footer={
        <Text style={styles.footer}>
          Motion: {motionPrompt.trim() || 'No motion prompt'}
        </Text>
      }
    >
      <View style={styles.center}>
        <AnimatedOrb glyph="I2V" />

        <View style={styles.progressCard}>
          <AnimatedProgressBar progress={progress} />
          <AnimatedSteps steps={STEPS} activeStep={activeStep} />
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
