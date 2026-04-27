import { ReactNode, useEffect, useMemo, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SparkLoadingOrb,
  SparkLoadingProgressBar,
  SparkLoadingSteps,
} from '../components/spark/SparkLoadingAnimations';
import { SparkAmbient } from '../components/spark/SparkAmbient';
import { sparkTheme } from '../theme';

interface LoadingScreenProps {
  debugPanel?: ReactNode;
}

const STEPS = [
  'Gathering starlight and memory',
  'Translating the prompt',
  'Rendering the image',
  "Writing the character's lore",
];

export function LoadingScreen({ debugPanel }: LoadingScreenProps) {
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
              <Text style={styles.eyebrowText}>SDXL PIPELINE</Text>
            </View>
            <Text style={styles.title}>Rendering your image</Text>
            <Text style={styles.subtitle}>
              Juggernaut XL is sampling 35 steps with DPM++ 2M SDE Karras at 832×1216.
            </Text>
          </View>

          <SparkLoadingOrb glyph="AL" />

          <View style={styles.panel}>
            <SparkLoadingProgressBar progress={progress} />
            <View style={styles.divider} />
            <SparkLoadingSteps steps={STEPS} activeStep={activeStep} />
          </View>

          {debugPanel}
        </View>
      </SafeAreaView>
    </View>
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
    maxWidth: 560,
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
    maxWidth: 560,
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
});
