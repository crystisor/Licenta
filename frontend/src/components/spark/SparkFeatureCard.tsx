import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { sparkTheme } from '../../theme';
import { useSparkLift } from './sparkPress';

interface SparkFeatureCardProps {
  icon: ReactNode;
  title: string;
  body: string;
  onPress?: () => void;
}

export function SparkFeatureCard({ icon, title, body, onPress }: SparkFeatureCardProps) {
  const { animatedStyle, onPressIn, onPressOut } = useSparkLift(4);

  const inner = (
    <>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </>
  );

  if (onPress) {
    return (
      <Animated.View style={[styles.cardOuter, animatedStyle]}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={({ pressed }) => [
            styles.card,
            pressed && { borderColor: sparkTheme.colors.brandBorder },
          ]}
        >
          {inner}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.cardOuter, animatedStyle]}>
      <View style={styles.card}>{inner}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    flex: 1,
    minWidth: 240,
  },
  card: {
    backgroundColor: sparkTheme.colors.bgElevated,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    borderRadius: sparkTheme.radius.lg,
    padding: sparkTheme.spacing[7],
    gap: sparkTheme.spacing[3],
    height: '100%',
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sparkTheme.spacing[2],
  },
  title: {
    color: sparkTheme.colors.textPrimary,
    fontSize: sparkTheme.type.h3.fontSize,
    lineHeight: sparkTheme.type.h3.lineHeight,
    fontWeight: '700',
  },
  body: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.small.fontSize,
    lineHeight: sparkTheme.type.small.lineHeight,
  },
});
