import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { sparkTheme } from '../../theme';

// ---------------------------------------------------------------------------
// SparkLoadingOrb — breathing red orb + sonar ripple rings
// ---------------------------------------------------------------------------

interface SparkLoadingOrbProps {
  glyph: string;
}

function RippleRing({ delay }: { delay: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(2, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, [delay, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[orbStyles.rippleRing, style]} />;
}

export function SparkLoadingOrb({ glyph }: SparkLoadingOrbProps) {
  const scale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.94, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [scale, ringOpacity]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const outerBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(220, 38, 38, ${ringOpacity.value})`,
  }));

  return (
    <View style={orbStyles.container}>
      <RippleRing delay={0} />
      <RippleRing delay={700} />
      <RippleRing delay={1400} />

      <Animated.View style={[orbStyles.outer, orbStyle, outerBorderStyle]}>
        <View style={orbStyles.inner}>
          <Text style={orbStyles.glyph}>{glyph}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const orbStyles = StyleSheet.create({
  container: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outer: {
    width: 160,
    height: 160,
    borderRadius: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sparkTheme.colors.brandSoft,
    borderWidth: 1,
    borderColor: sparkTheme.colors.brandBorder,
  },
  inner: {
    width: 112,
    height: 112,
    borderRadius: 112,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sparkTheme.colors.bgElevated,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
  },
  glyph: {
    color: sparkTheme.colors.brand,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  rippleRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 160,
    borderWidth: 1.5,
    borderColor: sparkTheme.colors.brandBorder,
  },
});

// ---------------------------------------------------------------------------
// SparkLoadingProgressBar — red fill + shimmer sweep
// ---------------------------------------------------------------------------

const SHIMMER_WIDTH = 80;

interface SparkLoadingProgressBarProps {
  progress: number;
}

export function SparkLoadingProgressBar({ progress }: SparkLoadingProgressBarProps) {
  const animatedProgress = useSharedValue(0);
  const shimmerX = useSharedValue(-SHIMMER_WIDTH);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });
  }, [progress, animatedProgress]);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(300, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [shimmerX]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%` as any,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const displayProgress = useDerivedValue(() => Math.round(animatedProgress.value));

  return (
    <View style={barStyles.wrapper}>
      <View style={barStyles.headerRow}>
        <Text style={barStyles.eyebrow}>PROGRESS</Text>
        <PercentageDisplay progress={displayProgress} />
      </View>
      <View style={barStyles.track}>
        <Animated.View style={[barStyles.fill, fillStyle]}>
          <Animated.View style={[barStyles.shimmerContainer, shimmerStyle]}>
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.45)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={barStyles.shimmerGradient}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

function PercentageDisplay({
  progress,
}: {
  progress: Animated.SharedValue<number>;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(Math.round(progress.value));
    }, 50);
    return () => clearInterval(interval);
  }, [progress]);

  return <Text style={barStyles.percentage}>{display}%</Text>;
}

const barStyles = StyleSheet.create({
  wrapper: {
    gap: sparkTheme.spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  percentage: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  track: {
    height: 8,
    borderRadius: sparkTheme.radius.pill,
    backgroundColor: sparkTheme.colors.bg,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: sparkTheme.radius.pill,
    backgroundColor: sparkTheme.colors.brand,
    overflow: 'hidden',
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SHIMMER_WIDTH,
  },
  shimmerGradient: {
    flex: 1,
  },
});

// ---------------------------------------------------------------------------
// SparkLoadingSteps — staggered fade-in, active pulse, completed checkmark
// ---------------------------------------------------------------------------

interface SparkLoadingStepsProps {
  steps: string[];
  activeStep: number;
}

export function SparkLoadingSteps({ steps, activeStep }: SparkLoadingStepsProps) {
  const prevActiveRef = useRef(0);

  useEffect(() => {
    if (activeStep > prevActiveRef.current && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    prevActiveRef.current = activeStep;
  }, [activeStep]);

  return (
    <View style={stepStyles.container}>
      {steps.map((step, index) => (
        <StepRow
          key={step}
          label={step}
          index={index}
          isComplete={index < activeStep}
          isActive={index === activeStep}
          isPending={index > activeStep}
        />
      ))}
    </View>
  );
}

function StepRow({
  label,
  index,
  isComplete,
  isActive,
}: {
  label: string;
  index: number;
  isComplete: boolean;
  isActive: boolean;
  isPending: boolean;
}) {
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 200).duration(400)}
      style={stepStyles.row}
    >
      {isComplete ? <CheckmarkDot /> : isActive ? <PulseDot /> : <View style={stepStyles.dot} />}
      <Text
        style={[
          stepStyles.text,
          isActive && stepStyles.textActive,
          isComplete && stepStyles.textComplete,
        ]}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

function PulseDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[stepStyles.dot, stepStyles.dotActive, style]} />;
}

function CheckmarkDot() {
  return (
    <View style={stepStyles.checkContainer}>
      <Svg width={16} height={16} viewBox="0 0 16 16">
        <Path
          d="M3 8 L6.5 11.5 L13 4.5"
          stroke={sparkTheme.colors.brand}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: {
    gap: sparkTheme.spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sparkTheme.spacing[4],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: sparkTheme.colors.border,
  },
  dotActive: {
    backgroundColor: sparkTheme.colors.brand,
  },
  checkContainer: {
    width: 16,
    height: 16,
    marginLeft: -3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.small.fontSize,
    lineHeight: sparkTheme.type.small.lineHeight,
  },
  textActive: {
    color: sparkTheme.colors.textPrimary,
    fontWeight: '700',
  },
  textComplete: {
    color: sparkTheme.colors.textSecondary,
  },
});
