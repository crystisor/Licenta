import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';

import { sparkTheme } from '../../theme';

const AnimatedG = Animated.createAnimatedComponent(G);

export function SparkAmbient() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((flag) => {
      if (mounted) setReduceMotion(flag);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <RedGlow />
      {!reduceMotion && <HazeDrift />}
      {!reduceMotion && <StarDrift />}
    </View>
  );
}

function RedGlow() {
  return (
    <View style={styles.glowWrap}>
      <LinearGradient
        colors={[
          'rgba(220, 38, 38, 0.18)',
          'rgba(220, 38, 38, 0.06)',
          'rgba(0, 0, 0, 0)',
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.glow}
      />
    </View>
  );
}

function HazeDrift() {
  const { width, height } = useWindowDimensions();
  // -6%..5% → in pixels
  const startX = -0.06 * width;
  const endX = 0.05 * width;
  const startY = -0.04 * height;
  const endY = 0.03 * height;

  const tx = useSharedValue(startX);
  const ty = useSharedValue(startY);
  const sc = useSharedValue(1.02);

  useEffect(() => {
    const ease = Easing.inOut(Easing.ease);
    tx.value = withRepeat(withTiming(endX, { duration: sparkTheme.motion.haze, easing: ease }), -1, true);
    ty.value = withRepeat(withTiming(endY, { duration: sparkTheme.motion.haze, easing: ease }), -1, true);
    sc.value = withRepeat(withTiming(1.05, { duration: sparkTheme.motion.haze, easing: ease }), -1, true);
    return () => {
      cancelAnimation(tx);
      cancelAnimation(ty);
      cancelAnimation(sc);
    };
  }, [tx, ty, sc, endX, endY]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: sc.value },
    ],
  }));

  return (
    <Animated.View style={[styles.haze, style]}>
      <LinearGradient
        colors={['rgba(220, 38, 38, 0.12)', 'rgba(220, 38, 38, 0)']}
        start={{ x: 0.3, y: 0.3 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const STAR_COUNT = 60;

function StarDrift() {
  const { width, height } = useWindowDimensions();

  const stars = useMemo(() => {
    return Array.from({ length: STAR_COUNT }, (_, i) => ({
      cx: Math.random() * width,
      cy: Math.random() * height,
      r: Math.random() * 1.4 + 0.4,
      opacity: Math.random() * 0.5 + 0.15,
      key: i,
    }));
  }, [width, height]);

  // Two layers, opposite directions, parallax
  const drift1 = useSharedValue(0);
  const drift2 = useSharedValue(0);

  useEffect(() => {
    drift1.value = withRepeat(
      withTiming(1, { duration: sparkTheme.motion.stars, easing: Easing.linear }),
      -1,
      false,
    );
    drift2.value = withRepeat(
      withTiming(1, { duration: sparkTheme.motion.stars * 1.4, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(drift1);
      cancelAnimation(drift2);
    };
  }, [drift1, drift2]);

  const layer1Props = useAnimatedProps(() => ({
    transform: `translate(${drift1.value * width * 0.2}, ${-drift1.value * height * 0.1})`,
  }));

  const layer2Props = useAnimatedProps(() => ({
    transform: `translate(${-drift2.value * width * 0.15}, ${drift2.value * height * 0.08})`,
  }));

  const half = Math.floor(STAR_COUNT / 2);

  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
      <AnimatedG animatedProps={layer1Props}>
        {stars.slice(0, half).map((s) => (
          <Circle key={s.key} cx={s.cx} cy={s.cy} r={s.r} fill="#ffffff" opacity={s.opacity} />
        ))}
      </AnimatedG>
      <AnimatedG animatedProps={layer2Props}>
        {stars.slice(half).map((s) => (
          <Circle key={s.key} cx={s.cx} cy={s.cy} r={s.r} fill="#ffffff" opacity={s.opacity * 0.8} />
        ))}
      </AnimatedG>
    </Svg>
  );
}

const styles = StyleSheet.create({
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -100,
    left: '15%',
    right: '15%',
    height: 600,
  },
  haze: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '120%',
    height: '120%',
  },
});
