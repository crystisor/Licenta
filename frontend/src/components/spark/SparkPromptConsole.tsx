import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { sparkTheme } from '../../theme';
import { PROMPT_TEMPLATES, pickRandom } from '../../data/promptTemplates';
import { GenerationStatus } from '../../storage/generationCurrency';
import { useSparkPress } from './sparkPress';

interface SparkPromptConsoleProps {
  prompt: string;
  errorMessage: string | null;
  generationStatus: GenerationStatus;
  onPromptChange: (next: string) => void;
  onCast: () => void;
}

export const SparkPromptConsole = forwardRef<View, SparkPromptConsoleProps>(function SparkPromptConsole(
  { prompt, errorMessage, generationStatus, onPromptChange, onCast },
  ref,
) {
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);

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

  const generateDisabled = !prompt.trim() || !generationStatus.canGenerate;

  return (
    <View ref={ref} style={styles.outer}>
      <View style={styles.panel}>
        <View style={styles.chipRow}>
          <ShufflePill onPress={handleShuffle} />
          {PROMPT_TEMPLATES.map((tmpl, idx) => (
            <Pill
              key={tmpl.label}
              label={tmpl.label}
              active={activeCategory === idx}
              onPress={() => handleChipPress(idx)}
            />
          ))}
        </View>

        <Text style={styles.label}>IMAGE PROMPT</Text>
        <TextInput
          multiline
          onChangeText={onPromptChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Describe a moonlit citadel, a biomechanical dragon, or any other image you want to generate."
          placeholderTextColor={sparkTheme.colors.textDim}
          style={[
            styles.input,
            { borderColor: focused ? sparkTheme.colors.brandBorder : sparkTheme.colors.border },
          ]}
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
          <Text style={styles.currencyText}>{generationStatus.freeRemaining}/3 free today</Text>
          {generationStatus.tokens > 0 && (
            <Text style={styles.currencyTokens}>
              + {generationStatus.tokens} token{generationStatus.tokens !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <GenerateButton disabled={generateDisabled} onPress={onCast} />
      </View>
    </View>
  );
});

function ShufflePill({ onPress }: { onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = useSparkPress(0.95);
  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.shuffleBtn}>
        <Text style={styles.shuffleText}>↻ Shuffle</Text>
      </Pressable>
    </Animated.View>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = useSparkPress(0.96);
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.pill, active && styles.pillActive]}
      >
        <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function GenerateButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = useSparkPress(0.97);
  return (
    <Animated.View style={[disabled ? null : animatedStyle, styles.generateAnim]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={disabled ? undefined : onPressIn}
        onPressOut={disabled ? undefined : onPressOut}
        style={({ pressed }) => [
          styles.generateBtn,
          disabled && styles.generateBtnDisabled,
          pressed && !disabled && { backgroundColor: sparkTheme.colors.brandHover },
        ]}
      >
        <Text style={styles.generateText}>Generate Image</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: sparkTheme.spacing[5],
    paddingBottom: sparkTheme.spacing[8],
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  panel: {
    borderRadius: sparkTheme.radius.lg,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
    backgroundColor: sparkTheme.colors.bgElevated,
    padding: sparkTheme.spacing[7],
    gap: sparkTheme.spacing[5],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sparkTheme.spacing[3],
  },
  shuffleBtn: {
    paddingHorizontal: sparkTheme.spacing[4],
    paddingVertical: sparkTheme.spacing[3],
    borderRadius: sparkTheme.radius.pill,
    backgroundColor: sparkTheme.colors.brandSoft,
    borderWidth: 1,
    borderColor: sparkTheme.colors.brandBorder,
  },
  shuffleText: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pill: {
    paddingHorizontal: sparkTheme.spacing[4],
    paddingVertical: sparkTheme.spacing[3],
    borderRadius: sparkTheme.radius.pill,
    backgroundColor: sparkTheme.colors.bg,
    borderWidth: 1,
    borderColor: sparkTheme.colors.border,
  },
  pillActive: {
    backgroundColor: sparkTheme.colors.brandSoft,
    borderColor: sparkTheme.colors.brandBorder,
  },
  pillText: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '600',
  },
  pillTextActive: {
    color: sparkTheme.colors.brand,
  },
  label: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.micro.fontSize,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  input: {
    minHeight: 200,
    borderRadius: sparkTheme.radius.md,
    borderWidth: 1,
    backgroundColor: sparkTheme.colors.bg,
    color: sparkTheme.colors.textPrimary,
    fontSize: sparkTheme.type.body.fontSize,
    lineHeight: sparkTheme.type.body.lineHeight,
    paddingHorizontal: sparkTheme.spacing[5],
    paddingVertical: sparkTheme.spacing[5],
  },
  helper: {
    color: sparkTheme.colors.textDim,
    fontSize: sparkTheme.type.small.fontSize,
    lineHeight: sparkTheme.type.small.lineHeight,
  },
  errorBox: {
    borderRadius: sparkTheme.radius.md,
    borderWidth: 1,
    borderColor: sparkTheme.colors.brandBorder,
    backgroundColor: sparkTheme.colors.brandSoft,
    paddingHorizontal: sparkTheme.spacing[5],
    paddingVertical: sparkTheme.spacing[4],
  },
  errorText: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.small.fontSize,
    lineHeight: sparkTheme.type.small.lineHeight,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sparkTheme.spacing[3],
  },
  currencyText: {
    color: sparkTheme.colors.textMuted,
    fontSize: sparkTheme.type.small.fontSize,
    fontWeight: '600',
  },
  currencyTokens: {
    color: sparkTheme.colors.brand,
    fontSize: sparkTheme.type.small.fontSize,
    fontWeight: '700',
  },
  generateAnim: {
    width: '100%',
  },
  generateBtn: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: sparkTheme.radius.md,
    backgroundColor: sparkTheme.colors.brand,
    ...sparkTheme.shadow.brand,
  },
  generateBtnDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  generateText: {
    color: sparkTheme.colors.textPrimary,
    fontSize: sparkTheme.type.body.fontSize,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
