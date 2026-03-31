import { ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenShell } from '../components/ScreenShell';
import { GenerationStatus } from '../storage/generationCurrency';
import { theme } from '../theme';
import { PROMPT_TEMPLATES, pickRandom } from '../data/promptTemplates';

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
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  const handleShuffle = () => {
    const category = pickRandom(PROMPT_TEMPLATES);
    const idx = PROMPT_TEMPLATES.indexOf(category);
    setActiveCategory(idx);
    onPromptChange(pickRandom(category.prompts));
  };

  const handleChipPress = (index: number) => {
    setActiveCategory(index);
    onPromptChange(pickRandom(PROMPT_TEMPLATES[index].prompts));
  };

  return (
    <ScreenShell
      eyebrow="AI Cards"
      title="Generate fantasy character cards"
      subtitle="Describe your character — race, class, gear, and lore — and the AI will craft a unique fantasy card illustration for you."
      footer={<Text style={styles.footer}>Powered by Expo on the client and FastAPI on the backend.</Text>}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}
      >
        <View style={styles.card}>
          <View style={styles.chipRow}>
            <Pressable onPress={handleShuffle} style={styles.shuffleButton}>
              <Text style={styles.shuffleText}>Shuffle</Text>
            </Pressable>
            {PROMPT_TEMPLATES.map((tmpl, idx) => (
              <Pressable
                key={tmpl.label}
                onPress={() => handleChipPress(idx)}
                style={[
                  styles.pill,
                  activeCategory === idx && styles.pillActive,
                ]}
              >
                <Text style={[
                  styles.pillText,
                  activeCategory === idx && styles.pillTextActive,
                ]}>{tmpl.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Image prompt</Text>
          <TextInput
            multiline
            onChangeText={onPromptChange}
            placeholder="Describe a moonlit citadel, a biomechanical dragon, or any other image you want to generate."
            placeholderTextColor="rgba(160, 166, 192, 0.55)"
            style={styles.input}
            textAlignVertical="top"
            value={prompt}
          />

          <Text style={styles.helper}>
            Strong prompts usually include subject, lighting, mood, medium, and camera framing.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.currencyRow}>
            <Text style={styles.currencyText}>
              {generationStatus.freeRemaining}/3 free today
            </Text>
            {generationStatus.tokens > 0 && (
              <Text style={styles.currencyTokens}>
                + {generationStatus.tokens} token{generationStatus.tokens !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          <Pressable
            disabled={!prompt.trim() || !generationStatus.canGenerate}
            onPress={onCast}
            style={({ pressed }) => [
              styles.button,
              (!prompt.trim() || !generationStatus.canGenerate) && styles.buttonDisabled,
              pressed && prompt.trim() && generationStatus.canGenerate ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonText}>Generate image</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/gallery')}
            style={({ pressed }) => [
              styles.galleryButton,
              pressed && styles.galleryButtonPressed,
            ]}
          >
            <Text style={styles.galleryButtonText}>Gallery</Text>
          </Pressable>
        </View>
        {debugPanel}
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 620,
    padding: 22,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.panelBorder,
    backgroundColor: theme.colors.panel,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shuffleButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(74, 248, 227, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74, 248, 227, 0.35)',
  },
  shuffleText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(184, 160, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(184, 160, 255, 0.22)',
  },
  pillActive: {
    borderColor: theme.colors.primaryStrong,
    backgroundColor: 'rgba(184, 160, 255, 0.2)',
  },
  pillText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextActive: {
    color: theme.colors.text,
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 220,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(160, 166, 192, 0.18)',
    backgroundColor: 'rgba(9, 11, 19, 0.9)',
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  helper: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  errorBox: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 144, 0.35)',
    backgroundColor: 'rgba(255, 122, 144, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  currencyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  currencyTokens: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  button: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: '#090B13',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  galleryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(184, 160, 255, 0.3)',
    backgroundColor: 'rgba(184, 160, 255, 0.08)',
  },
  galleryButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: 'rgba(184, 160, 255, 0.15)',
  },
  galleryButtonText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footer: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
