import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { sparkTheme } from '../../theme';
import { useSparkPress } from './sparkPress';

interface SparkBackButtonProps {
  onPress: () => void;
  label?: string;
}

export function SparkBackButton({ onPress, label = '← Back' }: SparkBackButtonProps) {
  const { animatedStyle, onPressIn, onPressOut } = useSparkPress(0.95);
  const [hovered, setHovered] = useState(false);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[
          styles.btn,
          hovered && {
            borderColor: sparkTheme.colors.brandBorder,
            backgroundColor: sparkTheme.colors.brandSoft,
          },
        ]}
      >
        <Text style={[styles.label, hovered && { color: sparkTheme.colors.brand }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: sparkTheme.spacing[3],
    paddingHorizontal: sparkTheme.spacing[5],
    borderRadius: sparkTheme.radius.sm,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    backgroundColor: 'transparent',
  },
  label: {
    color: sparkTheme.colors.textSecondary,
    fontSize: sparkTheme.type.small.fontSize,
    fontWeight: '600',
  },
});
