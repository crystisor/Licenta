import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { sparkTheme } from '../../theme';
import { useSparkPress } from './sparkPress';

interface SparkHeroProps {
  onPrimaryPress: () => void;
  onGalleryPress: () => void;
  onBattlePress: () => void;
}

export function SparkHero({ onPrimaryPress, onGalleryPress, onBattlePress }: SparkHeroProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.eyebrowPill}>
        <Text style={styles.eyebrowText}>AI CARDS</Text>
      </View>

      <Text style={styles.title}>Forge fantasy character cards</Text>

      <Text style={styles.subtitle}>
        Describe a character — race, class, gear, lore — and watch SDXL + Wan 2.2 turn it into a card and a short cinematic.
      </Text>

      <View style={styles.ctaRow}>
        <SparkPrimaryButton label="Generate Image" onPress={onPrimaryPress} />
        <SparkOutlineButton label="Open Gallery" onPress={onGalleryPress} variant="brand" />
        <SparkOutlineButton label="Battle" onPress={onBattlePress} variant="neutral" />
      </View>
    </View>
  );
}

function SparkPrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = useSparkPress(0.95);
  return (
    <Animated.View style={[styles.btnAnimWrap, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && { backgroundColor: sparkTheme.colors.brandHover },
        ]}
      >
        <Text style={styles.primaryBtnText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function SparkOutlineButton({
  label,
  onPress,
  variant,
}: {
  label: string;
  onPress: () => void;
  variant: 'brand' | 'neutral';
}) {
  const { animatedStyle, onPressIn, onPressOut } = useSparkPress(0.95);
  const isBrand = variant === 'brand';
  return (
    <Animated.View style={[styles.btnAnimWrap, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.outlineBtn,
          {
            borderColor: isBrand ? sparkTheme.colors.brand : sparkTheme.colors.border,
            backgroundColor: pressed
              ? isBrand
                ? sparkTheme.colors.brandSoft
                : 'rgba(255,255,255,0.04)'
              : 'transparent',
          },
        ]}
      >
        <Text
          style={[
            styles.outlineBtnText,
            { color: isBrand ? sparkTheme.colors.brand : sparkTheme.colors.textPrimary },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: sparkTheme.spacing[5],
    paddingHorizontal: sparkTheme.spacing[5],
    paddingTop: sparkTheme.spacing[8],
    paddingBottom: sparkTheme.spacing[8],
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
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
    lineHeight: sparkTheme.type.micro.lineHeight,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: sparkTheme.colors.textPrimary,
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: sparkTheme.colors.textSecondary,
    fontSize: sparkTheme.type.body.fontSize,
    lineHeight: sparkTheme.type.body.lineHeight,
    textAlign: 'center',
    maxWidth: 560,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: sparkTheme.spacing[3],
    marginTop: sparkTheme.spacing[3],
  },
  btnAnimWrap: {
    // wrapper for the animated transform
  },
  primaryBtn: {
    paddingHorizontal: sparkTheme.spacing[7],
    paddingVertical: sparkTheme.spacing[4],
    borderRadius: sparkTheme.radius.md,
    backgroundColor: sparkTheme.colors.brand,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    ...sparkTheme.shadow.brand,
  },
  primaryBtnText: {
    color: sparkTheme.colors.textPrimary,
    fontSize: sparkTheme.type.body.fontSize,
    fontWeight: '700',
  },
  outlineBtn: {
    paddingHorizontal: sparkTheme.spacing[6],
    paddingVertical: sparkTheme.spacing[4],
    borderRadius: sparkTheme.radius.md,
    borderWidth: 1,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontSize: sparkTheme.type.body.fontSize,
    fontWeight: '600',
  },
});
