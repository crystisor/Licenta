import { StatusBar } from 'expo-status-bar';
import { Slot, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppProvider, useAppContext } from '../src/context/AppContext';
import { theme } from '../src/theme';

function VideoJobBanner() {
  const { videoJobActive } = useAppContext();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!videoJobActive || pathname === '/video-loading') return null;

  return (
    <Pressable
      onPress={() => router.push('/video-loading')}
      style={[styles.banner, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      <View style={styles.bannerDot} />
      <Text style={styles.bannerText}>Video generating... Tap to check progress</Text>
    </Pressable>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <View style={styles.root}>
          <Slot />
          <VideoJobBanner />
        </View>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(141, 118, 255, 0.95)',
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.accent,
  },
  bannerText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
