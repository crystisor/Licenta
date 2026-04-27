import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { sparkTheme } from '../../theme';
import { SparkFeatureCard } from './SparkFeatureCard';

const FEATURES = [
  {
    glyph: '🎨',
    title: 'SDXL Image',
    body: 'Juggernaut XL Ragnarok, 35-step DPM++ 2M SDE Karras, 832×1216 portrait.',
  },
  {
    glyph: '🎬',
    title: 'Wan 2.2 Video',
    body: 'Dual high/low-noise 14B I2V models, LightX2V 4-step LoRAs, 81 frames @ 640.',
  },
  {
    glyph: '⚔️',
    title: 'Card Battle',
    body: 'Earn tokens by winning duels. Spend tokens for extra generations.',
  },
];

export function SparkFeatureRow() {
  const { width } = useWindowDimensions();
  const isStacked = width < 720;

  return (
    <View style={[styles.row, isStacked && styles.rowStacked]}>
      {FEATURES.map((f) => (
        <SparkFeatureCard
          key={f.title}
          icon={<Text style={styles.glyph}>{f.glyph}</Text>}
          title={f.title}
          body={f.body}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: sparkTheme.spacing[5],
    paddingHorizontal: sparkTheme.spacing[5],
    paddingVertical: sparkTheme.spacing[6],
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  rowStacked: {
    flexDirection: 'column',
  },
  glyph: {
    fontSize: 28,
    lineHeight: 32,
  },
});
