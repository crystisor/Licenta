import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenShell } from '../components/ScreenShell';
import { theme } from '../theme';

interface SummonScreenProps {
  prompt: string;
  errorMessage: string | null;
  onPromptChange: (nextPrompt: string) => void;
  onCast: () => void;
  debugPanel?: ReactNode;
}

const STATUS_PILLS: string[] = [];

export function SummonScreen({
  prompt,
  errorMessage,
  onPromptChange,
  onCast,
  debugPanel,
}: SummonScreenProps) {
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
          <View style={styles.pillRow}>
            {STATUS_PILLS.map((pill) => (
              <View key={pill} style={styles.pill}>
                <Text style={styles.pillText}>{pill}</Text>
              </View>
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

          <Pressable
            disabled={!prompt.trim()}
            onPress={onCast}
            style={({ pressed }) => [
              styles.button,
              !prompt.trim() && styles.buttonDisabled,
              pressed && prompt.trim() ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonText}>Generate image</Text>
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(184, 160, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(184, 160, 255, 0.22)',
  },
  pillText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
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
  footer: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
