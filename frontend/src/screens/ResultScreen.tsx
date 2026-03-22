import { ReactNode, useRef } from 'react';
import { Image, ImageErrorEventData, NativeSyntheticEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../theme';
import { GeneratedImage } from '../types';

interface ResultScreenProps {
  result: GeneratedImage;
  onReset: () => void;
  onImageLoad?: () => void;
  onImageError?: (message: string) => void;
  debugPanel?: ReactNode;
}

export function ResultScreen({
  result,
  onReset,
  onImageLoad,
  onImageError,
  debugPanel,
}: ResultScreenProps) {
  const imageSettledRef = useRef(false);

  const handleImageLoad = () => {
    if (imageSettledRef.current) {
      return;
    }
    imageSettledRef.current = true;
    onImageLoad?.();
  };

  const handleImageError = (event: NativeSyntheticEvent<ImageErrorEventData>) => {
    if (imageSettledRef.current) {
      return;
    }
    imageSettledRef.current = true;
    onImageError?.(event.nativeEvent.error || 'Image failed to load.');
  };

  return (
    <ScreenShell
      eyebrow="Image generated"
      title="Your prompt has been rendered"
      subtitle={result.prompt}
      footer={<Text style={styles.footer}>Rendered through the backend text-to-image pipeline.</Text>}
    >
      <View style={styles.layout}>
        <View style={styles.imageCard}>
          <Image
            onError={handleImageError}
            onLoad={handleImageLoad}
            resizeMode="cover"
            source={{ uri: result.imageUrl }}
            style={styles.image}
          />
          <View style={styles.imageOverlay} />
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.descriptionCard}>
            <Text style={styles.sectionLabel}>Original prompt</Text>
            <Text style={styles.description}>{result.prompt}</Text>
          </View>

          <Pressable onPress={onReset} style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}>
            <Text style={styles.buttonText}>Generate another image</Text>
          </Pressable>
        </View>
        {debugPanel}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  layout: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: 18,
  },
  imageCard: {
    minHeight: 420,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.panelBorder,
    backgroundColor: theme.colors.card,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 7, 14, 0.16)',
  },
  detailsCard: {
    gap: 18,
    padding: 22,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.panelBorder,
    backgroundColor: theme.colors.panel,
  },
  descriptionCard: {
    gap: 10,
    padding: 16,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(160, 166, 192, 0.12)',
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  description: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 24,
  },
  button: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(184, 160, 255, 0.35)',
    backgroundColor: 'rgba(184, 160, 255, 0.12)',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footer: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
