import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../theme';

interface LoadingScreenProps {
  prompt: string;
  debugPanel?: ReactNode;
}

const STEPS = [
  'Gathering starlight and memory',
  'Translating the prompt',
  'Rendering the image',
];

export function LoadingScreen({ prompt, debugPanel }: LoadingScreenProps) {
  const [progress, setProgress] = useState(10);
  const orbScale = useRef(new Animated.Value(1)).current;

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
    return () => {
      animation.stop();
    };
  }, [orbScale]);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((current) => {
        if (current >= 92) {
          return current;
        }
        return current + 6;
      });
    }, 340);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const activeStep = useMemo(() => {
    if (progress >= 72) {
      return 2;
    }
    if (progress >= 38) {
      return 1;
    }
    return 0;
  }, [progress]);

  return (
    <ScreenShell
      eyebrow="Ritual in progress"
      title="Rendering your image"
      subtitle="The backend text-to-image pipeline is processing your prompt now."
      contentContainerStyle={styles.content}
      footer={<Text style={styles.footer}>Prompt: {prompt.trim() || 'Untitled image'}</Text>}
    >
      <View style={styles.center}>
        <Animated.View style={[styles.orbOuter, { transform: [{ scale: orbScale }] }]}>
          <View style={styles.orbInner}>
            <Text style={styles.orbGlyph}>AL</Text>
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
        {debugPanel}
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
});
