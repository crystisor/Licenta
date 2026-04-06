import { ReactNode, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedOrb, AnimatedProgressBar, AnimatedSteps } from '../components/LoadingAnimations';
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
  "Writing the character's lore",
];

export function LoadingScreen({ prompt, debugPanel }: LoadingScreenProps) {
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current;
        return current + 6;
      });
    }, 340);

    return () => clearInterval(timer);
  }, []);

  const activeStep = useMemo(() => {
    if (progress >= 85) return 3;
    if (progress >= 60) return 2;
    if (progress >= 30) return 1;
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
        <AnimatedOrb glyph="AL" />

        <View style={styles.progressCard}>
          <AnimatedProgressBar progress={progress} />
          <AnimatedSteps steps={STEPS} activeStep={activeStep} />
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
});
