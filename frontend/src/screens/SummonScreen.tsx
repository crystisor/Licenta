import { ReactNode, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sparkTheme } from '../theme';
import { GenerationStatus } from '../storage/generationCurrency';
import { SparkAmbient } from '../components/spark/SparkAmbient';
import { SparkHero } from '../components/spark/SparkHero';
import { SparkFeatureRow } from '../components/spark/SparkFeatureRow';
import { SparkPromptConsole } from '../components/spark/SparkPromptConsole';
import { SparkRecentCarousel } from '../components/spark/SparkRecentCarousel';
import { SparkFooter } from '../components/spark/SparkFooter';

interface SummonScreenProps {
  prompt: string;
  errorMessage: string | null;
  generationStatus: GenerationStatus;
  onPromptChange: (nextPrompt: string) => void;
  onCast: () => void;
  debugPanel?: ReactNode;
}

export function SummonScreen({
  prompt,
  errorMessage,
  generationStatus,
  onPromptChange,
  onCast,
  debugPanel,
}: SummonScreenProps) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView | null>(null);
  const consoleRef = useRef<View | null>(null);

  const scrollToConsole = () => {
    consoleRef.current?.measureLayout(
      // @ts-expect-error: ScrollView's inner node is accepted by measureLayout
      scrollRef.current,
      (_x, y) => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
      },
      () => {},
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[sparkTheme.colors.bgGradientTop, sparkTheme.colors.bgGradientBottom]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <SparkAmbient />

      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kbWrap}
        >
          <ScrollView
            ref={scrollRef}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <SparkHero
              onPrimaryPress={scrollToConsole}
              onGalleryPress={() => router.push('/gallery')}
              onBattlePress={() => router.push('/battle')}
            />

            <SparkFeatureRow />

            <SparkPromptConsole
              ref={consoleRef}
              prompt={prompt}
              errorMessage={errorMessage}
              generationStatus={generationStatus}
              onPromptChange={onPromptChange}
              onCast={onCast}
            />

            <SparkRecentCarousel />

            <SparkFooter />

            {debugPanel}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: sparkTheme.colors.bg,
  },
  safe: {
    flex: 1,
  },
  kbWrap: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: sparkTheme.spacing[8],
  },
});
