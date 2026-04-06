import { ReactNode } from 'react';
import {
  ImageBackground,
  ImageSourcePropType,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ResizeMode, Video } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme';

interface ScreenShellProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  backgroundImage?: ImageSourcePropType;
  backgroundVideo?: number | { uri: string };
  backgroundOverlay?: [string, string];
  subtitleStyle?: StyleProp<TextStyle>;
}

export function ScreenShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  contentContainerStyle,
  backgroundImage,
  backgroundVideo,
  backgroundOverlay,
  subtitleStyle,
}: ScreenShellProps) {
  const innerContent = (
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
          <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>
        </View>
        {children}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </SafeAreaView>
  );

  const content = (
    <>
      <View pointerEvents="none" style={styles.backgroundGlowOne} />
      <View pointerEvents="none" style={styles.backgroundGlowTwo} />
      {innerContent}
    </>
  );

  if (backgroundVideo) {
    return (
      <View style={styles.gradient}>
        <Video
          source={backgroundVideo}
          style={styles.backgroundVideo}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
          videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' } as any}
        />
        {innerContent}
      </View>
    );
  }

  if (backgroundImage) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={styles.gradient}
        resizeMode="cover"
        imageStyle={{ width: '100%', height: '100%' }}
      >
        <LinearGradient
          colors={backgroundOverlay ?? ['rgba(9,11,19,0.55)', 'rgba(21,27,47,0.8)']}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      </ImageBackground>
    );
  }

  return (
    <LinearGradient
      colors={[theme.colors.backgroundTop, theme.colors.backgroundBottom]}
      style={styles.gradient}
    >
      {content}
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
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
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
