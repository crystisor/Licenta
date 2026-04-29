import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
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
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
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

// ---------------------------------------------------------------------------
// SparkLoadingSigil — multi-layer animated sacred-geometry sigil
// ---------------------------------------------------------------------------

const SIGIL_SIZE = 180;
const SIGIL_C = SIGIL_SIZE / 2;
const SIGIL_BRAND = sparkTheme.colors.brand;

const STAR_PATH = (() => {
  const outer = 26;
  const inner = 11;
  const segs: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = SIGIL_C + Math.cos(a) * r;
    const y = SIGIL_C + Math.sin(a) * r;
    segs.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${segs.join(' ')} Z`;
})();

const HEXAGRAM_PATH = (() => {
  const r = 50;
  const tri = (rot: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 3; i++) {
      const a = (i * 2 * Math.PI) / 3 + rot - Math.PI / 2;
      pts.push(
        `${(SIGIL_C + Math.cos(a) * r).toFixed(2)} ${(SIGIL_C + Math.sin(a) * r).toFixed(2)}`,
      );
    }
    return `M${pts[0]} L${pts[1]} L${pts[2]} Z`;
  };
  return `${tri(0)} ${tri(Math.PI / 3)}`;
})();

const PARTICLES = [
  { angle: 0, radius: 70, duration: 8000, dir: 1, size: 3, op: 0.9 },
  { angle: 30, radius: 78, duration: 11000, dir: -1, size: 2, op: 0.7 },
  { angle: 70, radius: 68, duration: 9500, dir: 1, size: 3, op: 0.8 },
  { angle: 110, radius: 80, duration: 13000, dir: 1, size: 2, op: 0.6 },
  { angle: 145, radius: 72, duration: 10000, dir: -1, size: 4, op: 0.95 },
  { angle: 180, radius: 76, duration: 12000, dir: 1, size: 2, op: 0.7 },
  { angle: 210, radius: 70, duration: 8500, dir: -1, size: 3, op: 0.85 },
  { angle: 250, radius: 82, duration: 14000, dir: 1, size: 2, op: 0.55 },
  { angle: 285, radius: 74, duration: 9000, dir: -1, size: 3, op: 0.8 },
  { angle: 315, radius: 78, duration: 11500, dir: 1, size: 2, op: 0.7 },
  { angle: 340, radius: 68, duration: 7500, dir: -1, size: 3, op: 0.9 },
  { angle: 50, radius: 84, duration: 15000, dir: 1, size: 2, op: 0.5 },
] as const;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

function RotatingGroup({
  children,
  duration,
  direction,
  reduced,
}: {
  children: ReactNode;
  duration: number;
  direction: 1 | -1;
  reduced: boolean;
}) {
  const rot = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    rot.value = withRepeat(
      withTiming(direction * 360, { duration, easing: Easing.linear }),
      -1,
      false,
    );
  }, [duration, direction, reduced, rot]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, sigilStyles.layer, style]}
    >
      {children}
    </Animated.View>
  );
}

function SigilParticle({
  angle,
  radius,
  duration,
  direction,
  size,
  opacity,
  reduced,
}: {
  angle: number;
  radius: number;
  duration: number;
  direction: 1 | -1;
  size: number;
  opacity: number;
  reduced: boolean;
}) {
  const rot = useSharedValue(angle);
  useEffect(() => {
    if (reduced) return;
    rot.value = withRepeat(
      withTiming(angle + direction * 360, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [angle, duration, direction, reduced, rot]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}
    >
      <View
        style={{
          position: 'absolute',
          top: SIGIL_C - radius - size / 2,
          left: SIGIL_C - size / 2,
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: SIGIL_BRAND,
          opacity,
        }}
      />
    </Animated.View>
  );
}

export function SparkLoadingSigil() {
  const reduced = useReducedMotion();

  const coreScale = useSharedValue(1);
  const haloScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0.7);
  const glitch = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    coreScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.96, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    haloOpacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [reduced, coreScale, haloScale, haloOpacity]);

  useEffect(() => {
    if (reduced) return;
    const trigger = () => {
      glitch.value = withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(0, { duration: 100 }),
        withDelay(80, withTiming(0.7, { duration: 50 })),
        withTiming(0, { duration: 90 }),
      );
    };
    trigger();
    const id = setInterval(trigger, 4200);
    return () => clearInterval(id);
  }, [reduced, glitch]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: haloScale.value }],
    opacity: haloOpacity.value,
  }));
  const ghostAStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: coreScale.value },
      { translateX: 1.4 + glitch.value * 3 },
    ],
    opacity: 0.4 + glitch.value * 0.5,
  }));
  const ghostBStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: coreScale.value },
      { translateX: -(1.4 + glitch.value * 3) },
    ],
    opacity: 0.4 + glitch.value * 0.5,
  }));

  return (
    <View style={sigilStyles.container} pointerEvents="none">
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, sigilStyles.layer, haloStyle]}
      >
        <Svg width={SIGIL_SIZE} height={SIGIL_SIZE}>
          <Defs>
            <RadialGradient id="sigilHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={SIGIL_BRAND} stopOpacity="0.55" />
              <Stop offset="40%" stopColor={SIGIL_BRAND} stopOpacity="0.2" />
              <Stop offset="100%" stopColor={SIGIL_BRAND} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle
            cx={SIGIL_C}
            cy={SIGIL_C}
            r={SIGIL_C}
            fill="url(#sigilHalo)"
          />
        </Svg>
      </Animated.View>

      <RotatingGroup duration={18000} direction={-1} reduced={reduced}>
        <Svg width={SIGIL_SIZE} height={SIGIL_SIZE}>
          <Circle
            cx={SIGIL_C}
            cy={SIGIL_C}
            r={86}
            stroke={SIGIL_BRAND}
            strokeWidth={1}
            strokeDasharray="2 6"
            fill="none"
            opacity={0.55}
          />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * Math.PI) / 6 - Math.PI / 2;
            const r1 = 78;
            const r2 = 84;
            return (
              <Path
                key={i}
                d={`M${SIGIL_C + Math.cos(a) * r1} ${SIGIL_C + Math.sin(a) * r1} L${SIGIL_C + Math.cos(a) * r2} ${SIGIL_C + Math.sin(a) * r2}`}
                stroke={SIGIL_BRAND}
                strokeWidth={1}
                opacity={0.7}
              />
            );
          })}
        </Svg>
      </RotatingGroup>

      <RotatingGroup duration={11000} direction={1} reduced={reduced}>
        <Svg width={SIGIL_SIZE} height={SIGIL_SIZE}>
          <Path
            d={HEXAGRAM_PATH}
            stroke={SIGIL_BRAND}
            strokeWidth={1.2}
            fill="none"
            opacity={0.4}
            strokeLinejoin="round"
          />
        </Svg>
      </RotatingGroup>

      <RotatingGroup duration={6500} direction={-1} reduced={reduced}>
        <Svg width={SIGIL_SIZE} height={SIGIL_SIZE}>
          <Circle
            cx={SIGIL_C}
            cy={SIGIL_C}
            r={36}
            stroke={SIGIL_BRAND}
            strokeWidth={1}
            strokeDasharray="3 4"
            fill="none"
            opacity={0.7}
          />
        </Svg>
      </RotatingGroup>

      {!reduced &&
        PARTICLES.map((p, i) => (
          <SigilParticle
            key={i}
            angle={p.angle}
            radius={p.radius}
            duration={p.duration}
            direction={p.dir as 1 | -1}
            size={p.size}
            opacity={p.op}
            reduced={reduced}
          />
        ))}

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, sigilStyles.layer, ghostAStyle]}
      >
        <Svg width={SIGIL_SIZE} height={SIGIL_SIZE}>
          <Path d={STAR_PATH} fill={SIGIL_BRAND} />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, sigilStyles.layer, ghostBStyle]}
      >
        <Svg width={SIGIL_SIZE} height={SIGIL_SIZE}>
          <Path d={STAR_PATH} fill={SIGIL_BRAND} />
        </Svg>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, sigilStyles.layer, coreStyle]}
      >
        <Svg width={SIGIL_SIZE} height={SIGIL_SIZE}>
          <Path d={STAR_PATH} fill={SIGIL_BRAND} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const sigilStyles = StyleSheet.create({
  container: {
    width: SIGIL_SIZE,
    height: SIGIL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
