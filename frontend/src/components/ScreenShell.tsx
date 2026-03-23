import { ReactNode } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme';

interface ScreenShellProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function ScreenShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  contentContainerStyle,
}: ScreenShellProps) {
  return (
    <LinearGradient
      colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]}
      style={styles.gradient}
    >
      <View pointerEvents="none" style={styles.backgroundGlowOne} />
      <View pointerEvents="none" style={styles.backgroundGlowTwo} />
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView
          bounces={false}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          {children}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  header: {
    gap: 12,
    marginBottom: 24,
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  eyebrow: {
    alignSelf: 'flex-start',
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(74, 248, 227, 0.35)',
    backgroundColor: 'rgba(74, 248, 227, 0.08)',
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    marginTop: 20,
    alignSelf: 'center',
  },
  backgroundGlowOne: {
    position: 'absolute',
    top: -120,
    right: -40,
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: 'rgba(141, 118, 255, 0.18)',
  },
  backgroundGlowTwo: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: 'rgba(74, 248, 227, 0.11)',
  },
});
