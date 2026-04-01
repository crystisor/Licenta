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

import { theme } from '../theme';

// ---------------------------------------------------------------------------
// Animated Orb — breathing scale + ripple/sonar rings
// ---------------------------------------------------------------------------

interface AnimatedOrbProps {
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

export function AnimatedOrb({ glyph }: AnimatedOrbProps) {
  const scale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.35);

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
        withTiming(0.55, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [scale, ringOpacity]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const outerBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(184, 160, 255, ${ringOpacity.value})`,
  }));

  return (
    <View style={orbStyles.container}>
      {/* Ripple / sonar rings */}
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
    backgroundColor: 'rgba(141, 118, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(184, 160, 255, 0.35)',
  },
  inner: {
    width: 112,
    height: 112,
    borderRadius: 112,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74, 248, 227, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74, 248, 227, 0.3)',
  },
  glyph: {
    color: theme.colors.text,
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
    borderColor: 'rgba(74, 248, 227, 0.3)',
  },
});

// ---------------------------------------------------------------------------
// Animated Progress Bar — smooth fill + shimmer sweep
// ---------------------------------------------------------------------------

const SHIMMER_WIDTH = 80;

interface AnimatedProgressBarProps {
  progress: number;
}

export function AnimatedProgressBar({ progress }: AnimatedProgressBarProps) {
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

  // Animated percentage text
  const displayProgress = useDerivedValue(() =>
    Math.round(animatedProgress.value),
  );

  return (
    <View style={barStyles.wrapper}>
      <View style={barStyles.track}>
        <Animated.View style={[barStyles.fill, fillStyle]}>
          <Animated.View style={[barStyles.shimmerContainer, shimmerStyle]}>
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.35)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={barStyles.shimmerGradient}
            />
          </Animated.View>
        </Animated.View>
      </View>
      <PercentageDisplay progress={displayProgress} />
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

  return (
    <Text style={barStyles.label}>{display}% complete</Text>
  );
}

const barStyles = StyleSheet.create({
  wrapper: {
    gap: 8,
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
  label: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});

// ---------------------------------------------------------------------------
// Animated Steps — staggered fade-in, active pulse dot, SVG checkmark
// ---------------------------------------------------------------------------

interface AnimatedStepsProps {
  steps: string[];
  activeStep: number;
}

export function AnimatedSteps({ steps, activeStep }: AnimatedStepsProps) {
  const prevActiveRef = useRef(0);

  // Haptic on step completion
  useEffect(() => {
    if (activeStep > prevActiveRef.current) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
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
      {isComplete ? (
        <CheckmarkDot />
      ) : isActive ? (
        <PulseDot />
      ) : (
        <View style={stepStyles.dot} />
      )}
      <Text
        style={[
          stepStyles.text,
          (isComplete || isActive) && stepStyles.textActive,
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
        withTiming(1.35, { duration: 600, easing: Easing.inOut(Easing.ease) }),
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
          stroke={theme.colors.success}
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
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(160, 166, 192, 0.32)',
  },
  dotActive: {
    backgroundColor: theme.colors.accent,
  },
  checkContainer: {
    width: 16,
    height: 16,
    marginLeft: -3, // align with dots visually
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  textActive: {
    color: theme.colors.text,
    fontWeight: '700',
  },
});
