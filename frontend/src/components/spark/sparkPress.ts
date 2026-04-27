import { useCallback } from 'react';
import { GestureResponderEvent } from 'react-native';
import { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

import { sparkTheme } from '../../theme';

const EASE = Easing.bezier(0.4, 0, 0.2, 1);

export function useSparkPress(pressedScale = 0.95) {
  const scale = useSharedValue(1);

  const onPressIn = useCallback((_e?: GestureResponderEvent) => {
    scale.value = withTiming(pressedScale, { duration: sparkTheme.motion.fast, easing: EASE });
  }, [scale, pressedScale]);

  const onPressOut = useCallback((_e?: GestureResponderEvent) => {
    scale.value = withTiming(1, { duration: sparkTheme.motion.fast, easing: EASE });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut };
}

export function useSparkLift(liftPx = 4) {
  const ty = useSharedValue(0);

  const onPressIn = useCallback(() => {
    ty.value = withTiming(-liftPx, { duration: sparkTheme.motion.fast, easing: EASE });
  }, [ty, liftPx]);

  const onPressOut = useCallback(() => {
    ty.value = withTiming(0, { duration: sparkTheme.motion.fast, easing: EASE });
  }, [ty]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut };
}
